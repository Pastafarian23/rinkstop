const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const pat = JSON.parse(fs.readFileSync('.env', 'utf8')).pat;
const ref = 'yszheonqyyskkjoxoexk';
const SQL = "UPDATE nhl_players SET created_at = COALESCE(updated_at, now()) WHERE created_at IS NULL RETURNING id, created_at;";
(async () => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: SQL })
  });
  console.log('Status:', r.status);
  const text = await r.text();
  console.log('Body length:', text.length);
  console.log('First 500 chars:', text.slice(0, 500));
})();
