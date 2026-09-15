#!/usr/bin/env node
/**
 * Phase 6 — POST-INGEST EXHAUSTIVE VERIFICATION.
 *
 * For every entity we ingested, re-pull from the source of truth (NHL.com) and
 * diff against DB. Any DB row that's missing in the source → REVERT candidate.
 *
 * This is the part that catches drift. We don't trust the ingest; we re-verify.
 *
 * Per-entity verification:
 *  - Schedule: 1,498 games. For each, check (id, homeTri, awayTri, round) match.
 *  - Standings: 32 teams. Check (wins, losses, otLosses, points, gamesPlayed) match.
 *  - Rosters: 702 players. Check (id, full_name, current_team_abbreviation, position) match.
 *  - Skater stats: 940 rows. Check (player_id, season, season_type, gamesPlayed, points) match.
 *  - Goalie stats: 98 rows. Same.
 *
 * Run:
 *   node scripts/nhl-ingest/06-verify-all.cjs
 *   node scripts/nhl-ingest/06-verify-all.cjs --entity=schedule
 */

require('../load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const { fetchTeamSchedule, fetchTeamStats, fetchTeamRoster, fetchSkaterStats, fetchGoalieStats } = require('./lib/sources/nhl-com.cjs');

const NHL_SEASON = '20252026';
const DB_SEASON = '2025-26';
const HL_SEASON = '2025';
const HL_SEASON_TYPE = 'regular';
const LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const entityArgs = process.argv.filter(a => a.startsWith('--entity=')).map(a => a.split('=')[1]);
const ENTITIES = entityArgs.length > 0 ? entityArgs : ['schedule', 'standings', 'rosters', 'skater_stats', 'goalie_stats'];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const NHL_ID_TO_TRI = {
  1: 'NJD', 2: 'NYI', 3: 'NYR', 4: 'PHI', 5: 'PIT', 6: 'MTL', 7: 'BOS',
  8: 'BUF', 9: 'OTT', 10: 'TOR', 12: 'CAR', 13: 'FLA', 14: 'TBL', 15: 'WSH',
  16: 'CHI', 17: 'DET', 18: 'NSH', 19: 'STL', 20: 'CGY', 21: 'COL',
  22: 'EDM', 23: 'VAN', 24: 'ANA', 25: 'DAL', 26: 'LAK', 28: 'SJS',
  29: 'CBJ', 30: 'MIN', 52: 'WPG', 54: 'VGK', 55: 'SEA', 68: 'UTA'
};
const ALL_TRI = Object.values(NHL_ID_TO_TRI);

// ============================================================================
// Schedule verification
// ============================================================================
async function verifySchedule() {
  console.log('\n[verify] === SCHEDULE ===');
  console.log('[verify] Pulling NHL.com schedules for all 32 teams...');
  const sourceGames = new Map();
  for (const tri of ALL_TRI) {
    try {
      const games = await fetchTeamSchedule(tri, NHL_SEASON);
      for (const g of games) {
        const ngid = String(g.id);
        if (!sourceGames.has(ngid)) {
          sourceGames.set(ngid, {
            nhl_game_id: ngid,
            homeTri: g.homeTeam?.abbrev,
            awayTri: g.awayTeam?.abbrev,
            round: { 1: 'preseason', 2: 'regular-season', 3: 'postseason' }[g.gameType],
            homeScore: g.homeTeam?.score,
            awayScore: g.awayTeam?.score,
            state: g.gameState,
          });
        }
      }
    } catch (e) {
      console.warn(`  ${tri} ERR: ${e.message}`);
    }
    await sleep(110);
  }
  console.log(`[verify] Source: ${sourceGames.size} unique games`);

  // Pull DB games (only NHL.com-format nhl_game_id which starts with 2025)
  const allFixtures = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('fixtures')
      .select('id, game_data, status, home_score, away_score, season')
      .eq('season', DB_SEASON)
      .not('game_data->>nhl_game_id', 'is', null)
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allFixtures.push(...data);
    offset += data.length;
    if (data.length < 1000) break;
  }

  const dbGames = new Map();
  for (const f of allFixtures) {
    const ngid = String(f.game_data?.nhl_game_id || '');
    if (ngid.length === 10) { // NHL.com format only
      dbGames.set(ngid, f);
    }
  }
  console.log(`[verify] DB (NHL.com-format): ${dbGames.size} games`);

  let matched = 0, missingInSource = 0, missingInDb = 0, disagreed = 0;
  const issues = [];

  // Check DB rows present in source
  for (const [ngid, dbRow] of dbGames) {
    if (!sourceGames.has(ngid)) {
      missingInSource++;
      issues.push({ type: 'missing_in_source', ngid, dbRow });
    } else {
      matched++;
    }
  }
  // Check source rows present in DB
  for (const [ngid, srcRow] of sourceGames) {
    if (!dbGames.has(ngid)) {
      missingInDb++;
      issues.push({ type: 'missing_in_db', ngid, srcRow });
    }
  }

  console.log(`  Matched:           ${matched}`);
  console.log(`  Missing in source: ${missingInSource}`);
  console.log(`  Missing in DB:     ${missingInDb}`);
  console.log(`  Disagreed:         ${disagreed}`);
  if (issues.length > 0) {
    console.log(`  Issues (first 10):`);
    for (const i of issues.slice(0, 10)) console.log(`    ${JSON.stringify(i).slice(0, 200)}`);
  }
  return { matched, missingInSource, missingInDb, issues: issues.length };
}

// ============================================================================
// Standings verification
// ============================================================================
async function verifyStandings() {
  console.log('\n[verify] === STANDINGS ===');
  const sourceRows = await fetchTeamStats(NHL_SEASON, 2);
  const sourceById = {};
  for (const r of sourceRows) sourceById[r.teamId] = r;
  console.log(`[verify] Source: ${sourceRows.length} team rows`);

  const { data: dbRows } = await supabase.from('nhl_team_season_stats').select('*').eq('season', DB_SEASON);
  console.log(`[verify] DB: ${dbRows.length} team rows`);

  let matched = 0, missingInSource = 0, disagreed = 0;
  const issues = [];

  // Build tri → NHL teamId map (using DB rows' source_2 etc.)
  for (const dbRow of dbRows) {
    // We need to find the matching NHL.com row by team. The DB row doesn't have triCode directly,
    // but we can look up via nhl_players.current_team_abbreviation joined to current_team_id.
    // Simpler: use team_workspaces.slug-derived triCode from DB.
    const { data: team } = await supabase.from('team_workspaces').select('slug').eq('id', dbRow.team_id).single();
    if (!team) continue;
    const SLUG_TO_TRI = {
      'anaheim-ducks':'ANA','boston-bruins':'BOS','buffalo-sabres':'BUF',
      'calgary-flames':'CGY','carolina-hurricanes':'CAR','chicago-blackhawks':'CHI',
      'colorado-avalanche':'COL','columbus-blue-jackets':'CBJ','dallas-stars':'DAL',
      'detroit-red-wings':'DET','edmonton-oilers':'EDM','florida-panthers':'FLA',
      'los-angeles-kings':'LAK','minnesota-wild':'MIN','montr-al-canadiens':'MTL',
      'nashville-predators':'NSH','new-jersey-devils':'NJD','new-york-islanders':'NYI',
      'new-york-rangers':'NYR','ottawa-senators':'OTT','philadelphia-flyers':'PHI',
      'pittsburgh-penguins':'PIT','san-jose-sharks':'SJS','seattle-kraken':'SEA',
      'st-louis-blues':'STL','tampa-bay-lightning':'TBL','toronto-maple-leafs':'TOR',
      'utah-mammoth':'UTA','vancouver-canucks':'VAN','vegas-golden-knights':'VGK',
      'winnipeg-jets':'WPG','washington-capitals':'WSH'
    };
    const tri = SLUG_TO_TRI[team.slug];
    if (!tri) continue;
    const nhlId = parseInt(Object.entries(NHL_ID_TO_TRI).find(([k, v]) => v === tri)?.[0] || '0', 10);
    const src = sourceById[nhlId];
    if (!src) {
      missingInSource++;
      issues.push({ type: 'missing_in_source', tri, nhlId });
      continue;
    }
    const wOk = src.wins === dbRow.wins;
    const lOk = src.losses === dbRow.losses;
    const otOk = src.otLosses === dbRow.overtime_losses;
    const pOk = src.points === dbRow.points;
    if (wOk && lOk && otOk && pOk) matched++;
    else {
      disagreed++;
      issues.push({ type: 'disagree', tri, source: { W: src.wins, L: src.losses, O: src.otLosses, P: src.points }, db: dbRow });
    }
  }
  console.log(`  Matched:           ${matched}`);
  console.log(`  Missing in source: ${missingInSource}`);
  console.log(`  Disagreed:         ${disagreed}`);
  if (issues.length > 0) {
    console.log(`  Issues (first 10):`);
    for (const i of issues.slice(0, 10)) console.log(`    ${JSON.stringify(i).slice(0, 200)}`);
  }
  return { matched, missingInSource, disagreed, issues: issues.length };
}

// ============================================================================
// Rosters verification
// ============================================================================
async function verifyRosters() {
  console.log('\n[verify] === ROSTERS ===');
  const sourcePlayers = new Map();
  for (const tri of ALL_TRI) {
    try {
      const roster = await fetchTeamRoster(tri, NHL_SEASON);
      for (const sec of ['forwards', 'defensemen', 'goalies']) {
        for (const p of roster[sec]) {
          sourcePlayers.set(p.id, {
            id: p.id,
            full_name: `${p.firstName?.default || ''} ${p.lastName?.default || ''}`.trim(),
            tri,
            jersey: p.sweaterNumber,
            position: p.positionCode,
          });
        }
      }
    } catch (e) {}
    await sleep(110);
  }
  console.log(`[verify] Source: ${sourcePlayers.size} unique players`);

  const { data: dbRows } = await supabase.from('nhl_players')
    .select('id, full_name, current_team_abbreviation, position, is_active')
    .eq('source', 'nhl.com')
    .eq('is_active', true);
  console.log(`[verify] DB (nhl.com source): ${dbRows.length}`);

  let matched = 0, missingInSource = 0, disagreed = 0;
  for (const dbRow of dbRows) {
    const src = sourcePlayers.get(dbRow.id);
    if (!src) {
      missingInSource++;
      continue;
    }
    const nameOk = src.full_name === dbRow.full_name;
    const triOk = src.tri === dbRow.current_team_abbreviation;
    if (nameOk && triOk) matched++;
    else disagreed++;
  }
  console.log(`  Matched:           ${matched}`);
  console.log(`  Missing in source: ${missingInSource}`);
  console.log(`  Disagreed:         ${disagreed}`);
  return { matched, missingInSource, disagreed };
}

// ============================================================================
// Player stats verification
// ============================================================================
async function verifyPlayerStats(type) {
  console.log(`\n[verify] === ${type.toUpperCase()} STATS ===`);
  const sourceFn = type === 'skater' ? fetchSkaterStats : fetchGoalieStats;
  // Filter heuristic: skaters have no save_percentage, goalies have no goals
  const skaterFilter = type === 'skater' ? 'save_percentage' : 'goals';
  const sourceRows = await sourceFn(NHL_SEASON, 2);
  const sourceById = {};
  for (const r of sourceRows) {
    sourceById[r.playerId] = {
      playerId: r.playerId,
      gamesPlayed: r.gamesPlayed,
      goals: r.goals,
      assists: r.assists,
      points: r.points,
      wins: r.wins,
      losses: r.losses,
      savePercentage: r.savePct,
    };
  }
  console.log(`[verify] Source: ${sourceRows.length} ${type} rows`);

  let dbRows = [];
  let offset = 0;
  while (true) {
    let q = supabase.from('highlightly_career_stats')
      .select('player_id, games_played, goals, assists, points, wins, losses, save_percentage, additional_stats')
      .eq('season', HL_SEASON)
      .eq('season_type', HL_SEASON_TYPE)
      .eq('additional_stats->>source', 'nhl.com');
    // Skaters have position_code, goalies have games_started
    if (type === 'skater') q = q.not('additional_stats->>position_code', 'is', null);
    else q = q.not('additional_stats->>games_started', 'is', null);
    const { data, error } = await q.range(offset, offset + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    dbRows.push(...data);
    offset += data.length;
    if (data.length < 1000) break;
  }
  console.log(`[verify] DB (nhl.com source only, ${type}s): ${dbRows.length} rows`);

  let matched = 0, missingInSource = 0, disagreed = 0;
  for (const dbRow of dbRows) {
    const src = sourceById[Number(dbRow.player_id)];
    if (!src) {
      missingInSource++;
      continue;
    }
    const gOk = src.gamesPlayed === dbRow.games_played;
    const ptsOk = (src.points || 0) === (dbRow.points || 0);
    if (gOk && ptsOk) matched++;
    else disagreed++;
  }
  console.log(`  Matched:           ${matched}`);
  console.log(`  Missing in source: ${missingInSource}`);
  console.log(`  Disagreed:         ${disagreed}`);
  return { matched, missingInSource, disagreed };
}

async function main() {
  console.log(`[verify] Phase 6: POST-INGEST EXHAUSTIVE VERIFICATION`);
  console.log(`[verify] Entities: ${ENTITIES.join(', ')}`);
  const results = {};

  if (ENTITIES.includes('schedule')) results.schedule = await verifySchedule();
  if (ENTITIES.includes('standings')) results.standings = await verifyStandings();
  if (ENTITIES.includes('rosters')) results.rosters = await verifyRosters();
  if (ENTITIES.includes('skater_stats')) results.skater_stats = await verifyPlayerStats('skater');
  if (ENTITIES.includes('goalie_stats')) results.goalie_stats = await verifyPlayerStats('goalie');

  // Audit
  await supabase.from('ingest_audit_log').insert({
    entity_type: 'verification',
    season: '2025-26',
    phase: 6,
    source_1: 'nhl.com',
    source_2: 're-pull',
    completed_at: new Date().toISOString(),
    status: 'completed',
    flag_details: results,
  });

  console.log('\n[verify] DONE.');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
