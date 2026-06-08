const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const state = JSON.parse(fs.readFileSync('/tmp/nhl-player-backfill-state.json','utf8'));
(async () => {
  const r = await supabase.from('nhl_players').select('id,full_name,position_abbreviation,jersey_number,is_active,league_name,current_team_name,first_name,last_name,height,weight,birth_date,birth_place').in('id', state.rateLimitedIds);
  console.log('5 rate-limited IDs as they exist in DB:');
  for (const row of r.data) console.log(' ', JSON.stringify(row));
  console.log('');
  console.log('Are these 5 actually present in the list endpoint?');
  for (const id of state.rateLimitedIds) {
    const res = await fetch(`https://nhl.highlightly.net/players?limit=1&search=id:${id}`, {
      headers: { 'x-rapidapi-key': process.env.HIGHLIGHTLY_API_KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
    });
    const txt = await res.text();
    console.log(`  ${id}: HTTP ${res.status} body=${txt.slice(0, 200)}`);
  }
})();
