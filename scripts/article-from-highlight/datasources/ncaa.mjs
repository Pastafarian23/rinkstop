/**
 * NCAA ice hockey data source.
 *
 * Uses the free public wrapper at ncaa-api.henrygd.me which proxies
 * ncaa.com. No auth, free, no rate limit issue (5 req/s is fine for
 * our backfill use case).
 *
 * Reference: https://ncaa-api.henrygd.me/openapi
 *   - GET /scoreboard/icehockey-men/d1
 *   - GET /scoreboard/icehockey-men/d1/{YYYY/MM/DD}
 *   - GET /scoreboard/icehockey-women/d1
 *
 * We pull a small date window and find the game matching the team's
 * nicknames.
 */

const NCAA_BASE = 'https://ncaa-api.henrygd.me';

const LEAGUE_NAME_PATTERNS = [
  { league: 'ncaam', patterns: ['ncaa', 'ncaah', 'college hockey', 'ncaa men', 'ncaa hockey'] },
  { league: 'ncaaw', patterns: ['ncaa women'] },
];

function matchLeague(leagueRaw) {
  const name = (typeof leagueRaw === 'object' && leagueRaw) ? leagueRaw.name : (leagueRaw || '');
  const lower = (name || '').toLowerCase();
  if (lower.includes('women') || lower.includes('w-')) return 'ncaaw';
  return 'ncaam';
}

function normalizeTeamKeys(teams) {
  return teams.map(t => {
    const noThe = t.replace(/^the\s+/i, '').toLowerCase().trim();
    return { full: noThe, last: noThe.split(/\s+/).pop() };
  });
}

function teamMatches(awayHome, teamKeys) {
  const a = (awayHome || '').toLowerCase();
  return teamKeys.some(k => a.includes(k.last) || a.includes(k.full));
}

async function fetchDateGames(date, sport) {
  // NCAA scoreboard URL: /scoreboard/{sport}/{path}  - dates are YYYY/MM/DD
  const url = `${NCAA_BASE}/scoreboard/${sport}/d1/${date.replace(/-/g, '/')}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return [];
  const j = await res.json();
  return j.games || [];
}

/**
 * Find an NCAA ice hockey game for the given (home_team, away_team, date).
 * Returns normalized match data, or null if not found.
 */
export async function ncaaMatchData({ teams, date, league }) {
  const lg = matchLeague(league);
  const sport = lg === 'ncaaw' ? 'icehockey-women' : 'icehockey-men';
  if (!teams || teams.length < 2 || !date) return null;

  // Try the date + 1 day before/after (timezone drift)
  const d0 = new Date(date + 'T00:00:00Z');
  const dayBefore = new Date(d0); dayBefore.setUTCDate(d0.getUTCDate() - 1);
  const dayAfter = new Date(d0); dayAfter.setUTCDate(d0.getUTCDate() + 1);
  const dates = [
    dayBefore.toISOString().slice(0, 10),
    date,
    dayAfter.toISOString().slice(0, 10),
  ];

  const teamKeys = normalizeTeamKeys(teams);

  for (const d of dates) {
    let games = [];
    try {
      games = await fetchDateGames(d, sport);
    } catch (e) {
      console.error(`   ⚠️  NCAA ${sport} ${d}: ${e.message}`);
      continue;
    }
    for (const item of games) {
      const g = item.game;
      if (!g) continue;
      // Skip games not yet final
      if (g.gameState !== 'final' && g.gameState !== 'live') continue;
      const homeName = g.home?.names?.full || g.home?.names?.short || '';
      const awayName = g.away?.names?.full || g.away?.names?.short || '';
      const homeHas = teamMatches(homeName, teamKeys);
      const awayHas = teamMatches(awayName, teamKeys);
      if (homeHas && awayHas) {
        const homeScore = parseInt(g.home?.score, 10);
        const awayScore = parseInt(g.away?.score, 10);
        const isOT = (g.currentPeriod || '').toLowerCase().includes('ot') || g.period === '4' || g.period === '5';
        const isSO = (g.currentPeriod || '').toLowerCase().includes('shootout') || (g.title || '').toLowerCase().includes('shootout');
        return {
          source: 'ncaa',
          league: lg,
          home: homeName,
          away: awayName,
          home_team: homeName,
          away_team: awayName,
          score: `${homeScore}-${awayScore}`,
          wasOT: isOT && !isSO,
          wasSO: isSO,
          overTime: isOT ? '1-0' : '0-0',
          periodType: isSO ? 'SO' : isOT ? 'OT' : 'REG',
          description: g.finalMessage || g.currentPeriod || 'Final',
          gameId: g.gameID,
        };
      }
    }
  }
  return null;
}
