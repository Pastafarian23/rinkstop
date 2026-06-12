/**
 * HockeyTech data source.
 *
 * HockeyTech is the stats provider used directly by the AHL, ECHL, OHL,
 * WHL, QMJHL, USHL, and PWHL official sites. The "client keys" are
 * embedded in the public site pages and are free to use (no login).
 *
 * We pull the full season schedule, cache it, then look up games by
 * (home_team, away_team, date) and return normalized match data.
 *
 * References:
 *   - https://lscluster.hockeytech.com/feed/?feed=modulekit&view=schedule&key=...&client_code=...
 *   - Used by theahl.com, echl.com, theohl.com, whl.ca, lhjmq.qc.ca, ushl.com, thepwhl.com
 *
 * Season ID for the current season is fetched lazily and cached.
 */

const HOCKEYTECH_CONFIG = {
  ahl:   { clientCode: 'ahl',   key: '50c2cd9b5e18e390' },
  echl:  { clientCode: 'echl',  key: '2c2b89ea7345cae8' },
  ohl:   { clientCode: 'ohl',   key: 'f1aa699db3d81487' },
  whl:   { clientCode: 'whl',   key: 'f1aa699db3d81487' },
  qmjhl: { clientCode: 'lhjmq', key: 'f1aa699db3d81487' },
  ushl:  { clientCode: 'ushl',  key: 'e828f89b243dc43f' },
  pwhl:  { clientCode: 'pwhl',  key: '446521baf8c38984' },
};

// League-name patterns we match in highlight_backups.league_name
const LEAGUE_NAME_PATTERNS = [
  { league: 'ahl',   patterns: ['ahl'] },
  { league: 'echl',  patterns: ['echl'] },
  { league: 'ohl',   patterns: ['ohl'] },
  { league: 'whl',   patterns: ['whl'] },
  { league: 'qmjhl', patterns: ['qmjhl', 'lhjmq', 'lhjml', 'lhjmg'] },
  { league: 'ushl',  patterns: ['ushl'] },
  { league: 'pwhl',  patterns: ['pwhl'] },
];

// Season cache: { [clientCode]: { seasonId, schedule: [...games], fetchedAt } }
const seasonCache = {};
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function matchLeague(leagueRaw) {
  const name = (typeof leagueRaw === 'object' && leagueRaw) ? leagueRaw.name : (leagueRaw || '');
  const lower = (name || '').toLowerCase();
  for (const { league, patterns } of LEAGUE_NAME_PATTERNS) {
    if (patterns.some(p => lower.includes(p))) return league;
  }
  return null;
}

async function fetchSchedule(clientCode, key) {
  const cached = seasonCache[clientCode];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.schedule;
  }
  // First call without season_id — the response includes the current season_id
  const url1 = `https://lscluster.hockeytech.com/feed/?feed=modulekit&view=schedule&key=${key}&client_code=${clientCode}&fmt=json&lang=en`;
  const res1 = await fetch(url1, { signal: AbortSignal.timeout(15000) });
  if (!res1.ok) throw new Error(`HockeyTech ${clientCode}: HTTP ${res1.status}`);
  const j1 = await res1.json();
  const seasonId = j1.SiteKit?.Parameters?.season_id;
  if (!seasonId) throw new Error(`HockeyTech ${clientCode}: no season_id in response`);

  // Refetch with the explicit season_id (more reliable across leagues)
  const url2 = `https://lscluster.hockeytech.com/feed/?feed=modulekit&view=schedule&key=${key}&client_code=${clientCode}&fmt=json&lang=en&season_id=${seasonId}`;
  const res2 = await fetch(url2, { signal: AbortSignal.timeout(15000) });
  if (!res2.ok) throw new Error(`HockeyTech ${clientCode} season ${seasonId}: HTTP ${res2.status}`);
  const j2 = await res2.json();
  const schedule = j2.SiteKit?.Schedule || [];
  seasonCache[clientCode] = { seasonId, schedule, fetchedAt: Date.now() };
  return schedule;
}

/**
 * Find a HockeyTech game for the given (home_team, away_team, date).
 * Returns normalized match data, or null if not found.
 */
export async function hockeytechMatchData({ teams, date, league }) {
  const leagueKey = matchLeague(league);
  if (!leagueKey) return null;
  const cfg = HOCKEYTECH_CONFIG[leagueKey];
  if (!cfg) return null;
  if (!teams || teams.length < 2 || !date) return null;

  let schedule;
  try {
    schedule = await fetchSchedule(cfg.clientCode, cfg.key);
  } catch (e) {
    console.error(`   ⚠️  HockeyTech ${leagueKey}: ${e.message}`);
    return null;
  }

  // Normalize team names like the other sources do.
  // Strip apostrophes since the HockeyTech feed uses "Ottawa 67's" but
  // highlight titles use "Ottawa 67s".
  const teamKeys = teams.map(t => {
    const noThe = t.replace(/^the\s+/i, '').replace(/['']/g, '').toLowerCase().trim();
    return { full: noThe, last: noThe.split(/\s+/).pop() };
  });

  // Date window: try d-1, d, d+1 (timezone drift)
  const d0 = new Date(date + 'T00:00:00Z');
  const dayBefore = new Date(d0); dayBefore.setUTCDate(d0.getUTCDate() - 1);
  const dayAfter = new Date(d0); dayAfter.setUTCDate(d0.getUTCDate() + 1);
  const dateKeys = [
    dayBefore.toISOString().slice(0, 10),
    date,
    dayAfter.toISOString().slice(0, 10),
  ];

  // Build a map of team_id -> name from the schedule (one entry per team)
  const teamNameById = new Map();
  for (const g of schedule) {
    if (!teamNameById.has(g.home_team)) teamNameById.set(g.home_team, g.home_team_name);
    if (!teamNameById.has(g.visiting_team)) teamNameById.set(g.visiting_team, g.visiting_team_name);
  }

  for (const g of schedule) {
    if (!dateKeys.includes((g.date_played || '').slice(0, 10))) continue;
    if (g.final !== '1') continue; // skip unplayed games
    const homeName = (g.home_team_name || '').replace(/['']/g, '').toLowerCase();
    const awayName = (g.visiting_team_name || '').replace(/['']/g, '').toLowerCase();
    const homeHas = teamKeys.some(k => homeName.includes(k.last) || homeName.includes(k.full));
    const awayHas = teamKeys.some(k => awayName.includes(k.last) || awayName.includes(k.full));
    if (homeHas && awayHas) {
      const homeScore = parseInt(g.home_goal_count, 10);
      const awayScore = parseInt(g.visiting_goal_count, 10);
      const wasOT = g.overtime === '1' && g.shootout !== '1';
      const wasSO = g.shootout === '1';
      const score = `${homeScore}-${awayScore}`;
      return {
        source: 'hockeytech',
        league: leagueKey,
        home: g.home_team_name,
        away: g.visiting_team_name,
        home_team: g.home_team_name,
        away_team: g.visiting_team_name,
        score,
        wasOT,
        wasSO,
        overTime: wasOT ? '1-0' : '0-0',
        periodType: wasSO ? 'SO' : wasOT ? 'OT' : 'REG',
        description: g.game_status, // "Final", "Final OT", "Final SO"
        venue: g.venue_name,
        gameId: g.game_id,
        startTimeUTC: g.GameDateISO8601,
      };
    }
  }
  return null;
}
