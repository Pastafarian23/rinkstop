require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const total = await supabase.from('nhl_players').select('*', { count: 'exact', head: true });
  const noBirthPlace = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).is('birth_place', null);
  const noPosAbbrev = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).is('position_abbreviation', null);
  const noIsActive = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).is('is_active', null);
  const noTeamName = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).is('current_team_name', null);
  const noTeamAbbr = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).is('current_team_abbreviation', null);
  const noLeague = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).is('league_name', null);
  console.log('Total:', total.count);
  console.log('Missing birth_place:', noBirthPlace.count);
  console.log('Missing position_abbreviation:', noPosAbbrev.count);
  console.log('Missing is_active:', noIsActive.count);
  console.log('Missing current_team_name:', noTeamName.count);
  console.log('Missing current_team_abbreviation:', noTeamAbbr.count);
  console.log('Missing league_name:', noLeague.count);
})();
