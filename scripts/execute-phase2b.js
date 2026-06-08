const fs = require('fs');
for (const line of fs.readFileSync('.env','utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const pat = JSON.parse(fs.readFileSync('/root/.openclaw/credentials/supabase.json','utf8')).pat;
const ref = 'yszheonqyyskkjoxoexk';
const SQL = fs.readFileSync('sql/phase2b-verify-and-label.sql','utf8');
(async () => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: SQL })
  });
  console.log('Status:', r.status);
  const t = await r.text();
  console.log('Body:', t.slice(0,500));
  // Verify
  const ids = [31933742,59138927,37889357,64090907,59138027,59138972,31934102,59139002,45032,31911527,59136122,59138102,31909142,59136152,59142002,36902,37889342,59134472,49532,57782,59138147,59137247];
  const { createClient } = require('@supabase/supabase-js');
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const r2 = await s.from('nhl_players').select('id,full_name,role,was_player,is_active').in('id',ids);
  console.log('\n=== POST-UPDATE VERIFICATION ===');
  for (const p of (r2.data||[]).sort((a,b)=>a.id-b.id)) {
    console.log('  ' + p.id + ' ' + p.full_name + ' role=' + p.role + ' was_player=' + p.was_player + ' active=' + p.is_active);
  }
})();
