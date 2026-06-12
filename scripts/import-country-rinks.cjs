#!/usr/bin/env node
/**
 * import-country-rinks.cjs
 *
 * Generic importer for Arnel-supplied country rink spreadsheets.
 * Reads an XLSX in the same format as the Sweden/Finland/Germany files
 * (1 title row + 1 header row + N data rows + footer notes), and upserts
 * rinks into the Supabase `rinks` table.
 *
 * Match strategy (conservative — avoids over-merging):
 *   1. Exact normalized name (lowercase, åäö→a, strip parens for fallback)
 *   2. Exact normalized full address
 *   3. Slug match
 * If any of these hit, the existing row is updated (only empty fields).
 * Otherwise, a new row is inserted.
 *
 * Tags every row with `source: <xlsx filename> (<provenance>)`.
 *
 * Usage:
 *   COUNTRY=Germany SOURCE='Europe_Ice_Rinks_Germany_RinkStop.xlsx (Wikipedia + DEL/DEL2)' \
 *     node scripts/import-country-rinks.cjs /path/to/file.xlsx
 *
 * Required env (loaded via load-secrets.cjs):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const COUNTRY = process.env.COUNTRY;
const SOURCE = process.env.SOURCE;
const XLSX_PATH = process.argv[2];
if (!COUNTRY || !SOURCE || !XLSX_PATH) {
  console.error('Usage: COUNTRY=<name> SOURCE="<provenance>" node import-country-rinks.cjs <xlsx path>');
  process.exit(1);
}

/** Parse "Helsinki (Vallila), Uusimaa" → { city: 'Helsinki (Vallila)', province: 'Uusimaa' }
 *  Note: German style is "Cologne, NRW" — same parser handles it. */
function splitCityRegion(raw) {
  if (!raw) return { city: null, province: null };
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 1) return { city: parts[0], province: null };
  return { city: parts[0], province: parts.slice(1).join(', ') };
}

/** Parse "13,349" → 13349 */
function parseInt0(s) {
  if (s == null) return null;
  const n = parseInt(String(s).replace(/[,\s]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/** Slugify a name. å→a, ä→a, ö→o, é→e, ß→ss, others stripped. */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/é/g, 'e').replace(/ß/g, 'ss').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/** Normalize name for comparison: lowercase, åäö→a, strip parens content, collapse spaces. */
function normName(s) {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/é/g, 'e').replace(/ß/g, 'ss').replace(/ü/g, 'u')
    .replace(/\s*\([^)]*\)\s*/g, ' ') // strip parens content
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize address for comparison: lowercase, trim, collapse spaces. */
function normAddr(s) {
  if (!s) return '';
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Strip parenthetical aliases. e.g. "Helsingin Jäähalli (Nordis)" → "Helsingin Jäähalli" */
function stripParens(s) {
  if (!s) return s;
  return s.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Parse "Liiga – Jokerit (2025-26)" or "DEL – Kölner Haie" → { league, home_team }.
 *  Splits on en-dash, em-dash, hyphen-minus, or hyphen, but not the year-joined "2025-26". */
function splitLeagueTeam(raw) {
  if (!raw) return { league: null, home_team: null };
  const parts = raw.split(/\s*[\u2013\u2014\u2212]\s*|\s+-\s+/); // en-dash, em-dash, minus, then space-hyphen-space
  if (parts.length === 1) return { league: parts[0].trim(), home_team: null };
  return { league: parts[0].trim(), home_team: parts.slice(1).join(' - ').trim() };
}

async function main() {
  console.log(`Importing ${COUNTRY} rinks from ${path.basename(XLSX_PATH)}`);
  console.log(`Source tag: ${SOURCE}`);
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  // Skip title row + header row; data starts at row index 2.
  const dataRows = rows.slice(2).filter(r => r[0] !== '' && typeof r[0] === 'number');
  console.log(`Parsed ${dataRows.length} data rows from spreadsheet`);

  // Fetch all existing country rinks for matching.
  const { data: existing, error: exErr } = await sb
    .from('rinks')
    .select('id, name, slug, address, city, capacity, notes, source')
    .eq('country', COUNTRY);
  if (exErr) { console.error('Fetch existing failed:', exErr); process.exit(1); }
  console.log(`Existing ${COUNTRY} rinks in DB: ${existing.length}`);

  // Build index maps for matching. We only index addresses that are unique
  // AND look like real street addresses (contain a digit, suggesting a house
  // number — not just a city name like "Krefeld"). This avoids merging two
  // different rinks that share only a city-name address.
  const addrCounts = new Map();
  for (const r of existing) {
    const na = normAddr(r.address);
    if (na) addrCounts.set(na, (addrCounts.get(na) || 0) + 1);
  }
  const isStreetAddr = (a) => a && /\d/.test(a) && a.length > 8;
  const bySlug = new Map(existing.map(r => [r.slug, r]));
  const byNormName = new Map();
  const byNormAddr = new Map();
  for (const r of existing) {
    const nn = normName(r.name);
    if (nn && !byNormName.has(nn)) byNormName.set(nn, r);
    const na = normAddr(r.address);
    if (na && addrCounts.get(na) === 1 && isStreetAddr(na)) byNormAddr.set(na, r);
  }
  // Count how many addresses were disqualified
  const dupAddrCount = [...addrCounts.values()].filter(c => c > 1).length;

  let inserted = 0, updated = 0, skipped = 0, failed = 0;
  const failures = [];
  // Track names/addresses we've already matched, to avoid matching two spreadsheet
  // rows to the same existing row.
  const usedIds = new Set();

  for (const r of dataRows) {
    const [_num, rawName, address, cityRegion, capStr, leagueTeam, _year, note] = r;
    if (!rawName) { skipped++; continue; }
    const slug = slugify(rawName);
    const { city, province } = splitCityRegion(cityRegion);
    const capacity = parseInt0(capStr);
    const { league, home_team } = splitLeagueTeam(leagueTeam);
    const notesParts = [];
    if (league) notesParts.push(`League: ${league}`);
    if (home_team) notesParts.push(`Home team: ${home_team}`);
    if (note) notesParts.push(note);
    const notes = notesParts.length ? notesParts.join(' | ') : null;

    // Find existing. Match priority: slug > normalized name > normalized full address > strip-parens name.
    let match = null;
    if (bySlug.has(slug) && !usedIds.has(bySlug.get(slug).id)) {
      match = bySlug.get(slug);
    } else {
      const nn = normName(rawName);
      const candidate = byNormName.get(nn);
      if (candidate && !usedIds.has(candidate.id)) match = candidate;
    }
    if (!match) {
      const na = normAddr(address);
      const candidate = na ? byNormAddr.get(na) : null;
      if (candidate && !usedIds.has(candidate.id)) match = candidate;
    }
    if (!match) {
      // Last resort: strip parens from both spreadsheet name and existing names
      const baseIn = normName(stripParens(rawName));
      if (baseIn) {
        for (const ev of existing) {
          if (usedIds.has(ev.id)) continue;
          const baseEx = normName(stripParens(ev.name));
          if (baseEx && baseIn === baseEx) { match = ev; break; }
        }
      }
    }

    const baseFields = {
      name: rawName,
      slug,
      country: COUNTRY,
      address: address || null,
      city: city || null,
      province_state: province || null,
      capacity: capacity,
    };

    try {
      if (match) {
        usedIds.add(match.id);
        const patch = {};
        if (!match.address && address) patch.address = address;
        if (!match.city && city) patch.city = city;
        if (!match.province_state && province) patch.province_state = province;
        if (!match.capacity && capacity) patch.capacity = capacity;
        if (!match.notes && notes) patch.notes = notes;
        if (!match.source) patch.source = SOURCE;
        if (!match.slug || match.slug !== slug) patch.slug = slug;
        if (Object.keys(patch).length === 0) {
          skipped++;
          continue;
        }
        const { error: upErr } = await sb.from('rinks').update(patch).eq('id', match.id);
        if (upErr) { failed++; failures.push({ name: rawName, error: upErr.message }); }
        else updated++;
      } else {
        const { error: insErr } = await sb.from('rinks').insert({
          ...baseFields,
          notes,
          source: SOURCE,
        });
        if (insErr) { failed++; failures.push({ name: rawName, error: insErr.message }); }
        else inserted++;
      }
    } catch (e) {
      failed++; failures.push({ name: rawName, error: e.message });
    }
  }

  console.log(`\n=== ${COUNTRY} Import Result ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped} (no new data to add)`);
  console.log(`Failed:   ${failed}`);
  if (failures.length) {
    console.log(`\nFailures:`);
    failures.slice(0, 10).forEach(f => console.log(`  ${f.name}: ${f.error}`));
  }

  // Final tally
  const { count: finalCount } = await sb.from('rinks').select('id', { count: 'exact', head: true }).eq('country', COUNTRY);
  console.log(`${COUNTRY} rinks in DB: ${existing.length} -> ${finalCount}`);
}

main().catch(e => { console.error(e); process.exit(1); });
