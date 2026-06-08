const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const KEY = process.env.HIGHLIGHTLY_API_KEY;
(async () => {
  const r = await fetch(`https://nhl.highlightly.net/teams`, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
  });
  const d = await r.json();
  console.log('HTTP', r.status, 'keys:', Object.keys(d));
  console.log('Total count:', d.pagination?.totalCount);
  console.log('First 2 teams:', JSON.stringify((d.data || []).slice(0, 2), null, 2));
  console.log('Last 1 team:', JSON.stringify((d.data || []).slice(-1), null, 2));
})();
