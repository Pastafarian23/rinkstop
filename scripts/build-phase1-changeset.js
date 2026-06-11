require('./load-secrets.cjs');
#!/usr/bin/env node
// Build the complete Phase 1 changeset:
// 1. Update 103 field mismatches
// 2. Flip 2 retired-but-actually-active rows
// 3. Import 630 missing active NHL players
// 4. Present (no write) 100 suspicious rows + staff list
// FIXED: normalize team abbreviations to NHL.com format before matching

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const NHL_BASE = 'https://api-web.nhle.com/v1';
const POS_MAP = { L: 'LW', R: 'RW', C: 'C', D: 'D', G: 'G' };

// Map of all known DB team-abbrev aliases to the canonical NHL.com abbrev
const TEAM_ALIAS = {
  NJ: 'NJD', SJS: 'SJS', SJ: 'SJS', LA: 'LAK', TB: 'TBL',
  UTAH: 'UTA', UT: 'UTA', UTA: 'UTA', MON: 'MTL', PHI: 'PHI',
  CLB: 'CBJ', PHO: 'UTA', ARI: 'UTA', VEG: 'VGK', NAS: 'NSH',
};

const TEAMS = [
  'ANA','BOS','BUF','CGY','CAR','CHI','COL','CBJ','DAL','DET','EDM','FLA',
  'LAK','MIN','MTL','NSH','NJD','NYI','NYR','OTT','PHI','PIT','SJS','SEA',
  'STL','TBL','TOR','UTA','VAN','VGK','WSH','WPG'
];

function normalizeAbbrev(a) {
  if (!a) return null;
  const u = a.toUpperCase().trim();
  return TEAM_ALIAS[u] || u;
}

function normalizeName(s) {
  return (s || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchRoster(abbr) {
  const r = await fetch(`${NHL_BASE}/roster/${abbr}/20252026`);
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
        team_nhl_com: abbr,
      });
    }
  }
  return all;
}

(async () => {
  // Build a unified NHL.com lookup keyed by canonical abbrev + normalized name
  console.log('Fetching all 32 NHL.com rosters...');
  const nhlByTeam = {};
  for (const abbr of TEAMS) {
    const roster = await fetchRoster(abbr);
    nhlByTeam[abbr] = roster || [];
    await new Promise(r => setTimeout(r, 80));
  }
  const allNhl = Object.values(nhlByTeam).flat();
  console.log(`NHL.com active players: ${allNhl.length}`);

  const nhlLookup = new Map();
  for (const team of TEAMS) {
    for (const p of nhlByTeam[team]) {
      nhlLookup.set(`${team}|${normalizeName(p.full_name)}`, p);
    }
  }

  // Get all DB NHL rows
  const dbR = await supabase.from('nhl_players')
    .select('id,full_name,first_name,last_name,position_abbreviation,jersey_number,height,weight,birth_date,is_active,current_team_abbreviation,current_team_name,updated_at')
    .eq('league_name', 'NHL');
  const dbRows = dbR.data || [];
  console.log(`DB NHL rows: ${dbRows.length}`);

  // Classify every row
  const changeset = {
    field_mismatch_updates: [],     // UPDATE these rows with correct data
    is_active_flips: [],            // Flip is_active false->true
    staff_candidates: [],           // Review only — likely staff
    suspicious_active: [],          // Review only — likely bad data
  };

  for (const db of dbRows) {
    const dbTeam = normalizeAbbrev(db.current_team_abbreviation);
    if (!dbTeam) {
      changeset.staff_candidates.push({ ...db, reason: 'no team context' });
      continue;
    }
    const key = `${dbTeam}|${normalizeName(db.full_name)}`;
    const nhl = nhlLookup.get(key);

    if (!nhl) {
      // DB has player that NHL.com doesn't list at the claimed team
      if (db.is_active === true) changeset.suspicious_active.push(db);
      else {
        // is_active=false + no NHL match
        // Could be retired or staff. Heuristic: no bio data = likely staff
        const hasBio = db.position_abbreviation || db.jersey_number || db.height || db.weight || db.birth_date;
        if (!hasBio) changeset.staff_candidates.push({ ...db, reason: 'no bio, not on NHL.com' });
      }
      continue;
    }

    // Found on NHL.com. Compare fields.
    const mismatches = [];
    const update = { id: db.id, name: db.full_name, team: dbTeam, changes: {} };

    if (nhl.position && db.position_abbreviation !== nhl.position) {
      update.changes.position_abbreviation = nhl.position;
      mismatches.push('position');
    }
    if (nhl.jersey_number != null && String(db.jersey_number || '') !== String(nhl.jersey_number)) {
      update.changes.jersey_number = nhl.jersey_number;
      mismatches.push('jersey');
    }
    if (nhl.height != null && db.height !== nhl.height) {
      update.changes.height = nhl.height;
      mismatches.push('height');
    }
    if (nhl.weight != null && db.weight !== nhl.weight) {
      update.changes.weight = nhl.weight;
      mismatches.push('weight');
    }
    if (nhl.birth_date && db.birth_date !== nhl.birth_date) {
      update.changes.birth_date = nhl.birth_date;
      mismatches.push('birth_date');
    }
    if (mismatches.length > 0) {
      changeset.field_mismatch_updates.push(update);
    }

    // Check is_active
    if (db.is_active === false && nhl) {
      // DB says retired but NHL.com has them active — flip
      changeset.is_active_flips.push({ id: db.id, name: db.full_name, team: dbTeam });
    }
  }

  // Build the 630 imports: NHL.com players NOT in DB at all
  const dbByKey = new Set();
  for (const db of dbRows) {
    const k = `${normalizeAbbrev(db.current_team_abbreviation)}|${normalizeName(db.full_name)}`;
    dbByKey.add(k);
  }
  const imports = [];
  for (const team of TEAMS) {
    for (const p of nhlByTeam[team]) {
      const k = `${team}|${normalizeName(p.full_name)}`;
      if (!dbByKey.has(k)) {
        imports.push(p);
      }
    }
  }
  console.log(`\n=== CHANGESET ===`);
  console.log(`Field mismatch updates:  ${changeset.field_mismatch_updates.length}`);
  console.log(`is_active flips:         ${changeset.is_active_flips.length}`);
  console.log(`Imports (missing):       ${imports.length}`);
  console.log(`Staff candidates:        ${changeset.staff_candidates.length} (REVIEW ONLY)`);
  console.log(`Suspicious active rows:  ${changeset.suspicious_active.length} (REVIEW ONLY)`);

  // Save the full changeset
  fs.writeFileSync('/tmp/phase1-changeset.json', JSON.stringify({ ...changeset, imports }, null, 2));
  console.log('\nSaved to /tmp/phase1-changeset.json');

  // Also output sample tables for human review
  console.log('\n=== Sample 20 field mismatch updates ===');
  for (const u of changeset.field_mismatch_updates.slice(0, 20)) {
    console.log(`  id=${u.id} ${u.name.padEnd(30)} (${u.team}): ${JSON.stringify(u.changes)}`);
  }

  console.log('\n=== is_active flips ===');
  for (const f of changeset.is_active_flips) {
    console.log(`  id=${f.id} ${f.name.padEnd(30)} (${f.team}) — set is_active=true`);
  }

  console.log('\n=== Staff candidates (REVIEW) — first 20 ===');
  for (const s of changeset.staff_candidates.slice(0, 20)) {
    console.log(`  id=${s.id} ${(s.full_name||'').padEnd(30)} team=${s.current_team_abbreviation||'NULL'} reason=${s.reason||''} pos=${s.position_abbreviation||'NULL'} j=${s.jersey_number||'NULL'} birth=${(s.birth_date||'').slice(0,4)||'NULL'}`);
  }

  console.log('\n=== Suspicious active rows (REVIEW) — first 30 ===');
  for (const s of changeset.suspicious_active.slice(0, 30)) {
    console.log(`  id=${s.id} ${(s.full_name||'').padEnd(30)} team=${s.current_team_abbreviation} pos=${s.position_abbreviation||'NULL'} j=${s.jersey_number||'NULL'} birth=${(s.birth_date||'').slice(0,4)||'NULL'}`);
  }
})();
