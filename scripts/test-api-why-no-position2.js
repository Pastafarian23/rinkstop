// Test the hockey (NCAA) endpoint
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const KEY = process.env.HIGHLIGHTLY_API_KEY;
const HOCKEY_BASE = 'https://hockey.highlightly.net';

async function fetchPlayer(id) {
  const url = `${HOCKEY_BASE}/players/${id}`;
  const res = await fetch(url, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com' }
  });
  let body = await res.text();
  let data;
  try { data = JSON.parse(body); } catch { data = body; }
  return { status: res.status, data };
}

(async () => {
  const TEST_IDS = [
    { id: 30251762, name: 'Paul Guay (VGK scout)' },
    { id: 30222617, name: 'Artem Kriukov' },
    { id: 59138027, name: 'Mikhail Kazakevich' },
    { id: 62954342, name: 'Jordan Himley (AFA NCAA)' },
    { id: 37519517, name: 'Austin Block (UNH NCAA)' },
  ];
  for (const t of TEST_IDS) {
    console.log(`\n=== ${t.name} (id ${t.id}) — HOCKEY endpoint ===`);
    try {
      const r = await fetchPlayer(t.id);
      console.log('  HTTP', r.status);
      if (r.status !== 200) { console.log('  body:', String(r.data).slice(0, 300)); continue; }
      const d = Array.isArray(r.data) ? r.data[0] : r.data;
      if (!d) { console.log('  empty body'); continue; }
      console.log('  fullName:', d.fullName);
      console.log('  position:', d.position, '/', d.positionAbbreviation);
      console.log('  leagueName:', d.leagueName);
      console.log('  teamName:', d.team?.name);
      console.log('  jerseyNumber:', d.jerseyNumber);
      console.log('  birthDate:', d.birthDate, 'birthPlace:', d.birthPlace);
      console.log('  ALL KEYS:', Object.keys(d).sort().join(', '));
    } catch (e) { console.log('  ERROR:', e.message); }
  }
})();
