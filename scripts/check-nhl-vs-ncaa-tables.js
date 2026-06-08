// Are NCAA players properly identified in the schema? Check if there's a separate ncaa_players table
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Count by league_name
  const r1 = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).eq('league_name', 'NHL');
  const r2 = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).eq('league_name', 'NCAA');
  const r3 = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).is('league_name', null);
  console.log('nhl_players by league_name:');
  console.log('  NHL:', r1.count);
  console.log('  NCAA:', r2.count);
  console.log('  NULL:', r3.count);
  console.log('  Total:', r1.count + r2.count + r3.count);

  // Check other tables
  for (const t of ['ncaa_players', 'players', 'hockey_players', 'nhl_teams', 'ncaa_teams']) {
    const r = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (r.error) console.log(`  ${t}: ERROR ${r.error.message}`);
    else console.log(`  ${t}: ${r.count} rows`);
  }
})();
