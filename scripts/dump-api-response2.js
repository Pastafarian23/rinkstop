const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const KEY = process.env.HIGHLIGHTLY_API_KEY;
(async () => {
  // Try a few well-known players
  for (const id of [8471679, 8478402, 8477934, 8474141]) {
    const r = await fetch(`https://nhl.highlightly.net/players/${id}`, {
      headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const txt = await r.text();
    console.log(`\n=== ${id} HTTP ${r.status} (${txt.length} bytes) ===`);
    console.log(txt.slice(0, 2000));
  }
})();
