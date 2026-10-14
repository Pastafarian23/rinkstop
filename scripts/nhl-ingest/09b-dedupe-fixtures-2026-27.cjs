#!/usr/bin/env node
/**
 * Phase 9b — Deduplicate NHL 2026-27 fixtures.
 *
 * Context (2026-10-13, Arnel feedback):
 *  - The 2026-27 NHL schedule ingest (02-ingest-schedule-2026-27.cjs) ran
 *    on 2026-10-05 and created ~1,500 fixture rows keyed on
 *    game_data.nhl_game_id (pattern 202602XXXX).
 *  - The earlier Highlightly-driven ingest (scripts/ingest-2025-26-nhl-schedule.cjs)
 *    also ran in October and inserted ~3 additional "ghost" rows for the
 *    same matchups, using Highlightly team IDs and a real UUID. These
 *    ghost rows have game_data.nhl_game_id matching the NHL.com rows but
 *    use a different (or same-day-flipped) home/away team pair.
 *  - The ghost rows are stuck at status=scheduled with 0-0 score because
 *    the score-refresh cron targets the nhl_game_id-keyed proper rows,
 *    not the Highlightly-uuid rows.
 *  - On Tue 2026-10-13, the /directory/games page shows 18 games for
 *    Tuesday, but 3 of them (Buffalo@Montreal 6:30pm, Colorado@Dallas
 *    8:00pm, Toronto@Utah 9:00pm) are ghost rows showing as SCHEDULED
 *    0@0 even though the actual games are in progress or completed.
 *  - On the home page, get_home_page_data's upcoming_games LIMIT 3
 *    returned 2 of these ghost rows (Dallas@Colorado, Utah Hockey Club@
 *    Toronto) plus 1 WHL game — making the home page section show
 *    "Date TBD" for all 3 (separate bug, fixed in page.tsx) and mixing
 *    leagues.
 *
 * Strategy (mirror of 09-dedupe-fixtures.cjs):
 *  1. Fetch all NHL 2026-27 fixtures.
 *  2. Classify by game_data.nhl_game_id pattern:
 *     - "proper"      = nhl_game_id is 10-digit string starting with "2026"
 *                       (set by the 02-ingest NHL.com pull)
 *     - "no_ngid_obj" = game_data is JSON object but no 10-digit nhl_game_id
 *     - "highlightly" = game_data.nhl_game_id is an integer (Highlightly ingest)
 *  3. For each non-proper row, find the proper row at the same ET date
 *     with the same team pair (within ±3 days, since dates are stored in
 *     UTC and the same NHL game can appear at slightly different times).
 *  4. Migrate any play_by_play / game_skater_stats / game_goalie_stats
 *     references from ghost → proper, then DELETE the ghost.
 *
 * Safety:
 *  - Reads refs from all 3 stats tables and aborts if any are non-zero
 *    that we don't migrate first.
 *  - Verifies nhl_matches row count is unchanged after the run.
 *  - --dry-run is the default. Pass --apply to actually delete.
 *
 * Run:
 *   node scripts/nhl-ingest/09b-dedupe-fixtures-2026-27.cjs --dry-run
 *   node scripts/nhl-ingest/09b-dedupe-fixtures-2026-27.cjs --apply
 *
 * League: NHL only. Season: 2026-27 only.
 */

require('../load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NHL_LEAGUE = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const DB_SEASON = '2026-27';
const SEASON_PREFIX = '2026';
const apply = process.argv.includes('--apply');
const dryRun = !apply;

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

async function paginate(query, step = 999) {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await query(from, from + step - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < step) break;
    from += step;
  }
  return all;
}

async function getNhlFixtures() {
  return paginate((g, l) =>
    supabase
      .from('fixtures')
      .select('id, scheduled_at, home_team_id, away_team_id, status, game_data')
      .eq('league_id', NHL_LEAGUE)
      .eq('season', DB_SEASON)
      .range(g, l)
  );
}

/**
 * Classify a fixture row by its game_data shape.
 *  - proper:  object with nhl_game_id as 10-digit string starting with "2026"
 *  - highlightly: object with nhl_game_id as integer (Highlightly feeds)
 *  - no_ngid_obj: object without a valid 10-digit nhl_game_id
 *  - null_gd / string_gd / other: leftover shapes we don't expect
 */
function classify(row) {
  const gd = row.game_data;
  if (gd === null || gd === undefined) return 'null_gd';
  if (typeof gd === 'string') return 'string_gd';
  if (typeof gd === 'object' && !Array.isArray(gd)) {
    const ngid = gd.nhl_game_id;
    if (ngid !== undefined && ngid !== null) {
      const s = String(ngid);
      if (/^[0-9]{10}$/.test(s) && s.startsWith(SEASON_PREFIX)) {
        return 'proper';
      }
      if (Number.isInteger(ngid) || (typeof ngid === 'number' && Number.isFinite(ngid))) {
        return 'highlightly';
      }
    }
    return 'no_ngid_obj';
  }
  return 'other';
}

async function getActiveTeamIds() {
  const { data } = await supabase
    .from('team_workspaces')
    .select('id')
    .eq('league_id', NHL_LEAGUE)
    .eq('is_active', true);
  return new Set((data || []).map(t => t.id));
}

async function getReferencesByFixture(fixtureIds, tableName) {
  if (fixtureIds.length === 0) return new Map();
  const refMap = new Map();
  for (let i = 0; i < fixtureIds.length; i += 200) {
    const chunk = fixtureIds.slice(i, i + 200);
    const { data } = await supabase
      .from(tableName)
      .select('id, fixture_id')
      .in('fixture_id', chunk);
    for (const row of (data || [])) {
      if (!refMap.has(row.fixture_id)) refMap.set(row.fixture_id, []);
      refMap.get(row.fixture_id).push(row.id);
    }
  }
  return refMap;
}

async function updateReferences(tableName, fixtureIdColumn, ids, newFixtureId) {
  if (ids.length === 0) return { migrated: 0, dropped: 0 };
  const { error, count } = await supabase
    .from(tableName)
    .update({ [fixtureIdColumn]: newFixtureId })
    .in('id', ids)
    .select('id', { count: 'exact' });
  if (!error) return { migrated: count || ids.length, dropped: 0 };

  let migrated = 0;
  let dropped = 0;
  for (const id of ids) {
    const { error: singleErr } = await supabase
      .from(tableName)
      .update({ [fixtureIdColumn]: newFixtureId })
      .eq('id', id);
    if (!singleErr) {
      migrated++;
      continue;
    }
    if (singleErr.message?.includes('duplicate key') || singleErr.code === '23505') {
      const { error: delErr } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      if (delErr) throw delErr;
      dropped++;
    } else {
      throw singleErr;
    }
  }
  return { migrated, dropped };
}

async function getNhlMatchesCount() {
  const { count } = await supabase
    .from('nhl_matches')
    .select('*', { count: 'exact', head: true });
  return count || 0;
}

async function main() {
  console.log(`[dedupe-2026-27] Phase 9b — deduplicate NHL 2026-27 fixtures`);
  console.log(`[dedupe-2026-27] mode=${apply ? 'APPLY' : 'DRY RUN'}`);

  const allRows = await getNhlFixtures();
  console.log(`[dedupe-2026-27] Total NHL ${DB_SEASON} fixtures: ${allRows.length}`);

  const matchesBefore = await getNhlMatchesCount();
  console.log(`[dedupe-2026-27] nhl_matches count BEFORE: ${matchesBefore}`);

  const proper = [];
  const highlightly = [];
  const no_ngid_obj = [];
  const string_gd = [];
  const null_gd = [];
  const other = [];
  for (const r of allRows) {
    const c = classify(r);
    if (c === 'proper') proper.push(r);
    else if (c === 'highlightly') highlightly.push(r);
    else if (c === 'no_ngid_obj') no_ngid_obj.push(r);
    else if (c === 'string_gd') string_gd.push(r);
    else if (c === 'null_gd') null_gd.push(r);
    else other.push(r);
  }
  console.log(`[dedupe-2026-27] Classification:`);
  console.log(`  proper (NHL.com):      ${proper.length}`);
  console.log(`  highlightly (ghost):   ${highlightly.length}`);
  console.log(`  no_ngid_obj:           ${no_ngid_obj.length}`);
  console.log(`  string_gd:             ${string_gd.length}`);
  console.log(`  null_gd:               ${null_gd.length}`);
  console.log(`  other:                 ${other.length}`);

  const activeIds = await getActiveTeamIds();

  const properActive = proper.filter(r => activeIds.has(r.home_team_id) && activeIds.has(r.away_team_id));
  const properInactive = proper.filter(r => !activeIds.has(r.home_team_id) || !activeIds.has(r.away_team_id));
  const highlightlyActive = highlightly.filter(r => activeIds.has(r.home_team_id) && activeIds.has(r.away_team_id));
  const highlightlyInactive = highlightly.filter(r => !activeIds.has(r.home_team_id) || !activeIds.has(r.away_team_id));
  const noNgidActive = no_ngid_obj.filter(r => activeIds.has(r.home_team_id) && activeIds.has(r.away_team_id));
  const noNgidInactive = no_ngid_obj.filter(r => !activeIds.has(r.home_team_id) || !activeIds.has(r.away_team_id));

  console.log(`\n[dedupe-2026-27] After active-team filter:`);
  console.log(`  proper: ${properActive.length} active / ${properInactive.length} inactive`);
  console.log(`  highlightly: ${highlightlyActive.length} active / ${highlightlyInactive.length} inactive`);
  console.log(`  no_ngid_obj: ${noNgidActive.length} active / ${noNgidInactive.length} inactive`);

  // Build proper index by team pair (active only)
  const properByTeamPair = new Map();
  for (const p of properActive) {
    const k = `${p.home_team_id}|${p.away_team_id}`;
    if (!properByTeamPair.has(k)) properByTeamPair.set(k, []);
    properByTeamPair.get(k).push(p);
  }
  // Also build a "reversed" team pair index, because some ghosts have
  // the home/away swapped relative to the proper row (the same matchup
  // but with the other team listed as home).
  const properByTeamPairReversed = new Map();
  for (const p of properActive) {
    const k = `${p.away_team_id}|${p.home_team_id}`;
    if (!properByTeamPairReversed.has(k)) properByTeamPairReversed.set(k, []);
    properByTeamPairReversed.get(k).push(p);
  }

  function findProperMatch(row) {
    // Try same-direction first
    const k1 = `${row.home_team_id}|${row.away_team_id}`;
    const candidates = properByTeamPair.get(k1) || [];
    const rowTime = new Date(row.scheduled_at).getTime();
    let best = null;
    let bestDiff = Infinity;
    for (const p of candidates) {
      const diff = Math.abs(new Date(p.scheduled_at).getTime() - rowTime);
      if (diff <= THREE_DAYS_MS && diff < bestDiff) {
        best = p;
        bestDiff = diff;
      }
    }
    if (best) return best;
    // Try reversed home/away
    const k2 = `${row.away_team_id}|${row.home_team_id}`;
    const candidates2 = properByTeamPairReversed.get(k2) || [];
    for (const p of candidates2) {
      const diff = Math.abs(new Date(p.scheduled_at).getTime() - rowTime);
      if (diff <= THREE_DAYS_MS && diff < bestDiff) {
        best = p;
        bestDiff = diff;
      }
    }
    return best;
  }

  const dupes = [];
  const unmatchable = [];

  for (const r of highlightlyActive) {
    const m = findProperMatch(r);
    if (m) dupes.push({ dup: r, proper: m, type: 'highlightly' });
    else unmatchable.push({ row: r, type: 'highlightly' });
  }
  for (const r of noNgidActive) {
    const m = findProperMatch(r);
    if (m) dupes.push({ dup: r, proper: m, type: 'no_ngid_obj' });
    else unmatchable.push({ row: r, type: 'no_ngid_obj' });
  }
  for (const r of highlightlyInactive) {
    unmatchable.push({ row: r, type: 'highlightly_inactive' });
  }
  for (const r of noNgidInactive) {
    unmatchable.push({ row: r, type: 'no_ngid_obj_inactive' });
  }

  console.log(`\n[dedupe-2026-27] Duplicates found: ${dupes.length}`);
  console.log(`[dedupe-2026-27] Unmatchable (no proper row within ±3 days, or inactive teams): ${unmatchable.length}`);

  if (dupes.length === 0) {
    console.log('[dedupe-2026-27] No duplicates to process.');
  }

  if (unmatchable.length > 0) {
    console.log('\n[dedupe-2026-27] Unmatchable rows (kept as-is, or flagged for review):');
    for (const u of unmatchable) {
      const ngid = u.row.game_data?.nhl_game_id;
      console.log(`  ${u.type.padEnd(28)} ${u.row.id.slice(0, 8)} ${u.row.scheduled_at} status=${u.row.status} home=${u.row.home_team_id?.slice(0, 8)} away=${u.row.away_team_id?.slice(0, 8)} ngid=${ngid}`);
    }
  }

  if (dupes.length === 0) {
    return;
  }

  // Print duplicate pairs so the operator can sanity check before --apply
  console.log(`\n[dedupe-2026-27] Duplicate pairs (${dupes.length}):`);
  for (const d of dupes) {
    const properNgid = d.proper.game_data?.nhl_game_id;
    const dupNgid = d.dup.game_data?.nhl_game_id;
    console.log(`  [${d.type}] dup=${d.dup.id.slice(0, 8)} (${d.dup.scheduled_at} home=${d.dup.home_team_id?.slice(0, 8)} away=${d.dup.away_team_id?.slice(0, 8)} status=${d.dup.status} ngid=${dupNgid})`);
    console.log(`         proper=${d.proper.id.slice(0, 8)} (${d.proper.scheduled_at} home=${d.proper.home_team_id?.slice(0, 8)} away=${d.proper.away_team_id?.slice(0, 8)} status=${d.proper.status} ngid=${properNgid})`);
  }

  // Check references on duplicates
  const dupIds = dupes.map(d => d.dup.id);
  console.log(`\n[dedupe-2026-27] Checking references on ${dupIds.length} duplicates...`);

  const [playByPlayRefs, skaterRefs, goalieRefs] = await Promise.all([
    getReferencesByFixture(dupIds, 'play_by_play'),
    getReferencesByFixture(dupIds, 'game_skater_stats'),
    getReferencesByFixture(dupIds, 'game_goalie_stats'),
  ]);

  const totalPbp = [...playByPlayRefs.values()].reduce((s, arr) => s + arr.length, 0);
  const totalSkater = [...skaterRefs.values()].reduce((s, arr) => s + arr.length, 0);
  const totalGoalie = [...goalieRefs.values()].reduce((s, arr) => s + arr.length, 0);
  console.log(`  play_by_play refs to migrate: ${totalPbp}`);
  console.log(`  game_skater_stats refs to migrate: ${totalSkater}`);
  console.log(`  game_goalie_stats refs to migrate: ${totalGoalie}`);

  if (dryRun) {
    console.log('\n[dedupe-2026-27] DRY RUN — would:');
    console.log(`  1. UPDATE ${totalPbp} play_by_play rows to point to proper fixtures`);
    console.log(`  2. UPDATE ${totalSkater} game_skater_stats rows`);
    console.log(`  3. UPDATE ${totalGoalie} game_goalie_stats rows`);
    console.log(`  4. DELETE ${dupes.length} duplicate fixture rows`);
    console.log(`  5. DELETE ${properInactive.length + highlightlyInactive.length + noNgidInactive.length} inactive-team rows`);
    return;
  }

  // Step 1-3: migrate references
  console.log('\n[dedupe-2026-27] Step 1: migrate play_by_play references...');
  let migratedPbp = 0, droppedPbp = 0;
  for (const d of dupes) {
    const refIds = playByPlayRefs.get(d.dup.id) || [];
    if (refIds.length === 0) continue;
    const { migrated, dropped } = await updateReferences('play_by_play', 'fixture_id', refIds, d.proper.id);
    migratedPbp += migrated;
    droppedPbp += dropped;
  }
  console.log(`[dedupe-2026-27] Migrated ${migratedPbp}/${totalPbp} play_by_play refs (${droppedPbp} dropped)`);

  console.log('\n[dedupe-2026-27] Step 2: migrate game_skater_stats references...');
  let migratedSkater = 0, droppedSkater = 0;
  for (const d of dupes) {
    const refIds = skaterRefs.get(d.dup.id) || [];
    if (refIds.length === 0) continue;
    const { migrated, dropped } = await updateReferences('game_skater_stats', 'fixture_id', refIds, d.proper.id);
    migratedSkater += migrated;
    droppedSkater += dropped;
  }
  console.log(`[dedupe-2026-27] Migrated ${migratedSkater}/${totalSkater} game_skater_stats refs (${droppedSkater} dropped)`);

  console.log('\n[dedupe-2026-27] Step 3: migrate game_goalie_stats references...');
  let migratedGoalie = 0, droppedGoalie = 0;
  for (const d of dupes) {
    const refIds = goalieRefs.get(d.dup.id) || [];
    if (refIds.length === 0) continue;
    const { migrated, dropped } = await updateReferences('game_goalie_stats', 'fixture_id', refIds, d.proper.id);
    migratedGoalie += migrated;
    droppedGoalie += dropped;
  }
  console.log(`[dedupe-2026-27] Migrated ${migratedGoalie}/${totalGoalie} game_goalie_stats refs (${droppedGoalie} dropped)`);

  // Verify migration
  console.log('\n[dedupe-2026-27] Verifying references are now on proper rows...');
  const dupIdsRemaining = dupes.map(d => d.dup.id);
  const [pbpRemaining, skaterRemaining, goalieRemaining] = await Promise.all([
    getReferencesByFixture(dupIdsRemaining, 'play_by_play'),
    getReferencesByFixture(dupIdsRemaining, 'game_skater_stats'),
    getReferencesByFixture(dupIdsRemaining, 'game_goalie_stats'),
  ]);
  const totalPbpRemaining = [...pbpRemaining.values()].reduce((s, arr) => s + arr.length, 0);
  const totalSkaterRemaining = [...skaterRemaining.values()].reduce((s, arr) => s + arr.length, 0);
  const totalGoalieRemaining = [...goalieRemaining.values()].reduce((s, arr) => s + arr.length, 0);

  if (totalPbpRemaining > 0 || totalSkaterRemaining > 0 || totalGoalieRemaining > 0) {
    console.error(`[dedupe-2026-27] ❌ Migration incomplete — ${totalPbpRemaining} pbp, ${totalSkaterRemaining} skater, ${totalGoalieRemaining} goalie refs remain on duplicates`);
    console.error(`[dedupe-2026-27] ABORTING before DELETE — investigate which dups still have refs`);
    return;
  }
  console.log(`[dedupe-2026-27] ✅ All refs migrated — safe to DELETE duplicates`);

  // Step 4: delete duplicates
  console.log(`\n[dedupe-2026-27] Step 4: DELETE ${dupes.length} duplicates (in batches of 100)...`);
  let deletedDupes = 0;
  for (let i = 0; i < dupIdsRemaining.length; i += 100) {
    const chunk = dupIdsRemaining.slice(i, i + 100);
    const { error, count } = await supabase
      .from('fixtures')
      .delete({ count: 'exact' })
      .in('id', chunk);
    if (error) {
      console.error(`[dedupe-2026-27] ❌ DELETE chunk failed: ${error.message}`);
      return;
    }
    deletedDupes += count || chunk.length;
  }
  console.log(`[dedupe-2026-27] Deleted ${deletedDupes} duplicates`);

  // Step 5: delete inactive-team rows
  const inactiveIds = [
    ...properInactive.map(r => r.id),
    ...highlightlyInactive.map(r => r.id),
    ...noNgidInactive.map(r => r.id),
  ];
  console.log(`\n[dedupe-2026-27] Step 5: DELETE ${inactiveIds.length} inactive-team rows...`);
  let deletedInactive = 0;
  for (let i = 0; i < inactiveIds.length; i += 100) {
    const chunk = inactiveIds.slice(i, i + 100);
    const { error, count } = await supabase
      .from('fixtures')
      .delete({ count: 'exact' })
      .in('id', chunk);
    if (error) {
      console.error(`[dedupe-2026-27] ❌ DELETE inactive chunk failed: ${error.message}`);
      return;
    }
    deletedInactive += count || chunk.length;
  }
  console.log(`[dedupe-2026-27] Deleted ${deletedInactive} inactive-team rows`);

  // Final verification
  console.log(`\n[dedupe-2026-27] === FINAL VERIFICATION ===`);
  const matchesAfter = await getNhlMatchesCount();
  console.log(`  nhl_matches count BEFORE: ${matchesBefore}, AFTER: ${matchesAfter}`);
  console.log(`  ${matchesAfter === matchesBefore ? '✅' : '❌'} nhl_matches count unchanged`);

  const finalFixtures = await getNhlFixtures();
  console.log(`  NHL ${DB_SEASON} fixtures AFTER: ${finalFixtures.length} (expected ~1,409 unique games — 65 preseason + 1,344 regular)`);
  const remainingProper = finalFixtures.filter(r => classify(r) === 'proper').length;
  const remainingHighlightly = finalFixtures.filter(r => classify(r) === 'highlightly').length;
  const remainingNoNgid = finalFixtures.filter(r => classify(r) === 'no_ngid_obj').length;
  console.log(`  ${remainingProper} proper, ${remainingHighlightly} highlightly, ${remainingNoNgid} no_ngid_obj remain`);

  console.log('\n[dedupe-2026-27] DONE.');
}

main().catch(e => {
  console.error('[dedupe-2026-27] FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
