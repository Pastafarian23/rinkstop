#!/usr/bin/env node
// Execute the dedupe plan: delete 573 duplicate NHL rows.
// Strategy B: keep the 7-digit (NHL.com) row, delete the 8-digit (Highlightly) row.
// Reads /tmp/dedupe-plan.json.

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const plan = JSON.parse(fs.readFileSync('/tmp/dedupe-plan.json', 'utf8'));
  const deleteIds = plan.delete.map(x => x.id);
  console.log(`Plan says delete ${deleteIds.length} rows. Resumable — already deleted ones skipped.`);

  const DELETED_FILE = '/tmp/dedupe-deleted-ids.json';
  const alreadyDeleted = new Set(fs.existsSync(DELETED_FILE) ? JSON.parse(fs.readFileSync(DELETED_FILE, 'utf8')) : []);
  const todo = deleteIds.filter(id => !alreadyDeleted.has(id));
  console.log(`Already deleted: ${alreadyDeleted.size}. To do: ${todo.length}.`);

  let ok = 0, err = 0;
  const errs = [];
  for (let i = 0; i < todo.length; i++) {
    const id = todo[i];
    const { error } = await supabase.from('nhl_players').delete().eq('id', id);
    if (error) {
      err++;
      errs.push({ id, msg: error.message });
    } else {
      ok++;
      alreadyDeleted.add(id);
      if (alreadyDeleted.size % 50 === 0) {
        fs.writeFileSync(DELETED_FILE, JSON.stringify([...alreadyDeleted]));
        console.log(`  ${alreadyDeleted.size}/${deleteIds.length} deleted...`);
      }
    }
  }
  fs.writeFileSync(DELETED_FILE, JSON.stringify([...alreadyDeleted]));
  console.log(`\nDone. Deleted ${ok}, errors ${err}.`);
  if (errs.length) {
    console.log('First 5 errors:');
    for (const e of errs.slice(0, 5)) console.log(`  id=${e.id}: ${e.msg}`);
  }

  // Verify
  const total = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).eq('league_name', 'NHL');
  console.log(`\nNHL rows remaining: ${total.count}`);
})();
