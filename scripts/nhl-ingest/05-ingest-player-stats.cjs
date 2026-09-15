#!/usr/bin/env node
/**
 * Phase 5 — Ingest NHL 2025-26 skater + goalie stats into highlightly_career_stats.
 *
 * APPROACH:
 *  - Pull NHL.com /stats/rest/en/skater/summary?limit=-1 (~940 rows)
 *  - Pull NHL.com /stats/rest/en/goalie/summary?limit=-1 (~98 rows)
 *  - Map to highlightly_career_stats (which uses player_id as string, season as "2025", season_type as "regular")
 *  - Cross-link to nhl_players.id (NHL numeric player ID)
 *
 * Schema note: highlightly_career_stats uses season="2025" (4-digit), season_type="regular".
 * We need to map NHL.com's seasonId=20252026 → "2025" + "regular".
 *
 * Run:
 *   node scripts/nhl-ingest/05-ingest-player-stats.cjs --dry-run
 *   node scripts/nhl-ingest/05-ingest-player-stats.cjs
 */

require('../load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const { fetchSkaterStats, fetchGoalieStats } = require('./lib/sources/nhl-com.cjs');

const NHL_SEASON = '20252026';
const HL_SEASON = '2025';
const HL_SEASON_TYPE = 'regular';
const LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dryRun = process.argv.includes('--dry-run');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Map NHL.com skater row to highlightly_career_stats row.
 */
function mapSkater(r) {
  return {
    id: `${r.playerId}-${HL_SEASON}-${HL_SEASON_TYPE}`,
    player_id: String(r.playerId),
    player_name: r.skaterFullName || `${r.firstName?.default || ''} ${r.lastName?.default || ''}`.trim(),
    league_id: LEAGUE_ID,
    league_name: 'NHL',
    season: HL_SEASON,
    season_type: HL_SEASON_TYPE,
    games_played: r.gamesPlayed,
    goals: r.goals,
    assists: r.assists,
    points: r.points,
    plus_minus: r.plusMinus,
    penalty_minutes: r.penaltyMinutes,
    additional_stats: {
      entity_type: 'skater',
      player_id: r.playerId,
      team_abbrevs: r.teamAbbrevs,
      position_code: r.positionCode,
      shoots_catches: r.shootsCatches,
      ev_goals: r.evGoals,
      ev_points: r.evPoints,
      pp_goals: r.ppGoals,
      pp_points: r.ppPoints,
      sh_goals: r.shGoals,
      sh_points: r.shPoints,
      ot_goals: r.otGoals,
      game_winning_goals: r.gameWinningGoals,
      shots: r.shots,
      shooting_pct: r.shootingPct,
      time_on_ice_per_game: r.timeOnIcePerGame,
      faceoff_win_pct: r.faceoffWinPct,
      points_per_game: r.pointsPerGame,
      source: 'nhl.com',
      season_id: parseInt(NHL_SEASON, 10),
    },
    last_synced: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

/**
 * Map NHL.com goalie row to highlightly_career_stats row.
 */
function mapGoalie(r) {
  return {
    id: `${r.playerId}-${HL_SEASON}-${HL_SEASON_TYPE}`,
    player_id: String(r.playerId),
    player_name: r.goalieFullName || r.lastName || '',
    league_id: LEAGUE_ID,
    league_name: 'NHL',
    season: HL_SEASON,
    season_type: HL_SEASON_TYPE,
    games_played: r.gamesPlayed,
    wins: r.wins,
    losses: r.losses,
    overtime_losses: r.otLosses,
    goals_against: r.goalsAgainst,
    saves: r.saves,
    save_percentage: r.savePct,
    goals_against_average: r.goalsAgainstAverage,
    shutouts: r.shutouts,
    penalty_minutes: r.penaltyMinutes,
    points: r.points,
    additional_stats: {
      entity_type: 'goalie',
      player_id: r.playerId,
      team_abbrevs: r.teamAbbrevs,
      shoots_catches: r.shootsCatches,
      games_started: r.gamesStarted,
      shots_against: r.shotsAgainst,
      time_on_ice: r.timeOnIce,
      source: 'nhl.com',
      season_id: parseInt(NHL_SEASON, 10),
    },
    last_synced: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

async function main() {
  console.log('[stats] Phase 5: NHL 2025-26 player stats');
  console.log(`[stats] dry_run=${dryRun}`);

  // Pull skater + goalie stats
  console.log('[stats] Pulling NHL.com skater stats...');
  const skaters = await fetchSkaterStats(NHL_SEASON, 2);
  console.log(`[stats] Skaters: ${skaters.length}`);

  console.log('[stats] Pulling NHL.com goalie stats...');
  const goalies = await fetchGoalieStats(NHL_SEASON, 2);
  console.log(`[stats] Goalies: ${goalies.length}`);

  // Map
  const skaterRows = skaters.map(mapSkater);
  const goalieRows = goalies.map(mapGoalie);

  // Cross-link check: ensure player_id exists in nhl_players
  console.log('[stats] Verifying player cross-links to nhl_players...');
  const allPlayerIds = [...new Set([
    ...skaters.map(s => s.playerId),
    ...goalies.map(g => g.playerId),
  ])];

  let matched = 0, unmatched = 0;
  const matchedIds = new Set();
  for (let i = 0; i < allPlayerIds.length; i += 200) {
    const batch = allPlayerIds.slice(i, i + 200);
    const { data } = await supabase
      .from('nhl_players')
      .select('id')
      .in('id', batch);
    if (data) {
      for (const r of data) matchedIds.add(r.id);
    }
    await sleep(50);
  }
  matched = matchedIds.size;
  unmatched = allPlayerIds.length - matched;
  console.log(`[stats] Cross-link check: matched=${matched}/${allPlayerIds.length} unmatched=${unmatched}`);

  if (dryRun) {
    console.log(`\n[stats] DRY RUN — would upsert ${skaterRows.length} skaters + ${goalieRows.length} goalies`);
    console.log(`\nSample skater row:`);
    console.log(JSON.stringify(skaterRows[0], null, 2).slice(0, 800));
    console.log(`\nSample goalie row:`);
    console.log(JSON.stringify(goalieRows[0], null, 2).slice(0, 800));
    process.exit(0);
  }

  // Upsert
  async function upsertBatch(rows, label) {
    console.log(`[stats] Upserting ${rows.length} ${label}...`);
    let inserted = 0, failed = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const batchNum = Math.floor(i / 100) + 1;
      process.stdout.write(`[stats] ${label} batch ${batchNum}/${Math.ceil(rows.length / 100)}...`);
      const { error } = await supabase
        .from('highlightly_career_stats')
        .upsert(batch, { onConflict: 'player_id,season,season_type' });
      if (error) {
        console.error(' ERR:', error.message);
        failed += batch.length;
      } else {
        console.log(' ok');
        inserted += batch.length;
      }
    }
    return { inserted, failed };
  }

  const skaterResult = await upsertBatch(skaterRows, 'skater');
  const goalieResult = await upsertBatch(goalieRows, 'goalie');

  // Audit log
  await supabase.from('ingest_audit_log').insert({
    entity_type: 'player_stats',
    season: '2025-26',
    phase: 5,
    source_1: 'nhl.com',
    source_2: 'pending',
    completed_at: new Date().toISOString(),
    rows_pulled_s1: skaters.length + goalies.length,
    rows_matched: matched,
    rows_flagged: unmatched,
    rows_inserted: skaterResult.inserted + goalieResult.inserted,
    status: 'completed',
  });

  console.log(`\n[stats] DONE.`);
  console.log(`  Skaters: inserted=${skaterResult.inserted} failed=${skaterResult.failed}`);
  console.log(`  Goalies: inserted=${goalieResult.inserted} failed=${goalieResult.failed}`);
  console.log(`  Cross-link: ${matched}/${allPlayerIds.length} player_ids matched in nhl_players`);
}

main().catch(e => { console.error(e); process.exit(1); });
