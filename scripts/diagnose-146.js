require('./load-secrets.cjs');
// Take the 146 "active, no match" rows and see if they exist on NHL.com under a different team
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const NHL_BASE = 'https://api-web.nhle.com/v1';
const TEAMS = ['ANA','BOS','BUF','CGY','CAR','CHI','COL','CBJ','DAL','DET','EDM','FLA','LAK','MIN','MTL','NSH','NJD','NYI','NYR','OTT','PHI','PIT','SJS','SEA','STL','TBL','TOR','UTA','VAN','VGK','WSH','WPG'];

function normalizeName(s) {
  return (s || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchRoster(abbr) {
  const r = await fetch(`${NHL_BASE}/roster/${abbr}/20252026`);
  if (!r.ok) return null;
  const d = await r.json();
  const all = [];
  for (const grp of ['forwards', 'defensemen', 'goalies']) for (const p of (d[grp] || [])) {
    all.push({ name: `${p.firstName?.default||''} ${p.lastName?.default||''}`.trim(), team: abbr, jersey: p.sweaterNumber });
  }
  return all;
}

(async () => {
  const c = JSON.parse(fs.readFileSync('/tmp/audit-classifications.json', 'utf8'));
  const suspects = c.currently_active_no_match;
  console.log(`Diagnosing ${suspects.length} "active no match" rows...`);

  // Get all NHL.com rosters
  const allNhl = [];
  for (const abbr of TEAMS) {
    const roster = await fetchRoster(abbr);
    if (roster) allNhl.push(...roster);
    await new Promise(r => setTimeout(r, 50));
  }
  console.log(`NHL.com has ${allNhl.length} total players across 32 teams`);

  // For each suspect, find a name match across ALL teams
  const foundElsewhere = [];
  const trulyMissing = [];
  for (const s of suspects) {
    const n = normalizeName(s.full_name);
    const match = allNhl.find(p => normalizeName(p.name) === n);
    if (match) foundElsewhere.push({ db: s, nhl: match });
    else trulyMissing.push(s);
  }
  console.log(`\nFound on NHL.com under different team (likely trade): ${foundElsewhere.length}`);
  console.log(`Truly missing from NHL.com: ${trulyMissing.length}`);

  console.log('\n=== First 20 "found on different team" (DB team → NHL team) ===');
  for (const f of foundElsewhere.slice(0, 20)) {
    console.log(`  ${f.db.full_name}: DB says ${f.db.current_team_abbreviation} j=${f.db.jersey_number||'NULL'} → NHL.com says ${f.nhl.team} j=${f.nhl.jersey}`);
  }

  console.log('\n=== First 30 TRULY MISSING from NHL.com (active in DB, not anywhere in NHL) ===');
  for (const m of trulyMissing.slice(0, 30)) {
    console.log(`  id=${m.id} ${m.full_name?.padEnd(30)} team=${m.current_team_abbreviation} pos=${m.position_abbreviation||'NULL'} j=${m.jersey_number||'NULL'} birth=${m.birth_date?.slice(0,4) || 'NULL'}`);
  }
  console.log(`\nTotal truly missing: ${trulyMissing.length}`);
})();
