// Of the 4681 "done" rows, which ones actually got position_abbreviation written?
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const state = JSON.parse(fs.readFileSync('/tmp/nhl-player-backfill-state.json', 'utf8'));
  const doneIds = state.doneIds;
  console.log('doneIds count:', doneIds.length);

  // Sample 30 done IDs and check if they have data
  const sample = doneIds.slice(0, 30);
  const r = await supabase.from('nhl_players').select('id,full_name,position_abbreviation,jersey_number,birth_date,birth_place,height,weight,is_active,league_name').in('id', sample);
  console.log('\nSample of 30 "done" rows:');
  let withPos = 0, withJersey = 0, withBirth = 0;
  for (const row of r.data) {
    if (row.position_abbreviation) withPos++;
    if (row.jersey_number) withJersey++;
    if (row.birth_date) withBirth++;
    const filled = ['position_abbreviation','jersey_number','birth_date','birth_place','height','weight','is_active'].filter(f => row[f] != null).length;
    console.log(`  ${row.id} ${row.full_name?.padEnd(28)} pos=${(row.position_abbreviation||'NULL').padEnd(4)} j=${(String(row.jersey_number||"NULL")).padEnd(4)} birth=${(String(row.birth_date||"NULL")).padEnd(12)} ${filled}/7 fields filled`);
  }
  console.log(`  Sample coverage: pos=${withPos}/30, jersey=${withJersey}/30, birth=${withBirth}/30`);

  // Full count of done-IDs that lack position
  console.log('\nFull count via query...');
  // We can't pass 4681 IDs to .in() cheaply, so do chunks of 200
  let total = 0, noPos = 0, noJersey = 0, noBirth = 0;
  for (let i = 0; i < doneIds.length; i += 500) {
    const chunk = doneIds.slice(i, i + 500);
    const { data } = await supabase.from('nhl_players').select('id,position_abbreviation,jersey_number,birth_date').in('id', chunk);
    for (const row of (data || [])) {
      total++;
      if (!row.position_abbreviation) noPos++;
      if (!row.jersey_number) noJersey++;
      if (!row.birth_date) noBirth++;
    }
    process.stdout.write(`  chunk ${Math.floor(i/500)+1}/${Math.ceil(doneIds.length/500)}...\r`);
  }
  console.log(`\n  Of ${total} "done" rows: ${noPos} missing pos, ${noJersey} missing jersey, ${noBirth} missing birth_date`);
})();
