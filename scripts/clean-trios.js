const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const KEEP_IDS = [8485473, 8485366, 8483890, 8485391, 8484509];
const DELETE_IDS = [
  78104537, 79539767,   // isak posch (except 8485473)
  79539107, 79380062,   // matthew schaefer (except 8485366)
  79085672, 79539902,   // braeden bowman (except 8483890)
  79380092, 79539617,   // anton frondell (except 8485391)
  79172267, 79539707,   // josh samanski (except 8484509)
];

(async () => {
  for (const id of KEEP_IDS) {
    const r = await supabase.from('nhl_players').select('id,full_name,is_active').eq('id', id).maybeSingle();
    console.log(`KEEP  ${id}: ${r.data?.full_name} active=${r.data?.is_active}`);
  }
  for (const id of DELETE_IDS) {
    const r = await supabase.from('nhl_players').select('id,full_name,is_active').eq('id', id).maybeSingle();
    console.log(`DEL   ${id}: ${r.data?.full_name} active=${r.data?.is_active}`);
  }
  console.log('\nExecuting deletes...');
  let ok = 0, err = 0;
  for (const id of DELETE_IDS) {
    const { error } = await supabase.from('nhl_players').delete().eq('id', id);
    if (error) { err++; console.log(`  ERR ${id}: ${error.message}`); }
    else ok++;
  }
  console.log(`\nDeleted ${ok}/${DELETE_IDS.length}, errors ${err}`);

  // Final check
  const c = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).eq('league_name', 'NHL');
  console.log(`NHL rows now: ${c.count}`);
})();
