// One-shot: apply the 2026-10-14_game_indexable_batch_rpc.sql migration
// to the Supabase database via the Management API.
const fs = require('fs');
const token = JSON.parse(fs.readFileSync('/root/.openclaw/credentials/supabase.json', 'utf8')).pat;
const sql = fs.readFileSync('/root/.openclaw/workspace/rinkstop-platform/supabase/migrations/2026-10-14_game_indexable_batch_rpc.sql', 'utf-8');
console.log('SQL length:', sql.length);
(async () => {
  const res = await fetch('https://api.supabase.com/v1/projects/yszheonqyyskkjoxoexk/database/query', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  console.log('Status:', res.status);
  console.log((await res.text()).slice(0, 2000));
})();
