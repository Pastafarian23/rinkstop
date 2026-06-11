/**
 * KHL / WHL / MHL data source.
 *
 * Uses the public mobile API at khl.api.webcaster.pro. No auth, no
 * rate limit issues observed. Reverse-engineered by shayypy:
 * https://github.com/shayypy/khl-api
 *
 * The same backend serves KHL (top-tier), WHL (women's), and MHL
 * (minor/junior). We pull events and find the one matching the
 * highlight's teams/date.
 */

const KHL_API = 'https://khl.api.webcaster.pro/api';
const LEAGUE_ENDPOINTS = {
  khl: { base: `${KHL_API}/khl_mobile`, leagueLabel: 'KHL' },
  whl: { base: `${KHL_API}/whl_mobile`, leagueLabel: 'WHL' }, // KHL's Women's Hockey League (ZhHL)
  mhl: { base: `${KHL_API}/mhl_mobile`, leagueLabel: 'MHL' },
  vhl: null, // VHL doesn't have a public mobile API; falls through to Highlightly
};

const LEAGUE_NAME_PATTERNS = [
  { league: 'khl', patterns: ['khl', 'kontinental'] },
  { league: 'vhl', patterns: ['vhl', 'высшая хоккейная лига', 'vysshaya'] },
  { league: 'mhl', patterns: ['mhl', 'молодёжная'] },
  { league: 'whl', patterns: ['whl', 'women hockey'] },
];

function matchLeague(leagueRaw) {
  const name = (typeof leagueRaw === 'object' && leagueRaw) ? leagueRaw.name : (leagueRaw || '');
  const lower = (name || '').toLowerCase();
  for (const { league, patterns } of LEAGUE_NAME_PATTERNS) {
    if (patterns.some(p => lower.includes(p))) return league;
  }
  return null;
}

// Cache: { [leagueKey]: { events, fetchedAt } }
const eventsCache = {};
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function fetchEvents(leagueKey) {
  const cached = eventsCache[leagueKey];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.events;

  const cfg = LEAGUE_ENDPOINTS[leagueKey];
  if (!cfg) return [];

  // The events endpoint defaults to the current/recent stage. We loop
  // through pages until empty, then merge. KHL has many games per day,
  // so 5 pages of 16 = 80 games is usually enough.
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const url = `${cfg.base}/events_v2.json?application=khl_web&locale=en&page=${page}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) break;
    const j = await res.json();
    if (!Array.isArray(j) || j.length === 0) break;
    for (const e of j) {
      if (e?.event) all.push(e.event);
    }
    if (j.length < 16) break;
  }
  eventsCache[leagueKey] = { events: all, fetchedAt: Date.now() };
  return all;
}

/**
 * Find a KHL/WHL/MHL game for the given (home_team, away_team, date).
 * Returns normalized match data, or null if not found.
 */
export async function khlMatchData({ teams, date, league }) {
  const leagueKey = matchLeague(league);
  if (!leagueKey) return null;
  if (!LEAGUE_ENDPOINTS[leagueKey]) return null; // VHL not supported
  if (!teams || teams.length < 2 || !date) return null;

  let events;
  try {
    events = await fetchEvents(leagueKey);
  } catch (e) {
    console.error(`   ⚠️  KHL ${leagueKey}: ${e.message}`);
    return null;
  }

  const teamKeys = teams.map(t => {
    const noThe = t.replace(/^the\s+/i, '').toLowerCase().trim();
    return { full: noThe, last: noThe.split(/\s+/).pop() };
  });

  // Date window
  const d0 = new Date(date + 'T00:00:00Z');
  const dayBefore = new Date(d0); dayBefore.setUTCDate(d0.getUTCDate() - 1);
  const dayAfter = new Date(d0); dayAfter.setUTCDate(d0.getUTCDate() + 1);
  const dateKeys = [
    dayBefore.toISOString().slice(0, 10),
    date,
    dayAfter.toISOString().slice(0, 10),
  ];

  for (const e of events) {
    if (e.game_state_key !== 'finished') continue;
    const ts = e.start_at_day ? new Date(e.start_at_day * 1000) : null;
    if (!ts) continue;
    const eventDate = ts.toISOString().slice(0, 10);
    if (!dateKeys.includes(eventDate)) continue;
    const homeName = (e.team_a?.name || e.team_a?.location || '').toLowerCase();
    const awayName = (e.team_b?.name || e.team_b?.location || '').toLowerCase();
    const homeHas = teamKeys.some(k => homeName.includes(k.last) || homeName.includes(k.full));
    const awayHas = teamKeys.some(k => awayName.includes(k.last) || awayName.includes(k.full));
    if (homeHas && awayHas) {
      // score format: "2:3" (away:home in KHL API since team_a is listed first)
      // But it can be either. We need to determine the actual home/away.
      // team_a is the home team in KHL's data.
      const [awayScore, homeScore] = (e.score || '0:0').split(':').map(n => parseInt(n, 10));
      const otGoals = e.scores?.overtime;
      const soGoals = e.scores?.bullitt;
      const wasOT = !!(otGoals && otGoals !== '0:0' && otGoals !== '0-0' && otGoals !== null);
      const wasSO = !!(soGoals && soGoals !== '0:0' && soGoals !== '0-0' && soGoals !== null);
      return {
        source: 'khl-api',
        league: leagueKey,
        home: e.team_a?.name,
        away: e.team_b?.name,
        home_team: e.team_a?.name,
        away_team: e.team_b?.name,
        score: `${homeScore}-${awayScore}`,
        wasOT,
        wasSO,
        overTime: wasOT ? (otGoals || '').replace(':', '-') : '0-0',
        periodType: wasSO ? 'SO' : wasOT ? 'OT' : 'REG',
        description: e.stage_name || 'Final',
        firstPeriod: e.scores?.first_period?.replace(':', '-'),
        secondPeriod: e.scores?.second_period?.replace(':', '-'),
        thirdPeriod: e.scores?.third_period?.replace(':', '-'),
        overTimeGoals: otGoals,
        gameId: e.id,
        startTimeUTC: ts.toISOString(),
      };
    }
  }
  return null;
}
