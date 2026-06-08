const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const total = await supabase.from('nhl_players').select('*', { count: 'exact', head: true });
  const fields = ['position_abbreviation', 'birth_place', 'is_active', 'current_team_name', 'current_team_abbreviation', 'current_team_logo', 'league_name'];
  for (const f of fields) {
    const c = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).not(f, 'is', null);
    console.log(f + ': ' + c.count + ' / ' + total.count + ' (' + (c.count/total.count*100).toFixed(1) + '%)');
  }
  // Sample with all fields
  const { data: sample } = await supabase
    .from('nhl_players')
    .select('*')
    .not('birth_place', 'is', null)
    .not('position_abbreviation', 'is', null)
    .limit(3);
  console.log('\nSample players:');
  for (const p of sample) {
    console.log(' ', p.full_name, '|', p.position + '(' + p.position_abbreviation + ')', '|', p.current_team_name, p.current_team_abbreviation, '|', p.birth_place, '|', p.is_active ? 'active' : 'inactive');
  }
})();
