// Find and clean up " Bench" placeholder rows
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Find bench rows
  const r1 = await supabase.from('nhl_players').select('id,full_name,current_team_name,league_name,is_active').or('full_name.ilike.% Bench%,full_name.eq.Bench');
  const benches = r1.data || [];
  console.log(`Found ${benches.length} bench placeholder rows:`);
  for (const b of benches) console.log(`  id=${b.id} name='${b.full_name}' team=${b.current_team_name} league=${b.league_name} active=${b.is_active}`);

  if (benches.length === 0) { console.log('Nothing to clean up.'); return; }

  // Soft-delete: mark is_active=false, since schema has no is_placeholder column
  // Show a confirmation prompt in output
  console.log('\nACTION: Setting is_active=false on these rows (no schema column for placeholder flag).');
  const ids = benches.map(b => b.id);
  const { data: upd, error } = await supabase
    .from('nhl_players')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .in('id', ids)
    .select('id,full_name,is_active');
  if (error) {
    console.log('  UPDATE ERROR:', error.message);
    return;
  }
  console.log(`  Updated ${upd.length} rows. is_active set to false.`);
  for (const r of upd) console.log(`    id=${r.id} name='${r.full_name}' active=${r.is_active}`);
})();
