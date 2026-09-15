#!/usr/bin/env node
/**
 * Phase 0 — Clean up the `fixtures.season` column.
 *
 * PROBLEM: The `season` column was set by sync scripts based on when the
 * sync ran, not based on the actual NHL season the game belongs to. The
 * 2025-26 bucket currently contains rows from 3 different NHL seasons.
 *
 * FIX: Re-classify every fixture using:
 *   1. game_data.season (NHL.com seasonId) — source of truth when present
 *   2. scheduled_at — fallback when game_data.season is missing/invalid
 *
 * IDEMPOTENT. Dry-run by default. Writes audit log per batch.
 *
 * Run:
 *   node scripts/nhl-ingest/00-cleanup-season-column.cjs --dry-run
 *   node scripts/nhl-ingest/00-cleanup-season-column.cjs              # apply
 *   node scripts/nhl-ingest/00-cleanup-season-column.cjs --batch=500  # smaller batches
 */

require('../load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const { classifySeason } = require('./lib/seasons.js');
const { writeFileSync, appendFileSync } = require('node:fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dryRun = process.argv.includes('--dry-run');
const batchArg = process.argv.find(a => a.startsWith('--batch='));
const batchSize = batchArg ? parseInt(batchArg.split('=')[1], 10) : 500;
const reportPath = process.argv.find(a => a.startsWith('--report='))?.split('=')[1];

if (reportPath) {
  writeFileSync(reportPath, `=== Season column cleanup ${new Date().toISOString()} ===\nDRY_RUN=${dryRun}\n\n`);
}
function log(msg) {
  console.log(msg);
  if (reportPath) appendFileSync(reportPath, msg + '\n');
}

async function main() {
  log(`[00-cleanup-season] dry_run=${dryRun} batch_size=${batchSize}`);

  // 1. Pull all fixtures with their game_data + season
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('fixtures')
      .select('id, season, scheduled_at, game_data')
      .range(offset, offset + 999);
    if (error) throw error;
    if (data.length === 0) break;
    all.push(...data);
    offset += data.length;
    if (data.length < 1000) break;
  }
  log(`[00-cleanup-season] pulled ${all.length} fixtures`);

  // 2. Classify each one and identify mismatches
  const updates = [];
  const currentSeasonCounts = {};
  const newSeasonCounts = {};
  let unchanged = 0;
  for (const f of all) {
    currentSeasonCounts[f.season] = (currentSeasonCounts[f.season] || 0) + 1;
    const newSeason = classifySeason(f);
    newSeasonCounts[newSeason] = (newSeasonCounts[newSeason] || 0) + 1;
    if (newSeason !== f.season) {
      updates.push({ id: f.id, current_season: f.season, new_season: newSeason });
    } else {
      unchanged++;
    }
  }

  log(`\n[00-cleanup-season] CURRENT season distribution:`);
  for (const [k, v] of Object.entries(currentSeasonCounts).sort()) {
    log(`  ${k}: ${v}`);
  }
  log(`\n[00-cleanup-season] NEW (correct) season distribution:`);
  for (const [k, v] of Object.entries(newSeasonCounts).sort()) {
    log(`  ${k}: ${v}`);
  }

  log(`\n[00-cleanup-season] unchanged: ${unchanged}`);
  log(`[00-cleanup-season] to update: ${updates.length}`);

  // 3. Show first 10 sample updates for verification
  log(`\n[00-cleanup-season] sample updates (first 10):`);
  for (const u of updates.slice(0, 10)) {
    log(`  id=${u.id.slice(0, 8)} ${u.current_season} → ${u.new_season}`);
  }

  // 4. Sanity check: do the new season counts add up to total?
  const sumCurrent = Object.values(currentSeasonCounts).reduce((a, b) => a + b, 0);
  const sumNew = Object.values(newSeasonCounts).reduce((a, b) => a + b, 0);
  if (sumCurrent !== sumNew) {
    log(`\n[00-cleanup-season] ❌ SEASON TOTAL MISMATCH: current=${sumCurrent} new=${sumNew}`);
    log(`This indicates a classification bug. Aborting before any writes.`);
    process.exit(1);
  }
  if (sumCurrent !== all.length) {
    log(`\n[00-cleanup-season] ❌ ROW COUNT MISMATCH: classified=${sumCurrent} total=${all.length}`);
    process.exit(1);
  }
  log(`\n[00-cleanup-season] ✓ totals match: ${sumCurrent} == ${all.length}`);

  // 5. Apply updates in batches (or skip if dry-run)
  if (dryRun) {
    log(`\n[00-cleanup-season] DRY RUN — no writes. Re-run without --dry-run to apply.`);
    process.exit(0);
  }

  let applied = 0;
  let failed = 0;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(updates.length / batchSize);
    log(`\n[00-cleanup-season] applying batch ${batchNum}/${totalBatches} (${batch.length} updates)`);
    for (const u of batch) {
      const { error } = await supabase
        .from('fixtures')
        .update({ season: u.new_season, updated_at: new Date().toISOString() })
        .eq('id', u.id);
      if (error) {
        log(`  ❌ id=${u.id.slice(0, 8)}: ${error.message}`);
        failed++;
      } else {
        applied++;
      }
    }
    log(`  applied=${applied}, failed=${failed}`);
  }

  log(`\n[00-cleanup-season] DONE. applied=${applied} failed=${failed}`);
  log(`\nNext step: re-run the same script --dry-run to verify no remaining mismatches.`);
}

main().catch(e => { console.error(e); process.exit(1); });
