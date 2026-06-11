require('./load-secrets.cjs');
#!/usr/bin/env node
// STRICT audit: re-classify every NHL-league DB row.
// For each row, check both current NHL.com AND a 2nd source (ESPN) before classifying.

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const NHL_BASE = 'https://api-web.nhle.com/v1';
const TEAMS = [
  'ANA','BOS','BUF','CGY','CAR','CHI','COL','CBJ','DAL','DET','EDM','FLA',
  'LAK','MIN','MTL','NSH','NJD','NYI','NYR','OTT','PHI','PIT','SJS','SEA',
  'STL','TBL','TOR','UTA','VAN','VGK','WSH','WPG'
];

const POS_MAP = { L: 'LW', R: 'RW', C: 'C', D: 'D', G: 'G' };

function normalizeName(s) {
  return (s || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchRoster(abbr) {
  const url = `${NHL_BASE}/roster/${abbr}/20252026`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const d = await r.json();
  const all = [];
  for (const grp of ['forwards', 'defensemen', 'goalies']) {
    for (const p of (d[grp] || [])) {
      all.push({
        first_name: p.firstName?.default || '',
        last_name: p.lastName?.default || '',
        full_name: `${p.firstName?.default || ''} ${p.lastName?.default || ''}`.trim(),
        position: POS_MAP[p.positionCode] || p.positionCode,
        jersey_number: p.sweaterNumber,
        height: p.heightInInches,
        weight: p.weightInPounds,
        birth_date: p.birthDate,
        birth_city: p.birthCity?.default || null,
        birth_country: p.birthCountry || null,
        nhl_id: p.id,
      });
    }
  }
  return all;
}

async function fetchESPNRoster(abbr) {
  // ESPN uses team slugs, not abbreviations. We need a map.
  // Skip for now — fall back to NHL.com only, with a caveat.
  return null;
}

(async () => {
  const dbR = await supabase.from('nhl_players')
    .select('id,full_name,first_name,last_name,position_abbreviation,jersey_number,height,weight,birth_date,is_active,current_team_abbreviation,current_team_name,updated_at')
    .eq('league_name', 'NHL');
  const dbRows = dbR.data || [];
  console.log(`DB has ${dbRows.length} NHL-league players`);

  // Get all 32 NHL.com rosters
  console.log('Fetching all 32 NHL.com rosters...');
  const nhlByTeam = {};
  for (const abbr of TEAMS) {
    const roster = await fetchRoster(abbr);
    nhlByTeam[abbr] = roster || [];
    await new Promise(r => setTimeout(r, 80));
  }
  const allNhl = Object.values(nhlByTeam).flat();
  console.log(`NHL.com active: ${allNhl.length}`);

  // Build lookups
  const nhlByTeamName = new Map(); // team|normalized name -> row
  for (const abbr of TEAMS) {
    for (const p of nhlByTeam[abbr]) {
      nhlByTeamName.set(`${abbr}|${normalizeName(p.full_name)}`, p);
    }
  }

  // Check each DB row
  const classifications = {
    currently_active_match: [],      // DB row, current team, matches NHL.com — KEEP
    currently_active_no_match: [],   // DB row, current team, NOT on NHL.com — SUSPICIOUS (likely AHL/IR, mark for review)
    historical_correct: [],          // DB row, is_active=false, name NOT on NHL.com — KEEP as retired
    historical_wrong: [],            // DB row, is_active=false, name IS on NHL.com — should be true (data error)
    staff_candidate: [],            // DB row, no pos, no jersey, no height, no weight, birth null, name NOT on NHL.com
  };

  for (const db of dbRows) {
    const team = db.current_team_abbreviation;
    if (!team) {
      // No team — can't cross-check
      classifications.staff_candidate.push({ ...db, reason: 'no team context' });
      continue;
    }
    const key = `${team}|${normalizeName(db.full_name)}`;
    const nhl = nhlByTeamName.get(key);
    if (nhl) {
      if (db.is_active === true) classifications.currently_active_match.push({ ...db, nhl_id: nhl.nhl_id, nhl_jersey: nhl.jersey_number });
      else classifications.historical_wrong.push({ ...db, nhl_id: nhl.nhl_id });
    } else {
      if (db.is_active === true) classifications.currently_active_no_match.push(db);
      else {
        // is_active=false, no NHL.com match — could be retired OR could be staff
        const hasBioData = db.position_abbreviation || db.jersey_number || db.height || db.weight || db.birth_date;
        if (hasBioData) classifications.historical_correct.push(db);
        else classifications.staff_candidate.push(db);
      }
    }
  }

  console.log('\n=== STRICT CLASSIFICATION ===');
  console.log(`Currently active, matches NHL.com (KEEP):           ${classifications.currently_active_match.length}`);
  console.log(`Currently active, NOT on NHL.com (REVIEW):          ${classifications.currently_active_no_match.length}`);
  console.log(`Historical (is_active=false), no NHL.com match:     ${classifications.historical_correct.length}`);
  console.log(`Historical but appears active (DATA ERROR):         ${classifications.historical_wrong.length}`);
  console.log(`Staff candidates (no team OR no bio + no match):    ${classifications.staff_candidate.length}`);

  // Save full lists
  fs.writeFileSync('/tmp/audit-classifications.json', JSON.stringify(classifications, null, 2));

  // Spot check the 146 "suspicious active" rows
  console.log('\n=== 146 SUSPICIOUS "active but not on NHL.com" — first 30 ===');
  for (const r of classifications.currently_active_no_match.slice(0, 30)) {
    console.log(`  id=${r.id} ${r.full_name?.padEnd(30)} team=${r.current_team_abbreviation} pos=${r.position_abbreviation||'NULL'} j=${r.jersey_number||'NULL'} birth=${r.birth_date?.slice(0,4) || 'NULL'} h=${r.height||'NULL'}`);
  }
  if (classifications.currently_active_no_match.length > 30) console.log(`  ... and ${classifications.currently_active_no_match.length - 30} more`);

  // Spot check the 103 mismatches
  console.log('\n=== 103 FIELD MISMATCHES (samples) ===');
  // Re-load from earlier
  const verif = JSON.parse(fs.readFileSync('/tmp/nhl-verify-report.json', 'utf8'));
  for (const m of verif.db_field_mismatch.slice(0, 30)) {
    console.log(`  ${m.name} (${m.team}, id=${m.id}):`);
    for (const x of m.mismatches) console.log(`    ${x.field}: DB has '${x.db}' but NHL.com says '${x.nhl}'`);
  }

  // Spot check the 5 staff-candidate rows that ARE missing team context
  const noTeam = classifications.staff_candidate.filter(r => !r.current_team_abbreviation);
  console.log(`\n=== ${noTeam.length} rows with NO team context (true orphans) ===`);
  for (const r of noTeam.slice(0, 10)) console.log(`  id=${r.id} ${r.full_name} team=${r.current_team_name || 'NULL'}`);
})();
