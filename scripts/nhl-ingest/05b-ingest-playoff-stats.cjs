#!/usr/bin/env node
/**
 * Phase 5b — Ingest NHL 2025-26 PLAYOFF player stats (gameTypeId=3).
 *
 * Same approach as Phase 5 but for playoffs. Uses season_type='playoffs'.
 *
 * Run: node scripts/nhl-ingest/05b-ingest-playoff-stats.cjs [--dry-run]
 */

require('../load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const { fetchSkaterStats, fetchGoalieStats } = require('./lib/sources/nhl-com.cjs');

const NHL_SEASON = '20252026';
const HL_SEASON = '2025';
const HL_SEASON_TYPE = 'playoffs';
const GAME_TYPE = 3;
const LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dryRun = process.argv.includes('--dry-run');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function mapSkater(r) {
  return {
    id: `${r.playerId}-${HL_SEASON}-${HL_SEASON_TYPE}`,
    player_id: String(r.playerId),
    player_name: r.skaterFullName || '',
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
      player_id: r.playerId,
      team_abbrevs: r.teamAbbrevs,
      position_code: r.positionCode,
      shots: r.shots,
      shooting_pct: r.shootingPct,
      time_on_ice_per_game: r.timeOnIcePerGame,
      faceoff_win_pct: r.faceoffWinPct,
      points_per_game: r.pointsPerGame,
      source: 'nhl.com',
      season_id: parseInt(NHL_SEASON, 10),
      game_type_id: GAME_TYPE,
    },
    last_synced: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

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
      player_id: r.playerId,
      team_abbrevs: r.teamAbbrevs,
      games_started: r.gamesStarted,
      shots_against: r.shotsAgainst,
      time_on_ice: r.timeOnIce,
      source: 'nhl.com',
      season_id: parseInt(NHL_SEASON, 10),
      game_type_id: GAME_TYPE,
    },
    last_synced: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

async function main() {
  console.log(`[stats-5b] Phase 5b: NHL 2025-26 PLAYOFF player stats (gameTypeId=${GAME_TYPE})`);

  const skaters = await fetchSkaterStats(NHL_SEASON, GAME_TYPE);
  const goalies = await fetchGoalieStats(NHL_SEASON, GAME_TYPE);
  console.log(`[stats-5b] Skaters: ${skaters.length}, Goalies: ${goalies.length}`);

  const skaterRows = skaters.map(mapSkater);
  const goalieRows = goalies.map(mapGoalie);

  if (dryRun) {
    console.log(`[stats-5b] DRY RUN — would upsert ${skaterRows.length} skaters + ${goalieRows.length} goalies`);
    process.exit(0);
  }

  let inserted = 0, failed = 0;
  for (let i = 0; i < skaterRows.length; i += 100) {
    const batch = skaterRows.slice(i, i + 100);
    const { error } = await supabase.from('highlightly_career_stats').upsert(batch, { onConflict: 'player_id,season,season_type' });
    if (error) { console.error(`  skater batch ${i / 100 + 1}: ${error.message}`); failed += batch.length; }
    else inserted += batch.length;
  }
  for (let i = 0; i < goalieRows.length; i += 100) {
    const batch = goalieRows.slice(i, i + 100);
    const { error } = await supabase.from('highlightly_career_stats').upsert(batch, { onConflict: 'player_id,season,season_type' });
    if (error) { console.error(`  goalie batch ${i / 100 + 1}: ${error.message}`); failed += batch.length; }
    else inserted += batch.length;
  }

  await supabase.from('ingest_audit_log').insert({
    entity_type: 'player_stats_playoffs',
    season: '2025-26',
    phase: 5,
    source_1: 'nhl.com',
    source_2: 'pending',
    completed_at: new Date().toISOString(),
    rows_pulled_s1: skaterRows.length + goalieRows.length,
    rows_inserted: inserted,
    status: 'completed',
  });

  console.log(`[stats-5b] DONE. inserted=${inserted} failed=${failed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
