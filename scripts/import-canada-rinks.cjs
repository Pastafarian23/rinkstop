#!/usr/bin/env node
/**
 * import-canada-rinks.cjs
 *
 * Importer for the CAN_Ontario_Ice_Rinks_RinkStop.xlsx file (and any sibling
 * CAN_<Province>_Ice_Rinks_RinkStop.xlsx with the same column layout).
 *
 * Spreadsheet layout (8 cols):
 *   # | Name of Ice Rink / Arena | City | Province | Cap (Hockey) | League / Tenant | Built | Notes
 *
 * Match strategy (conservative — avoids over-merging):
 *   1. Exact normalized name (lowercase, strip parens for fallback)
 *   2. Slug match
 * If any of these hit, the existing row is updated (only empty fields).
 * Otherwise, a new row is inserted.
 *
 * Province codes: spreadsheet uses "Ontario" — we map to DB's "ON" abbreviation.
 * (probed 2026-06-15: existing Canada rinks store province_state as 2-letter codes.)
 *
 * Tags every row with `source: <xlsx filename> (Wikipedia)`.
 *
 * Usage:
 *   PROVINCE=Ontario SOURCE='CAN_Ontario_Ice_Rinks_RinkStop.xlsx (Wikipedia)' \
 *     node scripts/import-canada-rinks.cjs /path/to/file.xlsx [--dry-run] [--yes]
 *
 * Required env (loaded via load-secrets.cjs):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PROVINCE = process.env.PROVINCE; // optional — if set, used for files where all rows are one province
const COUNTRY = 'Canada';
const SOURCE = process.env.SOURCE;
const XLSX_PATH = process.argv.find(a => a.endsWith('.xlsx'));
const DRY_RUN = process.argv.includes('--dry-run') || !process.argv.includes('--yes');

if (!SOURCE || !XLSX_PATH) {
  console.error('Usage: SOURCE="<provenance>" [PROVINCE=<name>] node import-canada-rinks.cjs <xlsx path> [--dry-run] [--yes]');
  console.error('  PROVINCE is optional. If set, all rows are assumed to belong to that province.');
  console.error('  If not set, the province is read from each row\'s column D.');
  process.exit(1);
}

const PROVINCE_ABBR = {
  Ontario: 'ON', Quebec: 'QC', 'British Columbia': 'BC', Alberta: 'AB',
  Manitoba: 'MB', Saskatchewan: 'SK', 'Nova Scotia': 'NS', 'New Brunswick': 'NB',
  'Newfoundland and Labrador': 'NL', 'Prince Edward Island': 'PE',
  'Northwest Territories': 'NT', 'Northwest_Territories': 'NT', Nunavut: 'NU', Yukon: 'YT',
  Territories: null, // sentinel: rows have their own province col
};
function abbrFor(p) {
  if (p == null) return null;
  const norm = String(p).trim();
  if (PROVINCE_ABBR[norm] === null) return null; // 'Territories' = read from row
  if (!PROVINCE_ABBR[norm]) {
    console.error(`Unknown province "${p}" — add to PROVINCE_ABBR map.`);
    process.exit(1);
  }
  return PROVINCE_ABBR[norm];
}

/** Parse "13,349" or "N/A" → 13349 | null */
function parseInt0(s) {
  if (s == null) return null;
  const str = String(s).trim();
  if (str === '' || str.toUpperCase() === 'N/A') return null;
  const n = parseInt(str.replace(/[,\s]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/** Slugify a name. é→e, others stripped. */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/é/g, 'e').replace(/ß/g, 'ss').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/** Normalize name for comparison: lowercase, strip parens content, collapse spaces. */
function normName(s) {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/é/g, 'e').replace(/ß/g, 'ss').replace(/ü/g, 'u')
    .replace(/['']/g, '') // strip apostrophes
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip parenthetical aliases. e.g. "Helsingin Jäähalli (Nordis)" → "Helsingin Jäähalli" */
function stripParens(s) {
  if (!s) return s;
  return s.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Parse "NHL / NBA – Toronto Maple Leafs, Toronto Raptors" → notes string
 *  We keep the entire league/tenant string in notes rather than splitting,
 *  because the field is messy and useful as-is. */
function noteForLeague(leagueTenant) {
  if (!leagueTenant) return null;
  return `League/Tenant: ${leagueTenant}`;
}

async function main() {
  const isPerRow = PROVINCE == null || PROVINCE === 'Territories';
  const headerTag = isPerRow ? '(per-row province)' : `${COUNTRY}/${PROVINCE} (${abbrFor(PROVINCE)})`;
  console.log(`Importing ${headerTag} rinks from ${path.basename(XLSX_PATH)}`);
  console.log(`Source tag: ${SOURCE}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'REAL RUN'}`);
  console.log('');

  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  // Skip title row (0) + header row (1); data starts at row index 2.
  // Filter: numeric index column = a real data row.
  const dataRows = rows.slice(2).filter(r => r[0] !== '' && typeof r[0] === 'number' && r[1]);
  console.log(`Parsed ${dataRows.length} data rows from spreadsheet\n`);

  // Fetch existing country rinks for matching.
  const { data: existing, error: exErr } = await sb
    .from('rinks')
    .select('id, name, slug, city, capacity, notes, source, province_state')
    .eq('country', COUNTRY);
  if (exErr) { console.error('Fetch existing failed:', exErr); process.exit(1); }
  console.log(`Existing ${COUNTRY} rinks in DB: ${existing.length}`);

  // For per-row files, group existing by province. For single-province files, just filter once.
  const existingByProv = new Map();
  if (isPerRow) {
    for (const r of existing) {
      if (!existingByProv.has(r.province_state)) existingByProv.set(r.province_state, []);
      existingByProv.get(r.province_state).push(r);
    }
  } else {
    const abbr = abbrFor(PROVINCE);
    existingByProv.set(abbr, existing.filter(r => r.province_state === abbr));
  }

  let willInsert = 0, willUpdate = 0, willSkip = 0, fail = 0;
  const plan = []; // preview rows
  // Track matches already used, to avoid matching two spreadsheet rows to the same existing row.
  const usedIds = new Set();

  for (const r of dataRows) {
    const [_num, rawName, city, provinceIn, capStr, leagueTenant, built, note] = r;
    if (!rawName) { willSkip++; continue; }
    // Resolve province for this row
    const rowProvAbbr = isPerRow ? abbrFor(provinceIn) : abbrFor(PROVINCE);
    if (!rowProvAbbr) { console.error(`Row ${_num}: could not resolve province "${provinceIn}"`); fail++; continue; }
    const existingInProv = existingByProv.get(rowProvAbbr) || [];
    const bySlug = new Map(existingInProv.map(r => [r.slug, r]));
    const byNormName = new Map();
    for (const r of existingInProv) {
      const nn = normName(r.name);
      if (nn && !byNormName.has(nn)) byNormName.set(nn, r);
    }
    const slug = slugify(rawName);
    const capacity = parseInt0(capStr);
    const leagueNote = noteForLeague(leagueTenant);
    const notesParts = [];
    if (leagueNote) notesParts.push(leagueNote);
    if (built && built !== 'N/A') notesParts.push(`Built: ${built}`);
    if (note) notesParts.push(note);
    const notes = notesParts.length ? notesParts.join(' | ') : null;

    // Find existing. Match priority: slug > normalized name > strip-parens name.
    let match = null;
    let matchType = null;
    if (bySlug.has(slug) && !usedIds.has(bySlug.get(slug).id)) {
      match = bySlug.get(slug);
      matchType = 'slug';
    } else {
      const nn = normName(rawName);
      const candidate = byNormName.get(nn);
      if (candidate && !usedIds.has(candidate.id)) {
        match = candidate;
        matchType = 'name';
      }
    }
    if (!match) {
      const baseIn = normName(stripParens(rawName));
      if (baseIn) {
        for (const ev of existingInProv) {
          if (usedIds.has(ev.id)) continue;
          const baseEx = normName(stripParens(ev.name));
          if (baseEx && baseIn === baseEx) { match = ev; matchType = 'strip-parens'; break; }
        }
      }
    }

    const baseFields = {
      name: rawName,
      slug,
      country: COUNTRY,
      province_state: rowProvAbbr,
      city: city || null,
      capacity: capacity,
    };

    let action, patchOrRow, existingId = null;
    if (match) {
      usedIds.add(match.id);
      existingId = match.id;
      const patch = {};
      if (!match.city && city) patch.city = city;
      if (!match.capacity && capacity) patch.capacity = capacity;
      if (!match.notes && notes) patch.notes = notes;
      if (!match.source) patch.source = SOURCE;
      if (!match.slug || match.slug !== slug) patch.slug = slug;
      if (!match.province_state) patch.province_state = rowProvAbbr;
      if (Object.keys(patch).length === 0) {
        action = 'skip-noop';
        willSkip++;
      } else {
        action = 'update';
        patchOrRow = patch;
        willUpdate++;
      }
    } else {
      action = 'insert';
      patchOrRow = { ...baseFields, notes, source: SOURCE };
      willInsert++;
    }

    plan.push({
      row: _num,
      name: rawName,
      city,
      capacity,
      province: rowProvAbbr,
      action,
      matchType,
      existingId,
      existingName: match ? match.name : null,
      patchOrRow: action === 'update' ? patchOrRow : (action === 'insert' ? patchOrRow : null),
    });
  }

  // Print plan
  console.log(`=== ${COUNTRY} Import Plan ===\n`);
  for (const p of plan) {
    const tag = p.action === 'insert' ? '[+]' : p.action === 'update' ? '[~]' : '[=]';
    const match = p.matchType ? ` → matched by ${p.matchType} "${p.existingName}" (${p.existingId?.slice(0,8)})` : '';
    console.log(`${tag} #${p.row} ${p.name} (${p.city}, cap=${p.capacity})${match}`);
    if (p.action === 'update' && p.patchOrRow) {
      console.log(`    patch: ${JSON.stringify(p.patchOrRow)}`);
    } else if (p.action === 'insert') {
      const row = p.patchOrRow;
      console.log(`    insert: ${JSON.stringify({name: row.name, slug: row.slug, city: row.city, cap: row.capacity, notes_preview: row.notes?.slice(0,80)})}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Will insert: ${willInsert}`);
  console.log(`Will update: ${willUpdate}`);
  console.log(`Will skip:   ${willSkip} (no new data to add)`);
  console.log(`Failed:      ${fail}`);

  if (DRY_RUN) {
    console.log(`\n⚠️  DRY RUN — no DB writes. Add --yes to apply.`);
    return;
  }

  console.log(`\nApplying changes...`);
  let inserted = 0, updated = 0, skipped = 0, failed = 0;
  const failures = [];
  for (const p of plan) {
    if (p.action === 'insert') {
      const { error } = await sb.from('rinks').insert(p.patchOrRow);
      if (error) { failed++; failures.push({ name: p.name, error: error.message }); }
      else inserted++;
    } else if (p.action === 'update') {
      const { error } = await sb.from('rinks').update(p.patchOrRow).eq('id', p.existingId);
      if (error) { failed++; failures.push({ name: p.name, error: error.message }); }
      else updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n=== ${COUNTRY} Import Result ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
  if (failures.length) {
    console.log(`\nFailures:`);
    failures.slice(0, 10).forEach(f => console.log(`  ${f.name}: ${f.error}`));
  }

  // Per-province tally (per-row files) or single (one-province files)
  const provincesTouched = new Set(plan.map(p => p.province));
  for (const abbr of provincesTouched) {
    const { count: finalCount } = await sb.from('rinks').select('id', { count: 'exact', head: true }).eq('country', COUNTRY).eq('province_state', abbr);
    const wasCount = (existingByProv.get(abbr) || []).length;
    console.log(`${COUNTRY}/${abbr} rinks in DB: ${wasCount} -> ${finalCount}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
