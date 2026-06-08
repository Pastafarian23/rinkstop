#!/usr/bin/env node
// VERIFY the DB against NHL.com, don't just import.
// For every NHL row in the DB with a current_team_abbreviation,
// fetch the current NHL.com roster, cross-reference, and produce a diff.

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

// Position code map (NHL.com -> our format)
const POS_MAP = { L: 'LW', R: 'RW', C: 'C', D: 'D', G: 'G' };

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
        shoots_catches: p.shootsCatches,
        birth_city: p.birthCity?.default || null,
        birth_country: p.birthCountry || null,
        nhl_id: p.id,
      });
    }
  }
  return all;
}

function normalizeName(s) {
  return (s || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

(async () => {
  const report = {
    nhl_roster_total: 0,
    db_nhl_total: 0,
    exact_match: [],
    db_row_no_nhl_match: [],     // DB has player NHL.com doesn't know (coach? scout? former?)
    nhl_row_no_db_match: [],     // NHL.com has player DB doesn't have
    db_field_mismatch: [],       // Same name, different data
  };

  // Get all DB NHL players
  const dbR = await supabase.from('nhl_players')
    .select('id,full_name,first_name,last_name,position_abbreviation,jersey_number,height,weight,birth_date,is_active,current_team_abbreviation')
    .eq('league_name', 'NHL');
  const dbRows = dbR.data || [];
  report.db_nhl_total = dbRows.length;
  console.log(`DB has ${dbRows.length} NHL-league players`);

  // Fetch NHL.com rosters for all 32 teams
  console.log('\nFetching NHL.com rosters for all 32 teams...');
  const nhlByTeam = {};
  for (const abbr of TEAMS) {
    const roster = await fetchRoster(abbr);
    nhlByTeam[abbr] = roster || [];
    report.nhl_roster_total += (roster || []).length;
    if (roster) {
      console.log(`  ${abbr}: ${roster.length} players`);
    } else {
      console.log(`  ${abbr}: FAILED`);
    }
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(`NHL.com total active players: ${report.nhl_roster_total}`);

  // Build a lookup from (team, normalized_name) -> NHL.com row
  const nhlLookup = new Map();
  for (const abbr of TEAMS) {
    for (const p of nhlByTeam[abbr]) {
      const key = `${abbr}|${normalizeName(p.full_name)}`;
      nhlLookup.set(key, p);
    }
  }

  // For each DB NHL row, look it up
  console.log('\n=== Matching DB rows against NHL.com ===');
  for (const db of dbRows) {
    if (!db.current_team_abbreviation) continue;
    const key = `${db.current_team_abbreviation}|${normalizeName(db.full_name)}`;
    const nhl = nhlLookup.get(key);
    if (!nhl) {
      report.db_row_no_nhl_match.push({
        id: db.id, name: db.full_name, team: db.current_team_abbreviation,
        is_active: db.is_active, pos: db.position_abbreviation, jersey: db.jersey_number
      });
      continue;
    }
    // Compare fields
    const mismatches = [];
    if (db.position_abbreviation && nhl.position && db.position_abbreviation !== nhl.position) {
      mismatches.push({ field: 'position', db: db.position_abbreviation, nhl: nhl.position });
    }
    if (db.jersey_number != null && nhl.jersey_number != null && String(db.jersey_number) !== String(nhl.jersey_number)) {
      mismatches.push({ field: 'jersey_number', db: db.jersey_number, nhl: nhl.jersey_number });
    }
    if (db.height != null && nhl.height != null && db.height !== nhl.height) {
      mismatches.push({ field: 'height', db: db.height, nhl: nhl.height });
    }
    if (db.weight != null && nhl.weight != null && db.weight !== nhl.weight) {
      mismatches.push({ field: 'weight', db: db.weight, nhl: nhl.weight });
    }
    if (mismatches.length > 0) {
      report.db_field_mismatch.push({ id: db.id, name: db.full_name, team: db.current_team_abbreviation, mismatches });
    } else {
      report.exact_match.push({ id: db.id, name: db.full_name, team: db.current_team_abbreviation });
    }
  }

  // For each NHL.com row, check if it exists in DB
  for (const abbr of TEAMS) {
    for (const p of nhlByTeam[abbr]) {
      const key = `${abbr}|${normalizeName(p.full_name)}`;
      // Check if any DB row matches
      const match = dbRows.find(d => d.current_team_abbreviation === abbr && normalizeName(d.full_name) === normalizeName(p.full_name));
      if (!match) {
        report.nhl_row_no_db_match.push({ name: p.full_name, team: abbr, pos: p.position, jersey: p.jersey_number });
      }
    }
  }

  console.log('\n=== REPORT ===');
  console.log(`NHL.com active players: ${report.nhl_roster_total}`);
  console.log(`DB NHL-league players:  ${report.db_nhl_total}`);
  console.log(`Exact matches:          ${report.exact_match.length}`);
  console.log(`Field mismatches:       ${report.db_field_mismatch.length}`);
  console.log(`DB rows NOT on NHL.com: ${report.db_row_no_nhl_match.length}`);
  console.log(`NHL.com rows NOT in DB: ${report.nhl_row_no_db_match.length}`);

  console.log('\n=== Field mismatches (first 30) ===');
  for (const m of report.db_field_mismatch.slice(0, 30)) {
    console.log(`  ${m.name} (${m.team}, id=${m.id}):`);
    for (const x of m.mismatches) console.log(`    ${x.field}: DB has '${x.db}' but NHL.com says '${x.nhl}'`);
  }
  if (report.db_field_mismatch.length > 30) console.log(`  ... and ${report.db_field_mismatch.length - 30} more`);

  console.log('\n=== DB rows NOT on NHL.com (first 30) ===');
  for (const r of report.db_row_no_nhl_match.slice(0, 30)) {
    console.log(`  id=${r.id} ${r.name.padEnd(30)} team=${r.team}  active=${r.is_active}  pos=${r.pos||'NULL'}  j=${r.jersey||'NULL'}`);
  }
  if (report.db_row_no_nhl_match.length > 30) console.log(`  ... and ${report.db_row_no_nhl_match.length - 30} more`);

  console.log('\n=== NHL.com rows NOT in DB (first 30) ===');
  for (const r of report.nhl_row_no_db_match.slice(0, 30)) {
    console.log(`  ${r.name.padEnd(30)} team=${r.team}  pos=${r.pos}  j=${r.jersey}`);
  }
  if (report.nhl_row_no_db_match.length > 30) console.log(`  ... and ${report.nhl_row_no_db_match.length - 30} more`);

  fs.writeFileSync('/tmp/nhl-verify-report.json', JSON.stringify(report, null, 2));
  console.log('\nFull report saved to /tmp/nhl-verify-report.json');
})();
