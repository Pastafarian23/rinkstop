const fs = require('fs');
const path = require('path');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
(async () => {
  const res = await fetch('https://nhl.highlightly.net/players/1952', {
    headers: {
      'x-rapidapi-key': process.env.HIGHLIGHTLY_API_KEY,
      'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com',
    },
  });
  console.log('Status:', res.status);
  console.log('Rate limit remaining:', res.headers.get('x-ratelimit-requests-remaining'));
  console.log('Rate limit limit:', res.headers.get('x-ratelimit-requests-limit'));
  console.log('Reset time:', res.headers.get('x-ratelimit-requests-reset'));
})();
