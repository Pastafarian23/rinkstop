// Verify which NCAA teams are actually affected, how many players, and which data is missing
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // NCAA players missing position OR jersey
  const r = await supabase
    .from('nhl_players')
    .select('id,full_name,current_team_id,current_team_name,current_team_abbreviation,position_abbreviation,jersey_number,is_active')
    .eq('league_name', 'NCAA')
    .or('position_abbreviation.is.null,jersey_number.is.null')
    .order('current_team_name');
  const rows = r.data || [];
  console.log(`NCAA players missing pos or jersey: ${rows.length}`);

  // Group by team
  const byTeam = {};
  for (const p of rows) {
    if (!byTeam[p.current_team_name]) byTeam[p.current_team_name] = { team_id: p.current_team_id, missing_pos: 0, missing_jersey: 0, total: 0, players: [] };
    byTeam[p.current_team_name].total++;
    if (!p.position_abbreviation) byTeam[p.current_team_name].missing_pos++;
    if (!p.jersey_number) byTeam[p.current_team_name].missing_jersey++;
    byTeam[p.current_team_name].players.push(p);
  }

  console.log(`\nTeams affected: ${Object.keys(byTeam).length}`);
  console.log('\nTeam | total missing | missing pos | missing jersey | team_id');
  console.log('-----|---------------|-------------|----------------|---------');
  const sorted = Object.entries(byTeam).sort((a, b) => b[1].total - a[1].total);
  for (const [name, t] of sorted) {
    console.log(`${name.padEnd(35)} | ${String(t.total).padStart(3)} | ${String(t.missing_pos).padStart(3)} | ${String(t.missing_jersey).padStart(3)} | ${t.team_id}`);
  }
})();
