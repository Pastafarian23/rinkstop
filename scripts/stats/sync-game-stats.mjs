// Sync engine for the game-stats foundation.
//
// Reads completed fixtures missing stats, fetches data from the right source
// (NHL.com for NHL, Highlightly for everyone else), writes to the 4 foundation
// tables. Idempotent — re-runs are safe; uses ON CONFLICT DO NOTHING via upserts.
//
// Usage:
//   node scripts/stats/sync-game-stats.mjs [--limit=50] [--league=NHL] [--dry-run]
//
// Cron: 02:00 Chicago daily. Use the detached wrapper for long runs.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { fetchHighlightlyGameStats, getHighlightlyMatchDetail, normalizeHighlightlyDetail } from './highlightly-adapter.mjs';
import { fetchNhlGameFacts } from '../article-from-highlight/datasources/nhlcom-article-data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');

// Load .env
const env = {};
for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Parse args
const args = Object.fromEntries(process.argv.slice(2)
  .filter(a => a.startsWith('--'))
  .map(a => a.slice(2).split('=')));

const LIMIT = parseInt(args.limit || '50', 10);
const LEAGUE_FILTER = args.league || null;
const DRY_RUN = args['dry-run'] === '1';
const FORCE_REFETCH = args.force === '1';
// Days back to look for missing fixtures. Default 30 (incremental sync).
// For backfill: pass --days=365 to get a full year of missing games.
const DAYS_BACK = parseInt(args.days || '30', 10);

const RESULT_FILE = process.env.SYNC_RESULT_FILE || '/tmp/sync-game-stats.result.json';

function log(...args) { console.log('[sync]', ...args); }
function logErr(...args) { console.error('[sync]', ...args); }

/**
 * Find completed fixtures missing stats in the foundation.
 * Pulls from the last 30 days by default to keep the working set small.
 * Pass --limit=N to control batch size.
 */
async function findMissingFixtures(limit) {
  // DAYS_BACK ago
  const since = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
  let query = supabase.from('fixtures')
    .select('id, league_id, home_team_id, away_team_id, scheduled_at, status, home_score, away_score, game_data')
    .eq('status', 'completed')
    .gte('scheduled_at', since)
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (LEAGUE_FILTER) {
    // Map league name to ID (exact match to avoid "NHL" matching "4 Nations Face-Off")
    const { data: lg } = await supabase.from('leagues').select('id, name').eq('name', LEAGUE_FILTER).limit(1);
    if (!lg?.[0]) {
      logErr(`No exact league match for "${LEAGUE_FILTER}"`);
      process.exit(1);
    }
    log(`Filtering to league ${lg[0].name} (${lg[0].id})`);
    query = query.eq('league_id', lg[0].id);
  }

  const { data: fixtures } = await query;
  if (!fixtures) return [];

  // Get league names for mapping
  const { data: leagues } = await supabase.from('leagues').select('id, name');
  const leagueMap = Object.fromEntries((leagues || []).map(l => [l.id, l.name]));

  // Find which ones are already in game_stats_audit
  const fixtureIds = fixtures.map(f => f.id);
  const { data: existing } = await supabase.from('game_stats_audit')
    .select('fixture_id, source, status')
    .in('fixture_id', fixtureIds);
  const alreadySynced = new Set((existing || []).filter(e => e.status === 'ok').map(e => e.fixture_id));

  return fixtures
    .filter(f => FORCE_REFETCH || !alreadySynced.has(f.id))
    .map(f => ({
      ...f,
      league_name: leagueMap[f.league_id] || null,
      nhl_game_id: f.game_data?.nhl_game_id || null,
    }));
}

/**
 * Detect whether a nhl_game_id is a Highlightly sequential id or an NHL.com id.
 * Highlightly uses short numeric ids (e.g. 638757).
 * NHL.com uses year-prefixed 10-digit ids (e.g. 2025030315).
 */
function isNhlComId(id) {
  const s = String(id || '');
  return /^\d{10}$/.test(s) && (s.startsWith('2024') || s.startsWith('2025') || s.startsWith('2026'));
}

/**
 * Sync a single fixture. Returns { rowsWritten, source, status }.
 *
 * Strategy:
 *  1. If game_data has inline NHL.com data (goals + playerByGameStats), use it directly.
 *  2. If nhl_game_id is an NHL.com id (10-digit year-prefixed), call NHL.com.
 *  3. If nhl_game_id is a Highlightly id (short), call Highlightly /matches/{id}.
 *  4. Otherwise, fall back to Highlightly lookup by team+date.
 */
async function syncFixture(fixture) {
  const result = { rowsWritten: 0, source: null, status: 'no_data' };
  const gd = fixture.game_data || {};

  // Path 1: Inline NHL.com data (older fixtures, has goals + playerByGameStats)
  if (gd.goals && Array.isArray(gd.goals) && gd.goals.length > 0) {
    try {
      const facts = extractNhlComFactsFromGameData(gd);
      const written = await writeNhlComToFoundation(fixture, facts);
      return {
        rowsWritten: written,
        source: 'nhl.com',
        status: 'ok',
        was_ot: facts.wasOT,
        was_so: facts.wasSO,
        final_home: fixture.home_score,
        final_away: fixture.away_score,
      };
    } catch (e) {
      return { ...result, status: 'error', error: e.message };
    }
  }

  // Path 2: NHL.com id (10-digit) — call the API
  if (fixture.nhl_game_id && isNhlComId(fixture.nhl_game_id)) {
    try {
      const facts = await fetchNhlGameFacts(fixture.nhl_game_id);
      if (!facts || !facts.complete) {
        return { ...result, status: 'no_data', error: `NHL.com gameState=${facts?.gameState || 'null'}` };
      }
      const written = await writeNhlComToFoundation(fixture, facts);
      return {
        rowsWritten: written,
        source: 'nhl.com',
        status: 'ok',
        was_ot: facts.wasOT,
        was_so: facts.wasSO,
        final_home: fixture.home_score,
        final_away: fixture.away_score,
      };
    } catch (e) {
      return { ...result, status: 'error', error: e.message };
    }
  }

  // Path 3: Highlightly id (short) — call /matches/{id}
  if (fixture.nhl_game_id && String(fixture.nhl_game_id).length <= 8) {
    try {
      const detail = await getHighlightlyMatchDetail({
        matchId: fixture.nhl_game_id,
        base: 'https://nhl.highlightly.net',
        hostHost: 'nhl-ncaah-api.p.rapidapi.com',
        apiKey: env.HIGHLIGHTLY_API_KEY,
      });
      if (!detail) return { ...result, status: 'no_data', error: 'Highlightly /matches/{id} returned null' };
      const stats = normalizeHighlightlyDetail(detail);
      if (!stats || !stats.complete) return { ...result, status: 'no_data', error: 'Highlightly detail missing final score' };
      const written = await writeHighlightlyToFoundation(fixture, stats);
      return {
        rowsWritten: written,
        source: 'highlightly',
        status: 'ok',
        was_ot: stats.wasOT,
        was_so: stats.wasSO,
        period_scores: stats.periodScores,
        final_home: stats.finalHome,
        final_away: stats.finalAway,
      };
    } catch (e) {
      return { ...result, status: 'error', error: e.message };
    }
  }

  // Path 4: Highlightly by team+date lookup (non-NHL, or NHL without nhl_game_id)
  if (!fixture.league_name) {
    return { ...result, status: 'no_data', error: 'no league_name for fixture' };
  }
  try {
    const stats = await fetchHighlightlyGameStats({
      fixture,
      leagueName: fixture.league_name,
      apiKey: env.HIGHLIGHTLY_API_KEY,
      supabase,
    });
    if (!stats) {
      return { ...result, status: 'no_data', error: 'Highlightly lookup returned null' };
    }
    const written = await writeHighlightlyToFoundation(fixture, stats);
    return {
      rowsWritten: written,
      source: 'highlightly',
      status: 'ok',
      was_ot: stats.wasOT,
      was_so: stats.wasSO,
      period_scores: stats.periodScores,
      final_home: stats.finalHome,
      final_away: stats.finalAway,
    };
  } catch (e) {
    return { ...result, status: 'error', error: e.message };
  }
}

/**
 * Extract a facts block from inlined NHL.com game_data (older fixtures).
 * The shape mirrors fetchNhlGameFacts() output so writeNhlComToFoundation works.
 */
function extractNhlComFactsFromGameData(gd) {
  const homeAbbrev = gd.homeTeam?.abbrev || gd.homeTeam?.abbreviation;
  const awayAbbrev = gd.awayTeam?.abbrev || gd.awayTeam?.abbreviation;

  // Goals
  const goals = (gd.goals || []).map(g => {
    const t = g.timeInPeriod;
    const assists = (g.assists || []).map(a => ({
      name: a.name?.default || a.name,
      id: a.playerId || null,
    }));
    return {
      period: g.period,
      periodType: g.periodDescriptor?.periodType || 'REG',
      timeInPeriod: t,
      teamAbbrev: g.teamAbbrev?.default || g.teamAbbrev,
      scorer: g.name?.default || g.name,
      scorerId: g.playerId || null,
      isPowerPlay: g.strength === 'pp',
      isShortHanded: g.strength === 'sh',
      isEmptyNet: g.goalModifier === 'empty-net',
      isPenaltyShot: g.goalModifier === 'penalty-shot',
      assists,
      scoreAfter: { away: g.awayScore, home: g.homeScore },
    };
  });

  // Goalies (from playerByGameStats)
  const goalies = [];
  for (const side of ['awayTeam', 'homeTeam']) {
    const teamAbbrev = side === 'homeTeam' ? homeAbbrev : awayAbbrev;
    for (const g of gd.playerByGameStats?.[side]?.goalies || []) {
      if (g.toi === '00:00' && g.shotsAgainst === 0) continue;  // backup with no time
      goalies.push({
        teamAbbrev,
        playerName: g.name?.default || g.name,
        shotsAgainst: g.shotsAgainst,
        saves: g.saves,
        savePct: g.savePctg ? Math.round(g.savePctg * 1000) / 10 : null,  // convert to pct
        goalsAgainst: g.goalsAgainst,
        decision: g.decision,
        toi: g.toi,
      });
    }
  }

  // Shots by period (from goals, since playerByGameStats only has totals)
  // Without per-period shot data inline, this is best-effort from inline data
  // The NHL.com landing page has lineScore.shotsByPeriod which isn't inline
  // So we skip shotsByPeriod when extracting from game_data
  return {
    complete: true,
    gameState: gd.gameState || 'OFF',
    score: `${gd.awayTeam?.score ?? 0} - ${gd.homeTeam?.score ?? 0}`,
    wasOT: gd.gameOutcome?.lastPeriodType === 'OT',
    wasSO: gd.gameOutcome?.lastPeriodType === 'SO',
    goals,
    goalies,
    shotsByPeriod: [],  // not available inline
  };
}

/**
 * Write NHL.com facts to the foundation tables.
 */
async function writeNhlComToFoundation(fixture, facts) {
  let rowsWritten = 0;

  // 1. play_by_play — one row per goal
  const playByPlay = (facts.goals || []).map(g => ({
    fixture_id: fixture.id,
    league: 'NHL',
    source: 'nhl.com',
    period: g.period,
    period_type: g.periodType,
    time_in_period: g.timeInPeriod,
    team_abbrev: g.teamAbbrev,
    scorer_name: g.scorer,
    scorer_player_id: g.scorerId,
    is_power_play: g.isPowerPlay || false,
    is_short_handed: g.isShortHanded || false,
    is_empty_net: g.isEmptyNet || false,
    is_penalty_shot: g.isPenaltyShot || false,
    assists: g.assists || [],
    score_after_home: g.scoreAfter?.home ?? null,
    score_after_away: g.scoreAfter?.away ?? null,
  }));
  if (playByPlay.length && !DRY_RUN) {
    const { error } = await supabase.from('play_by_play').upsert(playByPlay, {
      onConflict: 'fixture_id,period,time_in_period,team_abbrev,scorer_name',
      ignoreDuplicates: true,
    });
    if (error) logErr('play_by_play upsert error:', error.message);
    else rowsWritten += playByPlay.length;
  } else if (DRY_RUN) {
    rowsWritten += playByPlay.length;
  }

  // 2. game_shot_summary — one row per period
  const shotSummary = (facts.shotsByPeriod || []).map(s => ({
    fixture_id: fixture.id,
    league: 'NHL',
    source: 'nhl.com',
    period: s.period,
    home_shots: s.homeShots,
    away_shots: s.awayShots,
  }));
  if (shotSummary.length && !DRY_RUN) {
    const { error } = await supabase.from('game_shot_summary').upsert(shotSummary, {
      onConflict: 'fixture_id,period',
      ignoreDuplicates: true,
    });
    if (error) logErr('game_shot_summary upsert error:', error.message);
    else rowsWritten += shotSummary.length;
  } else if (DRY_RUN) {
    rowsWritten += shotSummary.length;
  }

  // 3. game_goalie_stats — one row per goalie
  const goalieStats = (facts.goalies || []).map(g => ({
    fixture_id: fixture.id,
    league: 'NHL',
    source: 'nhl.com',
    team_abbrev: g.teamAbbrev || 'UNK',
    player_name: g.playerName,
    shots_against: g.shotsAgainst,
    saves: g.saves,
    save_pct: g.savePct,
    goals_against: g.goalsAgainst,
    decision: g.decision,
    toi: g.toi,
  }));
  if (goalieStats.length && !DRY_RUN) {
    const { error } = await supabase.from('game_goalie_stats').upsert(goalieStats, {
      onConflict: 'fixture_id,team_abbrev,player_name',
      ignoreDuplicates: true,
    });
    if (error) logErr('game_goalie_stats upsert error:', error.message);
    else rowsWritten += goalieStats.length;
  } else if (DRY_RUN) {
    rowsWritten += goalieStats.length;
  }

  return rowsWritten;
}

/**
 * Write Highlightly stats to the foundation tables.
 * Non-NHL leagues typically have only period scores + final — no play-by-play or goalie stats.
 */
async function writeHighlightlyToFoundation(fixture, stats) {
  if (!stats.complete) return 0;
  // Most non-NHL: no events, no boxscore. We just record the audit row.
  // If Highlightly ever returns events for non-NHL (unlikely), we'd write them.
  if (stats.events?.length) {
    const playByPlay = stats.events.map(e => ({
      fixture_id: fixture.id,
      league: fixture.league_name,
      source: 'highlightly',
      period: e.period,
      time_in_period: e.timeInPeriod,
      team_abbrev: e.team,
      scorer_name: e.scorerName,
      is_power_play: e.isPowerPlay || false,
      is_short_handed: e.isShortHanded || false,
      assists: e.assists || [],
      score_after_home: e.scoreAfter?.home ?? null,
      score_after_away: e.scoreAfter?.away ?? null,
    }));
    if (!DRY_RUN) {
      const { error } = await supabase.from('play_by_play').upsert(playByPlay, {
        onConflict: 'fixture_id,period,time_in_period,team_abbrev,scorer_name',
        ignoreDuplicates: true,
      });
      if (error) logErr('play_by_play (hl) upsert error:', error.message);
    }
  }
  return stats.events?.length || 0;
}

async function writeAuditRow(fixture, source, status, rowsWritten, errorMessage, extras = {}) {
  if (DRY_RUN) return;
  const { error } = await supabase.from('game_stats_audit').upsert({
    fixture_id: fixture.id,
    source,
    status,
    rows_written: rowsWritten,
    error_message: errorMessage || null,
    period_scores: extras.period_scores || null,
    was_ot: extras.was_ot || false,
    was_so: extras.was_so || false,
    home_score: extras.home_score ?? fixture.home_score ?? null,
    away_score: extras.away_score ?? fixture.away_score ?? null,
    league_name: fixture.league_name,
    fetched_at: new Date().toISOString(),
  }, {
    onConflict: 'fixture_id,source',
  });
  if (error) logErr('audit upsert error:', error.message);
}

async function main() {
  log(`Starting sync (limit=${LIMIT}, days=${DAYS_BACK}, league=${LEAGUE_FILTER || 'all'}, dry-run=${DRY_RUN})`);
  const missing = await findMissingFixtures(LIMIT);
  log(`Found ${missing.length} fixtures missing stats`);

  if (missing.length === 0) {
    log('Nothing to do.');
    writeFileSync(RESULT_FILE, JSON.stringify({ status: 'ok', processed: 0, errors: 0 }, null, 2));
    return;
  }

  const summary = { total: missing.length, ok: 0, no_data: 0, error: 0, nhlCom: 0, highlightly: 0, rowsWritten: 0 };
  const startedAt = Date.now();

  for (let i = 0; i < missing.length; i++) {
    const fx = missing[i];
    const t0 = Date.now();
    let result;
    try {
      result = await syncFixture(fx);
    } catch (e) {
      result = { rowsWritten: 0, source: null, status: 'error', error: e.message };
    }
    const elapsed = Date.now() - t0;

    if (result.status === 'ok') summary.ok++;
    else if (result.status === 'no_data') summary.no_data++;
    else summary.error++;

    if (result.source === 'nhl.com') summary.nhlCom++;
    else if (result.source === 'highlightly') summary.highlightly++;
    summary.rowsWritten += result.rowsWritten;

    // Always write audit row (including failures) so we don't re-fetch the same null
    await writeAuditRow(fx, result.source || 'unknown', result.status, result.rowsWritten, result.error, {
      period_scores: result.period_scores || null,
      was_ot: result.was_ot || false,
      was_so: result.was_so || false,
      home_score: result.final_home,
      away_score: result.final_away,
    });

    if ((i + 1) % 10 === 0 || i === missing.length - 1) {
      log(`Progress: ${i + 1}/${missing.length} | ok=${summary.ok} nodata=${summary.no_data} err=${summary.error} | rows=${summary.rowsWritten} | ${(Date.now() - startedAt) / 1000}s`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }

  const totalSec = (Date.now() - startedAt) / 1000;
  log(`\n=== sync complete in ${totalSec}s ===`);
  log(`ok: ${summary.ok} | no_data: ${summary.no_data} | error: ${summary.error}`);
  log(`NHL.com: ${summary.nhlCom} | Highlightly: ${summary.highlightly}`);
  log(`Total rows written: ${summary.rowsWritten}`);

  writeFileSync(RESULT_FILE, JSON.stringify({ status: 'ok', ...summary, totalSec }, null, 2));
}

main().catch(e => {
  logErr('fatal:', e);
  writeFileSync(RESULT_FILE, JSON.stringify({ status: 'fatal', error: e.message }, null, 2));
  process.exit(1);
});
