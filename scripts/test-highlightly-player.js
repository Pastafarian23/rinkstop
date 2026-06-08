// Test Highlightly /players/{id} endpoint shape
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

(async () => {
  const playerId = 1952; // Bryan Berard
  const url = `https://nhl.highlightly.net/players/${playerId}`;
  console.log('Testing:', url);
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': process.env.HIGHLIGHTLY_API_KEY,
      'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com',
    },
  });
  console.log('Status:', res.status, 'Rate limit remaining:', res.headers.get('x-ratelimit-requests-remaining'));
  const data = await res.json();
  console.log('Response shape:');
  console.log(JSON.stringify(data, null, 2).slice(0, 2000));
})();
