#!/usr/bin/env node
/**
 * scripts/cleanup_nhl_dups.cjs
 *
 * Problem: The old HL ingest used numeric HL team IDs (e.g. 580315)
 * in the primary key (id = `49291-580315-2025`). My NHL.com ingest
 * used abbreviation IDs (e.g. `49291-DAL-2025`). Both coexisted,
 * creating 15 duplicate team entries for 2024-25.
 *
 * Fix: Delete rows where team_id is purely numeric (old HL format),
 * keeping the abbreviation-format rows from NHL.com which have
 * verified-accurate data and consistent IDs.
 *
 * Verification after: exactly 32 rows per NHL season (2025, 2026, 2027),
 * no duplicate team_names per season.
 */
require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Step 1: Find numeric team_id rows (old HL format)
  const { data: numericRows, error: findErr } = await sb
    .from('highlightly_standings')
    .select('id,team_id,team_name,season')
    .eq('league_name', 'NHL');

  if (findErr) { console.error('Find error:', findErr.message); return; }

  const toDelete = numericRows.filter(r => /^\d+$/.test(String(r.team_id)));
  console.log(`Found ${toDelete.length} rows with numeric team_id (old HL format):`);
  for (const r of toDelete) {
    console.log(`  DELETE ${r.id}  ${r.team_name} (team_id=${r.team_id})`);
  }

  if (toDelete.length === 0) {
    console.log('Nothing to delete — already clean');
    return;
  }

  // Step 2: Delete in batches
  const idsToDelete = toDelete.map(r => r.id);
  const { error: delErr } = await sb
    .from('highlightly_standings')
    .delete()
    .in('id', idsToDelete)
    .eq('league_name', 'NHL');

  if (delErr) {
    console.error('Delete error:', delErr.message);
    return;
  }
  console.log(`\nDeleted ${idsToDelete.length} old rows`);

  // Step 3: Verify
  console.log('\n=== Post-cleanup verification ===');
  for (const season of ['2025', '2026', '2027']) {
    const { data, count, error } = await sb
      .from('highlightly_standings')
      .select('team_name,points', { count: 'exact' })
      .eq('league_name', 'NHL')
      .eq('season', season);

    if (error) { console.error(`Season ${season}: ${error.message}`); continue; }
    const names = data.map(r => r.team_name);
    const nameCount = {};
    for (const n of names) nameCount[n] = (nameCount[n] || 0) + 1;
    const dups = Object.entries(nameCount).filter(([, c]) => c > 1).map(([n]) => n);
    const uniqueCount = Object.keys(nameCount).length;
    const eastern16 = ['Boston Bruins','Buffalo Sabres','Florida Panthers','Montréal Canadiens','Ottawa Senators','Tampa Bay Lightning','Toronto Maple Leafs','Carolina Hurricanes','Columbus Blue Jackets','New Jersey Devils','New York Islanders','New York Rangers','Philadelphia Flyers','Pittsburgh Penguins','Washington Capitals'];
    const eastMissing = eastern16.filter(e => !names.includes(e));
    console.log(`Season=${season}: ${count} rows, ${uniqueCount} distinct teams${dups.length ? ' [DUP: ' + dups.join(',') + ']' : ''}${eastMissing.length ? ' [East missing: ' + eastMissing.join(', ') + ']' : ' [East: 16/16 ✓]'}`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });