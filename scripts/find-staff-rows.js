require('./load-secrets.cjs');
// Find NHL rows that look like coaches/scouts/staff (not active players)
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 1. NHL players where is_active is false, OR height/weight/birth looks like staff
  console.log('=== NHL players with is_active=false ===');
  const inactive = await supabase.from('nhl_players')
    .select('id,full_name,is_active,current_team_name,position_abbreviation,jersey_number,birth_date,height,weight')
    .eq('league_name', 'NHL')
    .eq('is_active', false);
  console.log(`Count: ${inactive.data?.length || 0}`);
  for (const p of (inactive.data || []).slice(0, 30)) {
    console.log(`  id=${p.id} ${p.full_name?.padEnd(28)} team=${p.current_team_name?.padEnd(25)} pos=${p.position_abbreviation||'NULL'} j=${p.jersey_number||'NULL'} birth=${p.birth_date||'NULL'}`);
  }
  if ((inactive.data || []).length > 30) console.log(`  ... and ${inactive.data.length - 30} more`);

  // 2. Specifically the ones I flagged earlier as likely staff (Paul Guay, Peter Laviolette, Art Wiebe, Colin O'Hara, Saku Salminen, Ben Johnson)
  console.log('\n=== The 6 "suspected staff" NHL players (NHL league, missing pos, no NCAA flag) ===');
  const suspects = ['Paul Guay', 'Peter Laviolette', 'Art Wiebe', "Colin O'Hara", 'Saku Salminen', 'Ben Johnson'];
  for (const name of suspects) {
    const r = await supabase.from('nhl_players').select('id,full_name,is_active,current_team_name,position_abbreviation,jersey_number,birth_date,height,weight,league_name').eq('league_name', 'NHL').ilike('full_name', name);
    for (const p of (r.data || [])) console.log(`  id=${p.id} ${p.full_name} | team=${p.current_team_name} (${p.current_team_abbreviation || 'NULL'}) | active=${p.is_active} | pos=${p.position_abbreviation||'NULL'} | j=${p.jersey_number||'NULL'} | birth=${p.birth_date||'NULL'}`);
  }

  // 3. ALL NHL league rows with no position AND no jersey (not just the 6 I cited)
  console.log('\n=== ALL NHL rows with position_abbreviation IS NULL OR jersey_number IS NULL ===');
  const r = await supabase.from('nhl_players')
    .select('id,full_name,is_active,current_team_name,position_abbreviation,jersey_number,birth_date,height,weight,updated_at')
    .eq('league_name', 'NHL')
    .or('position_abbreviation.is.null,jersey_number.is.null')
    .order('full_name');
  const nhlGaps = r.data || [];
  console.log(`Total NHL-incomplete: ${nhlGaps.length}`);
  for (const p of nhlGaps) {
    console.log(`  id=${p.id} ${p.full_name?.padEnd(28)} team=${(p.current_team_name || '').padEnd(25)} active=${p.is_active} pos=${p.position_abbreviation||'NULL'} j=${p.jersey_number||'NULL'} birth=${p.birth_date||'NULL'}`);
  }

  // 4. Schema check: does the table have any 'role' or 'category' column?
  console.log('\n=== Schema check (column names) ===');
  // We can't query information_schema easily via PostgREST, but we can do a sample select with all columns
  const sample = await supabase.from('nhl_players').select('*').limit(1);
  if (sample.data && sample.data[0]) {
    console.log('Columns in nhl_players:', Object.keys(sample.data[0]).sort().join(', '));
  }
})();
