require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  // Get a sample row
  const r = await supabase.from('nhl_players').select('*').limit(1);
  if (r.data && r.data[0]) {
    console.log('Columns:', Object.keys(r.data[0]).sort().join(', '));
    console.log('Sample:', JSON.stringify(r.data[0], null, 2).slice(0, 1000));
  }
  // Try the bad row directly
  const r2 = await supabase.from('nhl_players').select('*').eq('id', 59138027).maybeSingle();
  console.log('\nMikhail Kazakevich full row:');
  console.log(JSON.stringify(r2.data, null, 2));
})();
