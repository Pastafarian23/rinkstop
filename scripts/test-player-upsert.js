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
  // Just update one row to test
  const testRow = {
    id: '1952',
    full_name: 'Bryan Berard (test)',
    first_name: 'Bryan',
    last_name: 'Berard',
    position: 'Defense',
    jersey_number: '24',
    height: 73, // 6'1" in inches
    weight: 195,
    birth_date: '1977-05-03',
    nationality: 'USA',
    birth_country: 'USA',
    current_team_id: '12',
    draft_pick: 1,
    draft_year: 1995,
    draft_round: 1,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('nhl_players')
    .upsert(testRow, { onConflict: 'id' })
    .select();
  if (error) {
    console.log('ERROR:', error.message);
  } else {
    console.log('SUCCESS:', data);
  }

  // Verify it saved
  const { data: check } = await supabase
    .from('nhl_players')
    .select('*')
    .eq('id', '1952')
    .single();
  console.log('Verified:', check);
})();
