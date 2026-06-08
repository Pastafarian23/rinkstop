// Test if /teams/{id} returns roster (and that data has position) for NCAA teams
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const KEY = process.env.HIGHLIGHTLY_API_KEY;

// NCAA teams list to find a team id for "Quinnipiac Bobcats"
(async () => {
  // First get one NCAA team id
  const t = await fetch(`https://nhl.highlightly.net/teams?leagueName=ECAC&limit=3`, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
  });
  const td = await t.json();
  const teams = td.data || td;
  console.log('ECAC teams sample:', JSON.stringify(teams.slice(0, 3), null, 2));
  if (teams.length === 0) return;
  const teamId = teams[0].id;
  console.log(`\nFetching roster for team ${teamId} (${teams[0].name})...`);
  const r = await fetch(`https://nhl.highlightly.net/players?teamId=${teamId}&limit=5`, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
  });
  const rd = await r.json();
  console.log('Roster response shape:');
  console.log(JSON.stringify(rd, null, 2).slice(0, 2000));
})();
