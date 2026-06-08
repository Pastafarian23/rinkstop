const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const KEY = process.env.HIGHLIGHTLY_API_KEY;
(async () => {
  // Try without leagueName filter
  const t = await fetch(`https://nhl.highlightly.net/teams?limit=5`, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
  });
  const td = await t.json();
  console.log('Top-level keys:', Object.keys(td));
  console.log('First teams:', JSON.stringify((td.data || []).slice(0, 3), null, 2));

  // Try with offset
  const t2 = await fetch(`https://nhl.highlightly.net/teams?offset=0&limit=3`, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
  });
  const td2 = await t2.json();
  console.log('\nWith offset param:', JSON.stringify(td2).slice(0, 1000));
})();
