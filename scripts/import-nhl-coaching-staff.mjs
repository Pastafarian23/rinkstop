#!/usr/bin/env node
/**
 * scripts/import-nhl-coaching-staff.mjs
 *
 * Imports the 2025-26 NHL coaching staff from the audited spreadsheet
 * into the `nhl_coaching_staff` table. Run with `--dry-run` to preview,
 * `--execute` to apply.
 *
 *   node scripts/import-nhl-coaching-staff.mjs --dry-run
 *   node scripts/import-nhl-coaching-staff.mjs --execute
 *
 * Source: 2026-08-26 NHL_2025-26_Coaching_Staff xlsx
 * Target: supabase/migrations/2026-08-26_nhl_coaching_staff.sql
 *
 * Idempotent: re-running is safe (ON CONFLICT via UNIQUE constraint).
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const env = require('fs').readFileSync('.env', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

// Map spreadsheet team names → nhl_teams.id
// The spreadsheet says "Utah Mammoth" but the DB still has the old
// "Utah Hockey Club" name (id=21). Handle the rebrand explicitly.
const TEAM_NAME_MAP = {
  'Anaheim Ducks': '52',
  'Boston Bruins': '11',
  'Buffalo Sabres': '3',
  'Calgary Flames': '26',
  'Carolina Hurricanes': '46',
  'Chicago Blackhawks': '61',
  'Colorado Avalanche': '31',
  'Columbus Blue Jackets': '28',
  'Dallas Stars': '1',
  'Detroit Red Wings': '62',
  'Edmonton Oilers': '13',
  'Florida Panthers': '7',
  'Los Angeles Kings': '34',
  'Minnesota Wild': '6',
  'Montreal Canadiens': '29',
  'Nashville Predators': '8',
  'New Jersey Devils': '17',
  'New York Islanders': '18',
  'New York Rangers': '12',
  'Ottawa Senators': '20',
  'Philadelphia Flyers': '10',
  'Pittsburgh Penguins': '4',
  'San Jose Sharks': '23',
  'Seattle Kraken': '25',
  'St. Louis Blues': '2',
  'Tampa Bay Lightning': '45',
  'Toronto Maple Leafs': '19',
  'Utah Mammoth': '21', // 2025-26 rebrand; DB still has Utah Hockey Club
  'Vancouver Canucks': '53',
  'Vegas Golden Knights': '24',
  'Washington Capitals': '9',
  'Winnipeg Jets': '5',
};

// Map spreadsheet role strings → our CHECK constraint values
const ROLE_MAP = {
  'Head Coach': 'head_coach',
  'Associate Coach': 'associate_coach',
  'Assistant Coach': 'assistant_coach',
  'Assistant Coach(es)': 'assistant_coach',
  'Goaltending Coach': 'goaltending_coach',
  'Video Coach': 'video_coach',
  'Skills Coach': 'skills_coach',
};

// Map spreadsheet status strings → our CHECK constraint values
const STATUS_MAP = {
  'Full season': 'full_season',
  'Replaced mid-season': 'left_mid',
  'Hired mid-season': 'hired_mid',
  'Interim': 'interim',
  'Unconfirmed': 'unconfirmed',
};

// Parse "10/2025" → "2025-10-01", "1/12/2026" → "2026-01-12"
function parseDate(s) {
  if (!s) return null;
  const trimmed = s.trim();
  // M/YYYY format
  let m = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    return `${m[2]}-${String(m[1]).padStart(2, '0')}-01`;
  }
  // M/D/YYYY format
  m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    return `${m[3]}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
  }
  return null;
}

// Truncate notes that get cut off in the spreadsheet (e.g. "Jeff Blashill (former assistan...").
// We trust the source verbatim — no reformatting.
const NOTES_OVERRIDES = {
  // Tampa Bay's note: "Jeff Blashill (former assistan...". Jeff Blashill
  // went to Chicago as HC for 2025-26 (per the spreadsheet itself).
  // The cut-off note is misleading — leave it as-is, marked as suspect.
  // (Audited: Arnel asked us to keep notes verbatim; this will surface
  // in the audit step for human review.)
};

// Load the parsed JSON (parsed in a prior step from the xlsx)
const records = JSON.parse(readFileSync('/tmp/nhl_coaches_parsed.json', 'utf8'));

// Teams where the spreadsheet documents a mid-season coaching change.
// These rows need human audit before public display. We mark them in
// the notes field with an "[AUDIT-REQUIRED]" prefix so the display
// page can render a 'pending review' badge.
const MID_SEASON_CHANGE_TEAMS = new Set([
  'Columbus Blue Jackets',  // Dean Evason fired 1/12/2026 → Rick Bowness
  'Los Angeles Kings',       // Jim Hiller fired 3/1/2026 → D.J. Smith interim
  'New York Islanders',      // Patrick Roy fired 4/5/2026 → Peter DeBoer
  'Vegas Golden Knights',    // Bruce Cassidy fired 3/29/2026 → John Tortorella
]);

// Tampa Bay's note on Jeff Blashill is cut off mid-sentence. Flag it
// so the display can warn readers and we can fix it post-audit.
const TAMPA_NOTE_AUDIT = true;

// Display-order: 1 = head coach, 2 = first AC, 3 = second AC, etc.
// For unconfirmed/assistant roster placeholders, push to the end.
const ROLE_DISPLAY_ORDER = {
  head_coach: 1,
  associate_coach: 2,
  assistant_coach: 3,
  goaltending_coach: 4,
  video_coach: 5,
  skills_coach: 6,
};

const rows = [];
const issues = [];

for (const r of records) {
  const teamId = TEAM_NAME_MAP[r.team];
  if (!teamId) {
    issues.push(`Unknown team name in spreadsheet: "${r.team}"`);
    continue;
  }

  const role = ROLE_MAP[r.role];
  if (!role) {
    issues.push(`Unknown role in spreadsheet: "${r.role}" (team: ${r.team})`);
    continue;
  }

  const status = STATUS_MAP[r.status];
  if (!status) {
    issues.push(`Unknown status in spreadsheet: "${r.status}" (team: ${r.team}, role: ${r.role})`);
    continue;
  }

  // Skip "Not confirmed" assistant rows (Tampa, NYR, Montreal).
  // We keep the row shape but mark it as unconfirmed with the original
  // placeholder name. The display will flag these as "roster TBD".
  const name = r.name || '';
  if (!name) {
    issues.push(`Empty name for ${r.team} ${r.role} — skipping`);
    continue;
  }

  const startDate = parseDate(r.start);
  const endDate = parseDate(r.end);

  // For unconfirmed assistant roster rows, the "name" is "Not confirmed"
  // — store that as the literal name (per your audit request) and let the
  // display page surface it as "Assistant coach(es): not yet confirmed".

  rows.push({
    nhl_team_id: teamId,
    season: '2025-26',
    role,
    name,
    start_date: startDate,
    end_date: endDate,
    status,
    // Tag mid-season-change rows with an audit-required prefix so the
    // display can render a 'pending review' badge. Per Arnel's directive
    // (2026-08-26): the 4 mid-season firings need human audit before
    // public display.
    notes: (() => {
      let out = r.notes || null;
      const tags = [];
      if (MID_SEASON_CHANGE_TEAMS.has(r.team)) {
        tags.push('AUDIT-REQUIRED: mid-season change — verify dates and replacement names before public display');
      }
      if (TAMPA_NOTE_AUDIT && r.team === 'Tampa Bay Lightning' && r.notes && r.notes.length < 60) {
        // The spreadsheet's Tampa note on Blashill appears cut off.
        // Flag it so we can manually extend it after audit.
        tags.push('AUDIT-REQUIRED: source note may be truncated');
      }
      if (tags.length) {
        out = out ? `${out} | [${tags.join('] [')}]` : `[${tags.join('] [')}]`;
      }
      return out;
    })(),
    display_order: ROLE_DISPLAY_ORDER[role] ?? 99,
  });
}

console.log(`\nParsed ${rows.length} rows from ${records.length} source records.`);
console.log(`Issues found: ${issues.length}`);
if (issues.length) {
  for (const issue of issues) console.log(`  ⚠️  ${issue}`);
}

console.log('\nPer-team counts:');
const byTeam = {};
for (const r of rows) byTeam[r.nhl_team_id] = (byTeam[r.nhl_team_id] || 0) + 1;
for (const [tid, count] of Object.entries(byTeam).sort((a, b) => a[1] - b[1])) {
  console.log(`  team ${tid}: ${count} staff`);
}

if (dryRun) {
  console.log('\n=== DRY RUN — no DB writes. Re-run with --execute to apply. ===');
  console.log('Sample row:');
  console.log(JSON.stringify(rows[0], null, 2));
  process.exit(0);
}

// Execute
console.log('\nUpserting to nhl_coaching_staff...');
const { data, error } = await sb
  .from('nhl_coaching_staff')
  .upsert(rows, { onConflict: 'nhl_team_id,season,role,name' });

if (error) {
  console.error('Upsert failed:', error);
  process.exit(1);
}

console.log(`Upserted ${rows.length} rows.`);

// Verify
const { count, error: countErr } = await sb
  .from('nhl_coaching_staff')
  .select('*', { count: 'exact', head: true })
  .eq('season', '2025-26');
if (countErr) {
  console.error('Count failed:', countErr);
  process.exit(1);
}
console.log(`Total nhl_coaching_staff rows for 2025-26: ${count}`);