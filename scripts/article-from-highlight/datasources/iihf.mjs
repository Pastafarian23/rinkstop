/**
 * IIHF data source.
 *
 * Uses fixturedownload.com which maintains JSON feeds for the IIHF
 * World Championship (and other tournaments). Free, public, no auth.
 *
 * Endpoint pattern:
 *   https://fixturedownload.com/feed/json/iihf-ice-hockey-world-championship-{year}
 *
 * Each game entry contains:
 *   MatchNumber, RoundNumber, DateUtc, Location, HomeTeam, AwayTeam,
 *   Group, HomeTeamScore, AwayTeamScore, Winner
 *
 * OT/SO are not broken out — we infer from the round: playoff rounds
 * (QF, SF, Final) are commonly OT/SO but we mark wasOT=false and
 * rely on the LLM not to make OT claims unless the title explicitly
 * says "overtime".
 */

const BASE_URL = 'https://fixturedownload.com/feed/json';

const LEAGUE_NAME_PATTERNS = [
  { league: 'iihf', patterns: ['iihf', 'world championship', 'world ch', 'iihf wm'] },
  { league: 'iihf-women', patterns: ['iihf wm w', 'world championship women', 'iihf women'] },
  { league: 'iihf-u18', patterns: ['iihf u18', 'u18 world', 'world u18'] },
  { league: 'iihf-u20', patterns: ['iihf u20', 'world juniors', 'wjc', 'wjr'] },
];

// Cache: { [year]: { games, fetchedAt } }
const yearCache = {};
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function matchLeague(leagueRaw) {
  const name = (typeof leagueRaw === 'object' && leagueRaw) ? leagueRaw.name : (leagueRaw || '');
  const lower = (name || '').toLowerCase();
  for (const { league, patterns } of LEAGUE_NAME_PATTERNS) {
    if (patterns.some(p => lower.includes(p))) return league;
  }
  return null;
}

async function fetchIIHFSchedule(year) {
  const cached = yearCache[year];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.games;
  const url = `${BASE_URL}/iihf-ice-hockey-world-championship-${year}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    yearCache[year] = { games: [], fetchedAt: Date.now() };
    return [];
  }
  const games = await res.json();
  yearCache[year] = { games, fetchedAt: Date.now() };
  return games;
}

function normalizeTeamKeys(teams) {
  return teams.map(t => {
    const noThe = t.replace(/^the\s+/i, '').toLowerCase().trim();
    return { full: noThe, last: noThe.split(/\s+/).pop() };
  });
}

// IIHF country code aliases (the API uses full country names; highlight
// titles often use 3-letter ISO codes or short forms)
const COUNTRY_ALIASES = {
  'us': ['united states', 'united states of america', 'usa', 'u.s.'],
  'usa': ['united states', 'united states of america', 'us', 'u.s.'],
  'united states': ['usa', 'us', 'u.s.'],
  'u.s.': ['united states', 'usa', 'us'],
  'cz': ['czechia', 'czech republic', 'czech'],
  'czechia': ['czech republic', 'czech', 'cz'],
  'czech republic': ['czechia', 'czech', 'cz'],
  'sk': ['slovakia'],
  'slovakia': ['sk'],
  'ch': ['switzerland'],
  'switzerland': ['ch'],
  'de': ['germany'],
  'germany': ['de'],
  'fi': ['finland'],
  'finland': ['fi'],
  'se': ['sweden'],
  'sweden': ['se'],
  'no': ['norway'],
  'norway': ['no'],
  'dk': ['denmark'],
  'denmark': ['dk'],
  'ca': ['canada'],
  'canada': ['ca'],
  'hu': ['hungary'],
  'hungary': ['hu'],
  'it': ['italy'],
  'italy': ['it'],
  'si': ['slovenia'],
  'slovenia': ['si'],
  'at': ['austria'],
  'austria': ['at'],
  'lv': ['latvia'],
  'latvia': ['lv'],
  'gb': ['great britain', 'united kingdom', 'uk', 'britain', 'england'],
  'uk': ['great britain', 'united kingdom', 'gb', 'britain'],
  'great britain': ['uk', 'united kingdom', 'gb'],
  'england': ['great britain', 'united kingdom', 'uk'],
};

function teamMatches(name, teamKeys) {
  const lower = (name || '').toLowerCase();
  for (const k of teamKeys) {
    if (lower.includes(k.last) || lower.includes(k.full)) return true;
    // Check aliases (e.g., 'usa' → 'united states')
    const aliases = COUNTRY_ALIASES[k.full] || COUNTRY_ALIASES[k.last];
    if (aliases && aliases.some(a => lower.includes(a))) return true;
    // Reverse: if input is "USA" and API has "United States", "united states" is in aliases['usa']
    const reverseAliases = [];
    for (const [key, alts] of Object.entries(COUNTRY_ALIASES)) {
      if (alts.includes(k.full) || alts.includes(k.last)) reverseAliases.push(key);
    }
    if (reverseAliases.some(a => lower.includes(a))) return true;
  }
  return false;
}

/**
 * Find an IIHF game for the given (home_team, away_team, date).
 * Returns normalized match data, or null if not found.
 */
export async function iihfMatchData({ teams, date, league }) {
  const leagueKey = matchLeague(league);
  if (!leagueKey) return null;
  if (!teams || teams.length < 2 || !date) return null;

  // Try current year and previous (the highlight may be from the most recent IIHF event)
  const year = parseInt(date.slice(0, 4), 10);
  const yearsToTry = [year - 1, year, year + 1].filter(y => y >= 2015 && y <= 2030);

  const teamKeys = normalizeTeamKeys(teams);
  // Date window
  const d0 = new Date(date + 'T00:00:00Z');
  const dayBefore = new Date(d0); dayBefore.setUTCDate(d0.getUTCDate() - 1);
  const dayAfter = new Date(d0); dayAfter.setUTCDate(d0.getUTCDate() + 1);
  const dateKeys = [
    dayBefore.toISOString().slice(0, 10),
    date,
    dayAfter.toISOString().slice(0, 10),
  ];

  for (const y of yearsToTry) {
    let games = [];
    try {
      games = await fetchIIHFSchedule(y);
    } catch (e) {
      console.error(`   ⚠️  IIHF ${y}: ${e.message}`);
      continue;
    }
    for (const g of games) {
      if (g.HomeTeamScore === null || g.AwayTeamScore === null) continue;
      const gameDate = (g.DateUtc || '').slice(0, 10);
      if (!dateKeys.includes(gameDate)) continue;
      if (!teamMatches(g.HomeTeam, teamKeys)) continue;
      if (!teamMatches(g.AwayTeam, teamKeys)) continue;
      const homeScore = parseInt(g.HomeTeamScore, 10);
      const awayScore = parseInt(g.AwayTeamScore, 10);
      return {
        source: 'iihf-fixturedownload',
        league: leagueKey,
        home: g.HomeTeam,
        away: g.AwayTeam,
        home_team: g.HomeTeam,
        away_team: g.AwayTeam,
        score: `${homeScore}-${awayScore}`,
        // OT/SO not broken out by fixturedownload — leave wasOT=false
        // (per fact-check rules: never claim OT unless the source confirms)
        wasOT: false,
        wasSO: false,
        overTime: '0-0',
        periodType: 'REG',
        description: g.Group || g.RoundNumber || 'Final',
        venue: g.Location,
        gameId: g.MatchNumber,
        startTimeUTC: g.DateUtc,
      };
    }
  }
  return null;
}
