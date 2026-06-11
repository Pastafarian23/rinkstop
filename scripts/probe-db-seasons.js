require('./load-secrets.cjs');
// For each of the top 10 teams, list player names + last_synced + any "season" signal
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const teams = [
    'Air Force Falcons',
    'Canisius Golden Griffins',
    'Niagara Purple Eagles',
    'UMass Lowell  River Hawks',
    'Bowling Green Falcons',
    'Colgate Raiders',
    'Merrimack Warriors',
    'Princeton Tigers',
    'Yale Bulldogs',
    'Ferris State Bulldogs'
  ];
  for (const t of teams) {
    const r = await supabase.from('nhl_players')
      .select('id,full_name,is_active,updated_at,height,weight,birth_date')
      .eq('current_team_name', t)
      .eq('league_name', 'NCAA')
      .order('full_name');
    const players = r.data || [];
    console.log(`\n${t} (${players.length} players):`);
    for (const p of players) console.log(`  id=${p.id} ${p.full_name?.padEnd(28)} h=${p.height||'NULL'} w=${p.weight||'NULL'} birth=${p.birth_date||'NULL'}`);
  }
})();
