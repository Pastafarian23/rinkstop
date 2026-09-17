#!/usr/bin/env node
/**
 * Pre-flight audit for league deprecation.
 *
 * For each candidate (deprecated, canonical) pair, count FK references in
 * every table that has a league_id column. Only pairs with ZERO references
 * on the deprecated side AND ALL references on the canonical side proceed.
 *
 * Usage: node scripts/_audit_dup_leagues.cjs
 */
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Tables that reference leagues via league_id
const TABLES_WITH_LEAGUE_ID = [
  'fixtures',
  'teams',
  'posts',
  'team_workspaces',
  'learn_progress',
  'games_cache',
  // add more as discovered
];

// Candidate (deprecated_slug, canonical_slug, canonical_name) pairs
const CANDIDATES = [
  { dep: 'khl-russia',   canon: 'khl',                   canonName: 'Kontinental Hockey League' },
  { dep: 'shl-sweden',    canon: 'shl',                   canonName: 'Swedish Hockey League' },
  { dep: 'del-germany',   canon: 'del',                   canonName: 'Deutsche Eishockey Liga' },
  { dep: 'liiga-finland', canon: 'liiga',                 canonName: 'Finnish Liiga' },
  { dep: 'sm-liiga',      canon: 'liiga',                 canonName: 'Finnish Liiga' },
  { dep: 'asia-league',                  canon: 'asia-league-ice-hockey', canonName: 'Asia League Ice Hockey' },
  { dep: 'asia-league-ice-hockey-world', canon: 'asia-league-ice-hockey', canonName: 'Asia League Ice Hockey' },
  { dep: 'echl-usa',      canon: 'echl',                  canonName: 'ECHL' },
];

async function countRows(table, leagueId) {
  try {
    const { count } = await sb.from(table).select('id', { count: 'exact', head: true }).eq('league_id', leagueId);
    return count || 0;
  } catch (e) {
    // table might not have league_id column — silent skip
    return null;
  }
}

async function getLeagueBySlug(slug) {
  const { data } = await sb.from('leagues').select('id, name, slug, is_active').eq('slug', slug).maybeSingle();
  return data;
}

(async () => {
  console.log('=== Pre-flight audit for league deprecation ===\n');
  console.log('Rule: Proceed only if deprecated league has ZERO refs in every table\n');

  const results = [];
  for (const c of CANDIDATES) {
    const dep = await getLeagueBySlug(c.dep);
    const canon = await getLeagueBySlug(c.canon);
    if (!dep) { console.log(`SKIP ${c.dep}: not found in DB`); continue; }
    if (!canon) { console.log(`ABORT ${c.dep}: canonical ${c.canon} not found in DB`); continue; }

    console.log(`\n--- Pair: ${c.dep} (DEPRECATE) → ${c.canon} (CANONICAL) ---`);
    console.log(`  deprecated id=${dep.id.slice(0,8)} name="${dep.name}" active=${dep.is_active}`);
    console.log(`  canonical   id=${canon.id.slice(0,8)} name="${canon.name}" active=${canon.is_active}`);

    let totalDepRefs = 0;
    let totalCanonRefs = 0;
    const tableResults = [];
    for (const table of TABLES_WITH_LEAGUE_ID) {
      const depRefs = await countRows(table, dep.id);
      const canonRefs = await countRows(table, canon.id);
      if (depRefs === null && canonRefs === null) continue;
      tableResults.push({ table, depRefs, canonRefs });
      if (depRefs !== null) totalDepRefs += depRefs;
      if (canonRefs !== null) totalCanonRefs += canonRefs;
    }

    console.log(`  Table references:`);
    for (const t of tableResults) {
      console.log(`    ${t.table.padEnd(20)} deprecated=${String(t.depRefs).padStart(5)} canonical=${String(t.canonRefs).padStart(5)}`);
    }
    console.log(`  TOTAL refs: deprecated=${totalDepRefs} canonical=${totalCanonRefs}`);

    const safe = totalDepRefs === 0;
    console.log(`  VERDICT: ${safe ? '✓ SAFE TO DEPRECATE' : '✗ BLOCKED — has references'}`);
    results.push({ ...c, depId: dep.id, canonId: canon.id, totalDepRefs, totalCanonRefs, safe });
  }

  console.log('\n=== Summary ===');
  console.log(`${results.filter(r => r.safe).length}/${results.length} pairs safe to deprecate:`);
  for (const r of results) {
    console.log(`  ${r.safe ? '✓' : '✗'} ${r.dep} → ${r.canon} (${r.totalDepRefs} refs on deprecated side)`);
  }
})().catch(e => { console.error(e); process.exit(1); });
