// Verify the actual cause of missing position_abbreviation on these players
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const KEY = process.env.HIGHLIGHTLY_API_KEY;
const NHL_BASE = 'https://nhl.highlightly.net';

// Test 3 known-NHL-incomplete (have team=VGK etc, no position):
// 30251762 Paul Guay (VGK, no pos), 31986902 Colin O'Hara (NSH, no pos), 30222617 Artem Kriukov (BUF, has pos)
const TEST_IDS = [
  { id: 30251762, name: 'Paul Guay', expect_pos: 'C' },        // VGK scout/coach, no bio
  { id: 31986902, name: "Colin O'Hara", expect_pos: 'C' },     // NSH scout
  { id: 30222617, name: 'Artem Kriukov', expect_pos: 'D' },    // BUF, has position
  { id: 59138027, name: 'Mikhail Kazakevich', expect_pos: 'C' },// PIT, has position
  { id: 62954342, name: 'Jordan Himley', expect_pos: 'C' },     // AFA (NCAA), no position in NHL API?
  { id: 37519517, name: 'Austin Block', expect_pos: 'C' },      // UNH (NCAA), no position in NHL API?
];

async function fetchPlayer(id) {
  const url = `${NHL_BASE}/players/${id}`;
  const res = await fetch(url, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
  });
  return { status: res.status, body: res.headers.get('content-type'), data: res.ok ? await res.json() : await res.text() };
}

(async () => {
  for (const t of TEST_IDS) {
    console.log(`\n=== ${t.name} (id ${t.id}, expected ${t.expect_pos}) ===`);
    try {
      const r = await fetchPlayer(t.id);
      if (r.status !== 200) {
        console.log('  HTTP', r.status, ':', String(r.data).slice(0, 200));
        continue;
      }
      const d = r.data;
      console.log('  HTTP 200');
      console.log('  fullName:', d.fullName || d.full_name);
      console.log('  position:', d.position);
      console.log('  positionAbbreviation:', d.positionAbbreviation || d.position_abbreviation);
      console.log('  leagueName:', d.leagueName || d.league_name);
      console.log('  teamName:', d.team?.name || d.currentTeam?.name);
      console.log('  jerseyNumber:', d.jerseyNumber || d.jersey_number);
      console.log('  birthDate:', d.birthDate || d.birth_date);
      console.log('  birthPlace:', d.birthPlace || d.birth_place);
      console.log('  height:', d.height, 'weight:', d.weight);
      // List ALL top-level keys
      console.log('  ALL KEYS:', Object.keys(d).sort().join(', '));
    } catch (e) {
      console.log('  ERROR:', e.message);
    }
  }
})();
