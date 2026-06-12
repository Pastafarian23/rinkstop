#!/usr/bin/env node
/**
 * import-finland-rinks.cjs
 *
 * Imports Finland ice rinks from the Arnel-provided spreadsheet
 * (Europe_Ice_Rinks_Finland_RinkStop.xlsx) into the `rinks` table.
 *
 * Source: Arnel-supplied spreadsheet sourced from Wikipedia + LIPAS Finnish
 * Sports Facilities Register 2025.
 *
 * Fields imported (sourced from spreadsheet):
 *   - name, address, city, province_state, country='Finland'
 *   - capacity (parsed int)
 *   - league, home_team (parsed from "Liiga – Team X")
 *   - notes (from spreadsheet, including "Finland's largest arena" type notes)
 *   - source='Europe_Ice_Rinks_Finland_RinkStop.xlsx (Wikipedia + LIPAS 2025)'
 *
 * Fields NOT imported (not in source):
 *   - latitude, longitude
 *   - phone, email, website_url
 *   - ice_size, surface_type
 *   - year_opened (column has it but `rinks` schema lacks the column; stored in notes)
 *
 * Idempotent: matched by name + country. If a row with the same name (case-insensitive,
 * after stripping parenthetical aliases) exists, updates capacity/notes/source
 * when the existing row is missing those fields. Does not overwrite populated data.
 *
 * Run: node scripts/import-finland-rinks.cjs
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const XLSX_PATH = '/root/.openclaw/media/inbound/Europe_Ice_Rinks_Finland_RinkStop---e9b91299-0c7a-455b-9d53-cacb88204f9b.xlsx';
const SOURCE = 'Europe_Ice_Rinks_Finland_RinkStop.xlsx (Wikipedia + LIPAS 2025)';

/** Parse "Helsinki (Vallila), Uusimaa" → { city: 'Helsinki (Vallila)', province: 'Uusimaa' }
 *  or   "Tampere, Pirkanmaa"        → { city: 'Tampere', province: 'Pirkanmaa' } */
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

/** Parse "1997" → 1997 */
function parseYear(s) {
  if (s == null) return null;
  const n = parseInt(String(s).trim(), 10);
  if (!Number.isFinite(n) || n < 1800 || n > 2100) return null;
  return n;
}

/** Slugify a name into a URL slug. Handles åäö and trims parenthetical aliases.
 *  e.g. "Veikkaus Arena (formerly Hartwall Arena)" → "veikkaus-arena-formerly-hartwall-arena"
 *  e.g. "Tampere Ice Stadium (Hakametsä)" → "tampere-ice-stadium-hakametsa" */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/é/g, 'e')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/** Extract the rink's primary name (the part before " ("), used for matching/display.
 *  e.g. "Helsingin Jäähalli (Nordis)" → "Helsingin Jäähalli" (alt: "Nordis")
 *  e.g. "Veikkaus Arena (formerly Hartwall Arena)" → "Veikkaus Arena" (alt: "Hartwall Arena")
 *  Returns { primary, alts[] } */
function splitNameAliases(name) {
  const m = name.match(/^([^(]+?)\s*\(([^)]+)\)\s*$/);
  if (!m) return { primary: name.trim(), alts: [] };
  const primary = m[1].trim();
  const alts = m[2].split(/,|formerly|also|called|formerly known as/i).map(s => s.trim()).filter(Boolean);
  return { primary, alts };
}

/** Parse "Liiga – Jokerit (2025-26)" → { league: 'Liiga', home_team: 'Jokerit (2025-26)' } */
function splitLeagueTeam(raw) {
  if (!raw) return { league: null, home_team: null };
  const dash = raw.split(/\s*[\u2013\u2014\u2212-]\s*/); // en-dash, em-dash, minus, hyphen
  if (dash.length === 1) return { league: dash[0].trim(), home_team: null };
  return { league: dash[0].trim(), home_team: dash.slice(1).join(' - ').trim() };
}

async function main() {
  console.log(`Importing Finland rinks from ${path.basename(XLSX_PATH)}`);
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  // Skip title row + header row; data starts at row index 2.
  const dataRows = rows.slice(2).filter(r => r[0] !== '' && typeof r[0] === 'number');
  console.log(`Parsed ${dataRows.length} data rows from spreadsheet`);

  // Fetch all existing Finland rinks for matching.
  const { data: existing, error: exErr } = await sb
    .from('rinks')
    .select('id, name, slug, address, city, capacity, notes, source')
    .eq('country', 'Finland');
  if (exErr) { console.error('Fetch existing failed:', exErr); process.exit(1); }
  console.log(`Existing Finland rinks in DB: ${existing.length}`);

  const existingBySlug = new Map(existing.map(r => [r.slug, r]));
  const existingByName = new Map(existing.map(r => [r.name.toLowerCase(), r]));

  let inserted = 0, updated = 0, skipped = 0, failed = 0;
  const failures = [];

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

    // Find existing by slug, then by primary name (case-insensitive).
    let match = existingBySlug.get(slug);
    if (!match) match = existingByName.get(rawName.toLowerCase());
    // Also try matching against primary name only (in case DB has the alt name).
    if (!match) {
      const { primary } = splitNameAliases(rawName);
      match = existingByName.get(primary.toLowerCase());
    }

    const baseFields = {
      name: rawName,
      slug,
      country: 'Finland',
      address: address || null,
      city: city || null,
      province_state: province || null,
      capacity: capacity,
    };

    try {
      if (match) {
        // Update only empty/missing fields. Never overwrite.
        const patch = {};
        if (!match.address && address) patch.address = address;
        if (!match.city && city) patch.city = city;
        if (!match.province_state && province) patch.province_state = province;
        if (!match.capacity && capacity) patch.capacity = capacity;
        if (!match.notes && notes) patch.notes = notes;
        if (!match.source) patch.source = SOURCE;
        // Always overwrite slug if missing/wrong (cheap fix)
        if (!match.slug || match.slug !== slug) patch.slug = slug;
        if (Object.keys(patch).length === 0) {
          skipped++;
          continue;
        }
        const { error: upErr } = await sb.from('rinks').update(patch).eq('id', match.id);
        if (upErr) { failed++; failures.push({ name: rawName, error: upErr.message }); }
        else updated++;
      } else {
        // Insert new
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

  console.log(`\n=== Finland Import Result ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped} (no new data to add)`);
  console.log(`Failed:   ${failed}`);
  if (failures.length) {
    console.log(`\nFailures:`);
    failures.slice(0, 10).forEach(f => console.log(`  ${f.name}: ${f.error}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
