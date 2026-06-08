// Check birth_date distribution of all NCAA-incomplete players to identify the era
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // All NCAA players missing pos or jersey
  const r = await supabase.from('nhl_players')
    .select('id,full_name,current_team_name,birth_date,updated_at')
    .eq('league_name', 'NCAA')
    .or('position_abbreviation.is.null,jersey_number.is.null');
  const rows = r.data || [];
  console.log(`NCAA-incomplete: ${rows.length}`);

  // Distribution by birth year
  const byYear = {};
  for (const p of rows) {
    const y = p.birth_date ? p.birth_date.slice(0, 4) : 'NULL';
    byYear[y] = (byYear[y] || 0) + 1;
  }
  console.log('\nBirth year distribution:');
  for (const [y, c] of Object.entries(byYear).sort()) console.log(`  ${y}: ${c}`);

  // Distribution by updated_at
  const byUpdate = {};
  for (const p of rows) {
    const d = p.updated_at ? p.updated_at.slice(0, 7) : 'NULL';
    byUpdate[d] = (byUpdate[d] || 0) + 1;
  }
  console.log('\nUpdated-at distribution (month):');
  for (const [d, c] of Object.entries(byUpdate).sort()) console.log(`  ${d}: ${c}`);

  // Sample: how many have birth_date, how many have it but are old
  const withBirth = rows.filter(p => p.birth_date).length;
  console.log(`\nWith birth_date: ${withBirth} of ${rows.length}`);
})();
