require('./load-secrets.cjs');
// Pick a known-good NHL player from DB and see what the API actually returns
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const KEY = process.env.HIGHLIGHTLY_API_KEY;
const NHL_BASE = 'https://nhl.highlightly.net';

(async () => {
  // Pick a few known-good NHL IDs (from the successful backfill state)
  const state = JSON.parse(fs.readFileSync('/tmp/nhl-player-backfill-state.json', 'utf8'));
  const done = state.doneIds.slice(0, 5); // first 5 successful ones
  console.log('Testing 5 done IDs from state file:', done);

  for (const id of done) {
    const r = await fetch(`${NHL_BASE}/players/${id}`, {
      headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com' }
    });
    const body = await r.text();
    let data;
    try { data = JSON.parse(body); } catch {}
    const d = Array.isArray(data) ? data[0] : data;
    if (!d) { console.log(`  ${id}: HTTP ${r.status} EMPTY (keys: ${Object.keys(data || {}).join(',')})`); continue; }
    console.log(`  ${id}: HTTP ${r.status} | ${d.fullName} | pos=${d.positionAbbreviation || d.position} | jersey=${d.jerseyNumber} | team=${d.team?.abbreviation} | birth=${d.birthDate}`);
  }
})();
