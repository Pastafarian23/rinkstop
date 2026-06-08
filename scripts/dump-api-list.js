const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const KEY = process.env.HIGHLIGHTLY_API_KEY;
(async () => {
  // List call
  const r = await fetch(`https://nhl.highlightly.net/players?limit=2`, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  const txt = await r.text();
  console.log(`HTTP ${r.status} (${txt.length} bytes)`);
  console.log(txt.slice(0, 3000));
})();
