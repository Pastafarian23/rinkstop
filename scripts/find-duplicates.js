// Find all duplicate NHL players (same name + team, multiple rows)
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Get all NHL rows
  let all = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const r = await supabase.from('nhl_players')
      .select('id,full_name,position_abbreviation,jersey_number,height,weight,birth_date,is_active,current_team_abbreviation,updated_at')
      .eq('league_name', 'NHL')
      .range(offset, offset + PAGE - 1);
    all.push(...(r.data || []));
    if (!r.data || r.data.length < PAGE) break;
    offset += PAGE;
  }
  console.log(`Total NHL rows: ${all.length}`);

  // Group by (normalized name + team)
  const groups = {};
  for (const p of all) {
    const name = (p.full_name || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
    const key = `${name}|${p.current_team_abbreviation || 'NULL'}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  const dupes = Object.entries(groups).filter(([k, v]) => v.length > 1);
  console.log(`Duplicate groups: ${dupes.length}`);

  for (const [key, rows] of dupes.slice(0, 20)) {
    const [name, team] = key.split('|');
    console.log(`\n${name} @ ${team} — ${rows.length} rows:`);
    for (const r of rows) console.log(`  id=${r.id} pos=${r.position_abbreviation||'NULL'} j=${r.jersey_number||'NULL'} h=${r.height||'NULL'} w=${r.weight||'NULL'} birth=${r.birth_date||'NULL'} active=${r.is_active} updated=${r.updated_at?.slice(0,19)}`);
  }
  if (dupes.length > 20) console.log(`\n... and ${dupes.length - 20} more duplicate groups`);

  fs.writeFileSync('/tmp/duplicates.json', JSON.stringify(dupes, null, 2));
})();
