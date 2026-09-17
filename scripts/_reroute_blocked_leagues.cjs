#!/usr/bin/env node
/**
 * Re-route FK references from deprecated → canonical league_id, then
 * deprecate the empty row. Safe because the canonical has all the
 * data and the deprecated has only the references we're moving.
 *
 * Three pairs:
 *   khl-russia           → khl            (14 refs)
 *   liiga-finland        → liiga          (34 refs)
 *   asia-league-ice-hockey-world → asia-league-ice-hockey (608 refs)
 *
 * Each pair is a separate step with its own verification. If anything
 * looks wrong, STOP and surface.
 *
 * Usage: node scripts/_reroute_blocked_leagues.cjs [--dry-run] [--pair=<khl|liiga|asia>]
 */
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');
const PAIR_ARG = process.argv.find(a => a.startsWith('--pair='));
const PAIR = PAIR_ARG ? PAIR_ARG.split('=')[1] : null;

const PAIRS = [
  {
    name: 'khl',
    depSlug: 'khl-russia',
    canonSlug: 'khl',
    tables: ['teams', 'team_workspaces'],
  },
  {
    name: 'liiga',
    depSlug: 'liiga-finland',
    canonSlug: 'liiga',
    tables: ['teams', 'team_workspaces'],
  },
  {
    name: 'asia',
    depSlug: 'asia-league-ice-hockey-world',
    canonSlug: 'asia-league-ice-hockey',
    tables: ['teams', 'team_workspaces'],
  },
];

async function reroute(pair) {
  const { data: dep } = await sb.from('leagues').select('id, name, slug, is_active').eq('slug', pair.depSlug).maybeSingle();
  const { data: canon } = await sb.from('leagues').select('id, name, slug, is_active').eq('slug', pair.canonSlug).maybeSingle();
  if (!dep || !canon) throw new Error(`${pair.name}: leagues not found`);

  console.log(`\n=== Pair: ${pair.name} ===`);
  console.log(`  deprecated: id=${dep.id.slice(0,8)} slug=${dep.slug} (${dep.name})`);
  console.log(`  canonical:  id=${canon.id.slice(0,8)} slug=${canon.slug} (${canon.name})`);

  // Step 1: count refs
  console.log(`\n  Counting refs before reroute...`);
  let totalReroute = 0;
  for (const table of pair.tables) {
    const { count } = await sb.from(table).select('id', { count: 'exact', head: true }).eq('league_id', dep.id);
    console.log(`    ${table}: ${count} refs on deprecated side`);
    totalReroute += count || 0;
  }
  console.log(`  TOTAL: ${totalReroute} refs to reroute`);

  if (DRY_RUN) {
    console.log(`  [DRY RUN] would reroute ${totalReroute} refs to canonical, then set deprecated is_active=false`);
    return;
  }

  if (totalReroute === 0) {
    console.log(`  No refs to reroute. Just deprecating the row.`);
  } else {
    // Step 2: reroute refs
    console.log(`  Rerouting refs...`);
    for (const table of pair.tables) {
      const { error, count } = await sb.from(table).update({ league_id: canon.id }).eq('league_id', dep.id);
      if (error) {
        console.log(`    ✗ ${table}: ${error.message}`);
        throw new Error('Reroute failed — STOPPING');
      }
      console.log(`    ✓ ${table}: rerouted to canonical`);
    }
  }

  // Step 3: verify
  console.log(`  Verifying...`);
  let totalDep = 0;
  for (const table of pair.tables) {
    const { count } = await sb.from(table).select('id', { count: 'exact', head: true }).eq('league_id', dep.id);
    totalDep += count || 0;
  }
  if (totalDep > 0) {
    throw new Error(`After reroute, ${totalDep} refs still on deprecated side — STOPPING`);
  }
  console.log(`  ✓ deprecated side has 0 refs`);

  let totalCanon = 0;
  for (const table of pair.tables) {
    const { count } = await sb.from(table).select('id', { count: 'exact', head: true }).eq('league_id', canon.id);
    totalCanon += count || 0;
  }
  console.log(`  ✓ canonical side has ${totalCanon} refs total`);

  // Step 4: deprecate the empty row
  const { error: depError } = await sb.from('leagues').update({
    is_active: false,
    updated_at: new Date().toISOString(),
  }).eq('id', dep.id);
  if (depError) {
    console.log(`  ✗ deprecation failed: ${depError.message}`);
    throw new Error('Deprecation failed');
  }
  console.log(`  ✓ deprecated: is_active=false`);
}

(async () => {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Rerouting and deprecating blocked league pairs\n`);
  const pairs = PAIR ? PAIRS.filter(p => p.name === PAIR) : PAIRS;
  for (const p of pairs) {
    await reroute(p);
  }
  console.log(PAIR ? `\n${PAIR} done.` : '\nAll pairs done.');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
