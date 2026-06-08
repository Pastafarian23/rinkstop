const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const KEY = process.env.HIGHLIGHTLY_API_KEY;
(async () => {
  const t = await fetch(`https://nhl.highlightly.net/teams?leagueName=ECAC&limit=3`, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
  });
  const td = await t.json();
  console.log('Raw teams response:', JSON.stringify(td).slice(0, 1500));
  const teams = td.data || td;
  if (!Array.isArray(teams) || teams.length === 0) { console.log('No teams'); return; }
  const teamId = teams[0].id;
  console.log(`\nFetching roster for team ${teamId} (${teams[0].name})...`);
  const r = await fetch(`https://nhl.highlightly.net/players?teamId=${teamId}&limit=5`, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
  });
  const rd = await r.json();
  console.log('Roster:', JSON.stringify(rd, null, 2).slice(0, 3000));
})();
