const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Get column types for both tables
  const { data: playerCol } = await supabase.rpc('exec_sql', { sql: `
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'nhl_players' AND column_name IN ('id', 'current_team_id', 'jersey_number', 'height', 'weight', 'draft_year', 'draft_pick', 'draft_round')
  `}).select?.();
  console.log('nhl_players columns:');
  console.log(playerCol);
  
  const { data: teamCol } = await supabase.rpc('exec_sql', { sql: `
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'nhl_teams' AND column_name IN ('id', 'league_id')
  `}).select?.();
  console.log('\nnhl_teams columns:');
  console.log(teamCol);
})().catch(e => console.log('RPC failed:', e.message));
