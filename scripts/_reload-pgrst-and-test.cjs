// Reload PostgREST schema cache after the new RPC was added, then
// test is_game_indexable on several fixture ids to confirm the
// SQL function agrees with the JS isGameIndexable.
const fs = require('fs');
const token = JSON.parse(fs.readFileSync('/root/.openclaw/credentials/supabase.json', 'utf8')).pat;

async function runSql(sql) {
  const res = await fetch('https://api.supabase.com/v1/projects/yszheonqyyskkjoxoexk/database/query', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return { status: res.status, body: await res.text() };
}

(async () => {
  console.log('1. Reload pgrst schema...');
  const r1 = await runSql("NOTIFY pgrst, 'reload schema'");
  console.log('   status:', r1.status, r1.body.slice(0, 100));

  // wait a moment for the cache to refresh
  await new Promise(r => setTimeout(r, 2000));

  console.log('2. Test is_game_indexable on 5 ids:');
  const ids = [
    '68c35920-11db-4be1-b6a9-17ba085edd94', // NHL completed
    '00000000-0000-0000-0000-000000000000', // bogus
  ];
  for (const id of ids) {
    const r2 = await runSql(`SELECT public.is_game_indexable('${id}'::uuid) AS result, status FROM fixtures WHERE id = '${id}'`);
    console.log(`   ${id}:`, r2.status, r2.body.slice(0, 200));
  }
})();
