// Last-ditch: try a few more endpoint shapes
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const KEY = process.env.HIGHLIGHTLY_API_KEY;
(async () => {
  const endpoints = [
    '/players?teamId=427&limit=3',
    '/players?team_id=427&limit=3',
    '/players?leagueName=NCAA&limit=3',
    '/players?league=NCAA&limit=3',
    '/lineups?teamId=427',
    '/roster?teamId=427',
  ];
  for (const ep of endpoints) {
    const r = await fetch(`https://nhl.highlightly.net${ep}`, {
      headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
    });
    const body = await r.text();
    console.log(`${ep} → HTTP ${r.status}: ${body.slice(0, 200)}`);
  }
})();
