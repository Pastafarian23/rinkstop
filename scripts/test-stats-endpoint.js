const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const KEY = process.env.HIGHLIGHTLY_API_KEY;
// Try the statistics endpoint - some APIs return position there
(async () => {
  // Known McDavid id: 8478402 - try stats
  for (const id of [8478402, 8471679, 8477934, 8473419]) {
    const r = await fetch(`https://nhl.highlightly.net/players/${id}/statistics?season=2023`, {
      headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
    });
    const d = await r.json();
    console.log(`Stats for ${id} (HTTP ${r.status}):`);
    console.log(JSON.stringify(d, null, 2).slice(0, 2000));
    console.log('---');
  }
})();
