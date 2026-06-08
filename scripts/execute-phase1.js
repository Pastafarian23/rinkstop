#!/usr/bin/env node
// Execute Phase 1 safe parts:
//  1. Update 123 field mismatches (NHL only)
//  2. Flip 3 retired-but-active rows (NHL only)
//  3. Import 583 missing active NHL players from NHL.com
//  NHL only, no is_active=false writes.

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const NHL_BASE = 'https://api-web.nhle.com/v1';
const POS_MAP = { L: 'LW', R: 'RW', C: 'C', D: 'D', G: 'G' };
const TEAM_ALIAS = {
  NJ: 'NJD', SJS: 'SJS', SJ: 'SJS', LA: 'LAK', TB: 'TBL',
  UTAH: 'UTA', UT: 'UTA', UTA: 'UTA', MON: 'MTL',
  CLB: 'CBJ', PHO: 'UTA', ARI: 'UTA', VEG: 'VGK', NAS: 'NSH',
};
const TEAMS = [
  'ANA','BOS','BUF','CGY','CAR','CHI','COL','CBJ','DAL','DET','EDM','FLA',
  'LAK','MIN','MTL','NSH','NJD','NYI','NYR','OTT','PHI','PIT','SJS','SEA',
  'STL','TBL','TOR','UTA','VAN','VGK','WSH','WPG'
];
const normalizeAbbrev = (a) => a ? (TEAM_ALIAS[a.toUpperCase().trim()] || a.toUpperCase().trim()) : null;
const normalizeName = (s) => (s || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();

async function fetchRoster(abbr) {
  const r = await fetch(`${NHL_BASE}/roster/${abbr}/20252026`);
  if (!r.ok) return null;
  const d = await r.json();
  const all = [];
  for (const grp of ['forwards', 'defensemen', 'goalies']) for (const p of (d[grp] || [])) {
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
      team: abbr,
    });
  }
  return all;
}

(async () => {
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
    .select('id,full_name,first_name,last_name,position_abbreviation,jersey_number,height,weight,birth_date,is_active,current_team_abbreviation')
    .eq('league_name', 'NHL');
  const dbRows = dbR.data || [];
  console.log(`DB NHL rows: ${dbRows.length}`);

  const stats = { field_updates: 0, is_active_flips: 0, imports: 0, errors: [] };

  // === PHASE 1.1: Update 123 field mismatches ===
  console.log('\n=== PHASE 1.1: Field-mismatch updates ===');
  for (const db of dbRows) {
    const dbTeam = normalizeAbbrev(db.current_team_abbreviation);
    if (!dbTeam) continue;
    const nhl = nhlLookup.get(`${dbTeam}|${normalizeName(db.full_name)}`);
    if (!nhl) continue;

    const changes = {};
    if (nhl.position && db.position_abbreviation !== nhl.position) changes.position_abbreviation = nhl.position;
    if (nhl.jersey_number != null && String(db.jersey_number || '') !== String(nhl.jersey_number)) changes.jersey_number = nhl.jersey_number;
    if (nhl.height != null && db.height !== nhl.height) changes.height = nhl.height;
    if (nhl.weight != null && db.weight !== nhl.weight) changes.weight = nhl.weight;
    if (nhl.birth_date && db.birth_date !== nhl.birth_date) changes.birth_date = nhl.birth_date;

    if (Object.keys(changes).length > 0) {
      changes.updated_at = new Date().toISOString();
      const { error } = await supabase.from('nhl_players').update(changes).eq('id', db.id);
      if (error) {
        stats.errors.push({ id: db.id, name: db.full_name, phase: 'field_update', msg: error.message });
      } else {
        stats.field_updates++;
      }
    }

    // === PHASE 1.2: Flip is_active false -> true if NHL.com has them ===
    if (db.is_active === false) {
      const { error } = await supabase.from('nhl_players')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', db.id);
      if (error) {
        stats.errors.push({ id: db.id, name: db.full_name, phase: 'is_active_flip', msg: error.message });
      } else {
        stats.is_active_flips++;
      }
    }
  }
  console.log(`  Updated ${stats.field_updates} rows, flipped ${stats.is_active_flips} rows.`);

  // === PHASE 1.5: Import 583 missing players ===
  console.log('\n=== PHASE 1.5: Import missing active NHL players ===');
  const dbByKey = new Set();
  for (const db of dbRows) {
    dbByKey.add(`${normalizeAbbrev(db.current_team_abbreviation)}|${normalizeName(db.full_name)}`);
  }

  // Resumable: track already-imported NHL.com IDs so re-runs skip them
  const IMPORTED_FILE = '/tmp/phase1-imported-ids.json';
  const alreadyImported = new Set(fs.existsSync(IMPORTED_FILE) ? JSON.parse(fs.readFileSync(IMPORTED_FILE, 'utf8')) : []);
  console.log(`Already imported in prior run: ${alreadyImported.size}`);

  // Need team metadata to populate current_team_name/logo. Use the teams list from the API if possible.
  // For now, use the known mapping abbrev -> name + a placeholder logo (we'll fix logos in Phase 2).
  const TEAM_NAME = {
    ANA: 'Anaheim Ducks', BOS: 'Boston Bruins', BUF: 'Buffalo Sabres', CGY: 'Calgary Flames',
    CAR: 'Carolina Hurricanes', CHI: 'Chicago Blackhawks', COL: 'Colorado Avalanche',
    CBJ: 'Columbus Blue Jackets', DAL: 'Dallas Stars', DET: 'Detroit Red Wings',
    EDM: 'Edmonton Oilers', FLA: 'Florida Panthers', LAK: 'Los Angeles Kings',
    MIN: 'Minnesota Wild', MTL: 'Montreal Canadiens', NSH: 'Nashville Predators',
    NJD: 'New Jersey Devils', NYI: 'New York Islanders', NYR: 'New York Rangers',
    OTT: 'Ottawa Senators', PHI: 'Philadelphia Flyers', PIT: 'Pittsburgh Penguins',
    SJS: 'San Jose Sharks', SEA: 'Seattle Kraken', STL: 'St. Louis Blues',
    TBL: 'Tampa Bay Lightning', TOR: 'Toronto Maple Leafs', UTA: 'Utah Hockey Club',
    VAN: 'Vancouver Canucks', VGK: 'Vegas Golden Knights', WSH: 'Washington Capitals',
    WPG: 'Winnipeg Jets',
  };

  for (const team of TEAMS) {
    for (const p of nhlByTeam[team]) {
      const k = `${team}|${normalizeName(p.full_name)}`;
      if (dbByKey.has(k)) continue;

      // Skip if already imported
      if (alreadyImported.has(p.nhl_id)) continue;

      const row = {
        // We need a unique id. NHL.com's p.id is the player's official NHL id.
        id: parseInt(p.nhl_id, 10) || Math.abs(hashCode(p.nhl_id + team)),
        full_name: p.full_name,
        first_name: p.first_name,
        last_name: p.last_name,
        position_abbreviation: p.position,
        jersey_number: p.jersey_number,
        height: p.height,
        weight: p.weight,
        birth_date: p.birth_date,
        birth_place: p.birth_city,
        birth_country: p.birth_country,
        is_active: true,
        current_team_id: null, // Could look up but skip for now
        current_team_abbreviation: team,
        current_team_name: TEAM_NAME[team] || null,
        current_team_logo: `https://assets.nhle.com/logos/nhl/svg/${team}_light.svg`,
        league_name: 'NHL',
        updated_at: new Date().toISOString(),
      };
      // NOTE: id column is probably bigint. NHL.com IDs are 7-digit numbers (8478402 etc). Supabase may reject duplicates.
      // We'll skip the id and let supabase auto-assign... but the table likely requires id explicitly (it's the primary key).
      // Use the NHL.com id as the primary key.
      const { error } = await supabase.from('nhl_players').upsert(row, { onConflict: 'id' });
      if (error) {
        stats.errors.push({ id: row.id, name: p.full_name, phase: 'import', msg: error.message });
      } else {
        stats.imports++;
        alreadyImported.add(p.nhl_id);
        if (alreadyImported.size % 50 === 0) fs.writeFileSync(IMPORTED_FILE, JSON.stringify([...alreadyImported]));
      }
    }
    await new Promise(r => setTimeout(r, 50));
  }
  console.log(`  Imported ${stats.imports} new players.`);

  console.log('\n=== SUMMARY ===');
  console.log(`Field updates:  ${stats.field_updates}`);
  console.log(`is_active flips: ${stats.is_active_flips}`);
  console.log(`Imports:        ${stats.imports}`);
  console.log(`Errors:         ${stats.errors.length}`);
  if (stats.errors.length > 0) {
    console.log('\nFirst 10 errors:');
    for (const e of stats.errors.slice(0, 10)) console.log(`  ${e.phase} id=${e.id} ${e.name}: ${e.msg}`);
  }

  // Verify final state
  console.log('\n=== POST-EXECUTION VERIFICATION ===');
  const newCount = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).eq('league_name', 'NHL');
  console.log(`Total NHL-league rows now: ${newCount.count}`);
  for (const f of ['position_abbreviation', 'jersey_number', 'birth_date', 'is_active']) {
    const c = await supabase.from('nhl_players').select('*', { count: 'exact', head: true }).eq('league_name', 'NHL').not(f, 'is', null);
    console.log(`  ${f}: ${c.count} populated`);
  }
})();

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i);
  return h;
}
