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
  console.log('Sample of NCAA teams in API:');
  for (const t of d.filter(t => t.league === 'NCAA').slice(0, 5)) console.log(' ', t.id, t.displayName, t.abbreviation);
  // Try a roster fetch
  const yale_id = d.find(t => t.displayName?.includes('Yale') || t.name?.includes('Yale'))?.id;
  console.log('\nYale id:', yale_id);
  if (yale_id) {
    const rr = await fetch(`https://nhl.highlightly.net/players?teamId=${yale_id}&limit=3`, {
      headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
    });
    const rrd = await rr.json();
    console.log('Yale roster response keys:', Object.keys(rrd));
    console.log('First player:', JSON.stringify((rrd.data || rrd)[0], null, 2));
  }
  // Try the older 1-key shape
  console.log('\nDirect teamId param test:');
  const r2 = await fetch(`https://nhl.highlightly.net/players/${d[0].id}`, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
  });
  console.log('  HTTP', r2.status, await r2.text());
})();
