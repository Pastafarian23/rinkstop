const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const pat = JSON.parse(fs.readFileSync('/root/.openclaw/credentials/supabase.json', 'utf8')).pat;
const ref = 'yszheonqyyskkjoxoexk';
const SQL = fs.readFileSync('sql/phase2-fix.sql', 'utf8');
(async () => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: SQL })
  });
  console.log('Status:', r.status);
  console.log('Body:', (await r.text()).slice(0, 1000));
})();
