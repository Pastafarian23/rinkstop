require('./load-secrets.cjs');
// Find when Mikhail Kazakevich (age 50, the obvious bad row) was inserted and which script did it
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  // Get the obvious bad row with full meta
  const r = await supabase.from('nhl_players')
    .select('id,full_name,birth_date,position_abbreviation,jersey_number,height,weight,is_active,current_team_name,created_at,updated_at,source,imported_from,raw_data')
    .eq('id', 59138027)
    .maybeSingle();
  console.log('Mikhail Kazakevich (id 59138027, age 50):');
  console.log(JSON.stringify(r.data, null, 2));
  console.log();

  // Get a few more "bad" rows to confirm the source
  console.log('=== 5 obvious bad rows with timestamps ===');
  const bad = await supabase.from('nhl_players')
    .select('id,full_name,birth_date,created_at,updated_at,source,imported_from')
    .in('id', [59138027, 59138927, 31934102, 49532, 36902]);
  for (const row of (bad.data||[])) {
    console.log(`id=${row.id} ${row.full_name?.padEnd(30)} birth=${row.birth_date?.slice(0,4)} created=${row.created_at} updated=${row.updated_at?.slice(0,19)} src=${row.source||'NULL'} imported_from=${row.imported_from||'NULL'}`);
  }
  console.log();

  // Get a known-good row for comparison
  console.log('=== 5 known-good rows (Connor McDavid, etc) with timestamps ===');
  const good = await supabase.from('nhl_players')
    .select('id,full_name,birth_date,created_at,updated_at,source,imported_from')
    .in('id', [8478402, 8471679, 8477934, 8474141, 8473419]);
  for (const row of (good.data||[])) {
    console.log(`id=${row.id} ${row.full_name?.padEnd(30)} birth=${row.birth_date?.slice(0,4)} created=${row.created_at} updated=${row.updated_at?.slice(0,19)} src=${row.source||'NULL'} imported_from=${row.imported_from||'NULL'}`);
  }
  console.log();

  // Count rows by source/imported_from
  console.log('=== All distinct source/imported_from values ===');
  const all = await supabase.from('nhl_players').select('source,imported_from').limit(2000);
  const bySrc = {}, byImp = {};
  for (const r of (all.data||[])) {
    bySrc[r.source || 'NULL'] = (bySrc[r.source || 'NULL'] || 0) + 1;
    byImp[r.imported_from || 'NULL'] = (byImp[r.imported_from || 'NULL'] || 0) + 1;
  }
  console.log('source:', bySrc);
  console.log('imported_from:', byImp);
})();
