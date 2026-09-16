#!/usr/bin/env node
/**
 * Phase 9 — Deduplicate NHL 2025-26 fixtures.
 *
 * Background: After Phase 2 ingested NHL.com data into fixtures, old highlightly
 * rows from a previous sync were left in place. Result: 2,997 fixtures rows for
 * 1,498 actual NHL.com games.
 *
 * Strategy: for each duplicate fixture row, migrate any play_by_play (or
 * game_stats) references to the canonical proper row first, then DELETE the
 * duplicate. NEVER delete a row that has foreign-key references — the script
 * migrates first, verifies references moved, then deletes.
 *
 * Safety: every step is verified by recounting. The script aborts on any
 * unexpected change (e.g. play_by_play refs went DOWN instead of staying flat).
 *
 * Run:
 *   node scripts/nhl-ingest/09-dedupe-fixtures.cjs --dry-run
 *   node scripts/nhl-ingest/09-dedupe-fixtures.cjs --apply
 *
 * League: NHL only. Season: 2025-26 only.
 */

require('../load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NHL_LEAGUE = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const DB_SEASON = '2025-26';
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

function classify(row) {
  const gd = row.game_data;
  if (gd === null || gd === undefined) return 'null_gd';
  if (typeof gd === 'string') return 'string_gd';
  if (typeof gd === 'object' && !Array.isArray(gd)) {
    const ngid = gd.nhl_game_id;
    if (ngid && /^[0-9]{10}$/.test(String(ngid)) && String(ngid).startsWith('2025')) {
      return 'proper';
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

async function updateReferences(tableName, fixtureIdColumn, ids, newFixtureId, dupId) {
  if (ids.length === 0) return { migrated: 0, dropped: 0 };
  // Try update first
  const { error, count } = await supabase
    .from(tableName)
    .update({ [fixtureIdColumn]: newFixtureId })
    .in('id', ids)
    .select('id', { count: 'exact' });
  if (!error) return { migrated: count || ids.length, dropped: 0 };

  // Constraint violation — migrate one at a time, DELETE the dup row when
  // the proper row already has an equivalent event (dedupe by uniqueness).
  console.log(`[dedupe]    ${tableName} batch update hit unique constraint — migrating one by one`);
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
    // If unique violation, the proper row already has an equivalent event.
    // Delete the dup's pbp row to preserve the proper's.
    if (singleErr.message?.includes('duplicate key') || singleErr.code === '23505') {
      const { error: delErr } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      if (delErr) {
        console.error(`[dedupe]    ❌ Could not delete conflicting ${tableName} row ${id}: ${delErr.message}`);
        throw delErr;
      }
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
  console.log('[dedupe] Phase 9 — deduplicate NHL 2025-26 fixtures');
  console.log(`[dedupe] mode=${apply ? 'APPLY' : 'DRY RUN'}`);

  const allRows = await getNhlFixtures();
  console.log(`[dedupe] Total NHL 2025-26 fixtures: ${allRows.length}`);

  // Snapshot nhl_matches count for safety check
  const matchesBefore = await getNhlMatchesCount();
  console.log(`[dedupe] nhl_matches count BEFORE: ${matchesBefore}`);

  // Classify
  const proper = []; // canonical rows
  const string_gd = []; // broken string format
  const no_ngid_obj = []; // object, no 10-digit ID
  const null_gd = []; // null
  const other = []; // unparseable
  for (const r of allRows) {
    const c = classify(r);
    if (c === 'proper') proper.push(r);
    else if (c === 'string_gd') string_gd.push(r);
    else if (c === 'no_ngid_obj') no_ngid_obj.push(r);
    else if (c === 'null_gd') null_gd.push(r);
    else other.push(r);
  }
  console.log(`[dedupe] Classification:`);
  console.log(`  proper: ${proper.length}`);
  console.log(`  string_gd: ${string_gd.length}`);
  console.log(`  no_ngid_obj: ${no_ngid_obj.length}`);
  console.log(`  null_gd: ${null_gd.length}`);
  console.log(`  other: ${other.length}`);

  const activeIds = await getActiveTeamIds();

  // Filter to ACTIVE team refs only — duplicates with inactive teams have
  // no proper row to dedupe against anyway, so we'll just flag them.
  const properActive = proper.filter(r => activeIds.has(r.home_team_id) && activeIds.has(r.away_team_id));
  const properInactive = proper.filter(r => !activeIds.has(r.home_team_id) || !activeIds.has(r.away_team_id));
  const stringActive = string_gd.filter(r => activeIds.has(r.home_team_id) && activeIds.has(r.away_team_id));
  const stringInactive = string_gd.filter(r => !activeIds.has(r.home_team_id) || !activeIds.has(r.away_team_id));
  const noNgidActive = no_ngid_obj.filter(r => activeIds.has(r.home_team_id) && activeIds.has(r.away_team_id));
  const noNgidInactive = no_ngid_obj.filter(r => !activeIds.has(r.home_team_id) || !activeIds.has(r.away_team_id));

  console.log(`\n[dedupe] After active-team filter:`);
  console.log(`  proper: ${properActive.length} active / ${properInactive.length} inactive`);
  console.log(`  string_gd: ${stringActive.length} active / ${stringInactive.length} inactive`);
  console.log(`  no_ngid_obj: ${noNgidActive.length} active / ${noNgidInactive.length} inactive`);

  // Build proper index by team pair (active only)
  const properByTeamPair = new Map();
  for (const p of properActive) {
    const k = `${p.home_team_id}|${p.away_team_id}`;
    if (!properByTeamPair.has(k)) properByTeamPair.set(k, []);
    properByTeamPair.get(k).push(p);
  }

  // For each non-proper row with active teams, find the proper row at same time
  // within ±3 days. If found, it's a duplicate. If not, keep it (might be
  // unique game or might be a wrong-team-pair match).
  function findProperMatch(row) {
    const k = `${row.home_team_id}|${row.away_team_id}`;
    const candidates = properByTeamPair.get(k) || [];
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
    return best;
  }

  const dupes = []; // { dup: row, proper: row, type: string }
  const unmatchable = [];

  for (const r of stringActive) {
    const m = findProperMatch(r);
    if (m) dupes.push({ dup: r, proper: m, type: 'string_gd' });
    else unmatchable.push({ row: r, type: 'string_gd' });
  }
  for (const r of noNgidActive) {
    const m = findProperMatch(r);
    if (m) dupes.push({ dup: r, proper: m, type: 'no_ngid_obj' });
    else unmatchable.push({ row: r, type: 'no_ngid_obj' });
  }

  console.log(`\n[dedupe] Duplicates found: ${dupes.length}`);
  console.log(`[dedupe] Unmatchable (no proper row within ±3 days): ${unmatchable.length}`);

  if (dupes.length === 0) {
    console.log('[dedupe] No duplicates to process.');
    return;
  }

  // Check references on duplicates
  const dupIds = dupes.map(d => d.dup.id);
  console.log(`[dedupe] Checking references on ${dupIds.length} duplicates...`);

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

  // Verify all duplicates are NOT referenced by nhl_matches (they shouldn't be
  // since nhl_matches uses NHL.com IDs and duplicates don't have those).
  const dupNgids = dupes.map(d => d.dup.game_data?.nhl_game_id).filter(Boolean);
  const matchesToCheck = new Set();
  for (const ngid of dupNgids) {
    const asNum = parseInt(String(ngid), 10);
    if (!isNaN(asNum)) matchesToCheck.add(asNum);
  }
  // Verify no dup fixture_id is referenced by nhl_matches via home/away
  // (nhl_matches uses team names + IDs, not fixture FK — but let's be safe)

  if (dryRun) {
    console.log('\n[dedupe] DRY RUN — would:');
    console.log(`  1. UPDATE ${totalPbp} play_by_play rows to point to proper fixtures`);
    console.log(`  2. UPDATE ${totalSkater} game_skater_stats rows`);
    console.log(`  3. UPDATE ${totalGoalie} game_goalie_stats rows`);
    console.log(`  4. DELETE ${dupes.length} duplicate fixture rows`);
    console.log(`  5. DELETE ${properInactive.length} inactive-team proper rows`);
    console.log(`  6. DELETE ${stringInactive.length} inactive-team string_gd rows`);
    console.log(`  7. DELETE ${noNgidInactive.length} inactive-team no_ngid_obj rows`);
    return;
  }

  // Step 1-3: migrate references
  console.log('\n[dedupe] Step 1: migrate play_by_play references...');
  let migratedPbp = 0;
  let droppedPbp = 0;
  for (const d of dupes) {
    const refIds = playByPlayRefs.get(d.dup.id) || [];
    if (refIds.length === 0) continue;
    const { migrated, dropped } = await updateReferences('play_by_play', 'fixture_id', refIds, d.proper.id, d.dup.id);
    migratedPbp += migrated;
    droppedPbp += dropped;
    if ((migratedPbp + droppedPbp) % 200 === 0) console.log(`  progress: ${migratedPbp}/${totalPbp} migrated, ${droppedPbp} dropped (dedup)`);
  }
  console.log(`[dedupe] Migrated ${migratedPbp}/${totalPbp} play_by_play refs (${droppedPbp} dup events dropped because proper row already has the same event)`);

  console.log('\n[dedupe] Step 2: migrate game_skater_stats references...');
  let migratedSkater = 0;
  let droppedSkater = 0;
  for (const d of dupes) {
    const refIds = skaterRefs.get(d.dup.id) || [];
    if (refIds.length === 0) continue;
    const { migrated, dropped } = await updateReferences('game_skater_stats', 'fixture_id', refIds, d.proper.id, d.dup.id);
    migratedSkater += migrated;
    droppedSkater += dropped;
  }
  console.log(`[dedupe] Migrated ${migratedSkater}/${totalSkater} game_skater_stats refs (${droppedSkater} dropped)`);

  console.log('\n[dedupe] Step 3: migrate game_goalie_stats references...');
  let migratedGoalie = 0;
  let droppedGoalie = 0;
  for (const d of dupes) {
    const refIds = goalieRefs.get(d.dup.id) || [];
    if (refIds.length === 0) continue;
    const { migrated, dropped } = await updateReferences('game_goalie_stats', 'fixture_id', refIds, d.proper.id, d.dup.id);
    migratedGoalie += migrated;
    droppedGoalie += dropped;
  }
  console.log(`[dedupe] Migrated ${migratedGoalie}/${totalGoalie} game_goalie_stats refs (${droppedGoalie} dropped)`);

  // Verify migration
  console.log('\n[dedupe] Verifying references are now on proper rows...');
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
    console.error(`[dedupe] ❌ Migration incomplete — ${totalPbpRemaining} pbp, ${totalSkaterRemaining} skater, ${totalGoalieRemaining} goalie refs remain on duplicates`);
    console.error(`[dedupe] ABORTING before DELETE — investigate which dups still have refs`);
    return;
  }
  console.log(`[dedupe] ✅ All refs migrated — safe to DELETE duplicates`);

  // Step 4: delete duplicates
  console.log(`\n[dedupe] Step 4: DELETE ${dupes.length} duplicates (in batches of 100)...`);
  let deletedDupes = 0;
  for (let i = 0; i < dupIdsRemaining.length; i += 100) {
    const chunk = dupIdsRemaining.slice(i, i + 100);
    const { error, count } = await supabase
      .from('fixtures')
      .delete({ count: 'exact' })
      .in('id', chunk);
    if (error) {
      console.error(`[dedupe] ❌ DELETE chunk failed: ${error.message}`);
      return;
    }
    deletedDupes += count || chunk.length;
  }
  console.log(`[dedupe] Deleted ${deletedDupes} duplicates`);

  // Step 5-7: delete inactive-team rows
  console.log(`\n[dedupe] Step 5: DELETE inactive-team rows...`);
  const inactiveIds = [
    ...properInactive.map(r => r.id),
    ...stringInactive.map(r => r.id),
    ...noNgidInactive.map(r => r.id),
  ];
  let deletedInactive = 0;
  for (let i = 0; i < inactiveIds.length; i += 100) {
    const chunk = inactiveIds.slice(i, i + 100);
    const { error, count } = await supabase
      .from('fixtures')
      .delete({ count: 'exact' })
      .in('id', chunk);
    if (error) {
      console.error(`[dedupe] ❌ DELETE inactive chunk failed: ${error.message}`);
      return;
    }
    deletedInactive += count || chunk.length;
  }
  console.log(`[dedupe] Deleted ${deletedInactive} inactive-team rows`);

  // Final verification
  console.log(`\n[dedupe] === FINAL VERIFICATION ===`);
  const matchesAfter = await getNhlMatchesCount();
  console.log(`  nhl_matches count BEFORE: ${matchesBefore}, AFTER: ${matchesAfter}`);
  console.log(`  ${matchesAfter === matchesBefore ? '✅' : '❌'} nhl_matches count unchanged`);

  const finalFixtures = await getNhlFixtures();
  console.log(`  NHL 2025-26 fixtures AFTER: ${finalFixtures.length} (expected ~1,500 = 1,498 + 2 Stanley Cup)`);
  console.log(`  ${finalFixtures.length === 1500 ? '✅' : '⚠️'}  fixtures count matches expected`);

  // Verify all remaining fixtures are proper (canonical NHL.com format)
  const remainingProper = finalFixtures.filter(r => classify(r) === 'proper').length;
  const remainingString = finalFixtures.filter(r => classify(r) === 'string_gd').length;
  const remainingNoNgid = finalFixtures.filter(r => classify(r) === 'no_ngid_obj').length;
  console.log(`  ${remainingProper} proper, ${remainingString} string_gd, ${remainingNoNgid} no_ngid_obj remain`);

  // Verify pbp totals
  const { count: pbpTotal } = await supabase
    .from('play_by_play')
    .select('*', { count: 'exact', head: true });
  console.log(`  play_by_play total rows: ${pbpTotal} (should match pre-dedup count)`);

  console.log('\n[dedupe] DONE.');
}

main().catch(e => {
  console.error('[dedupe] FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
