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
  // It's an array
  console.log('Is array:', Array.isArray(d));
  console.log('Length:', d.length);
  console.log('First team full:', JSON.stringify(d[0], null, 2));
  // Find a known NCAA team
  const quinnipiac = d.find(t => (t.name || t.displayName || '').includes('Quinnipiac'));
  console.log('\nQuinnipiac:', JSON.stringify(quinnipiac, null, 2));
  const yale = d.find(t => (t.name || t.displayName || '').includes('Yale'));
  console.log('\nYale:', JSON.stringify(yale, null, 2));
})();
