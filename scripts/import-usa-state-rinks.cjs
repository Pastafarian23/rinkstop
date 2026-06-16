#!/usr/bin/env node
/**
 * import-usa-state-rinks.cjs
 *
 * Imports USA state-level ice rink spreadsheets (1 per US state).
 * Same XLSX format as import-country-rinks.cjs but:
 *   - Province/state comes from the filename (e.g. USA_Alabama → state="AL")
 *   - Country is hardcoded to "United States"
 *   - City is the value in the "City" column (no comma-parse — USA style is
 *     "Huntsville" not "Helsinki, Uusimaa")
 *
 * State abbreviation map (lowercase xlsx filename fragment → 2-letter code):
 *   alabama → AL, alaska → AK, arizona → AZ, ... (full list below)
 *
 * Usage:
 *   STATE='Alabama' STATE_CODE='AL' \
 *     SOURCE='USA_Alabama_Ice_Rinks_RinkStop.xlsx (arena-guide.com 2025)' \
 *     node scripts/import-usa-state-rinks.cjs /path/to/file.xlsx
 *
 * Required env (loaded via load-secrets.cjs):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const STATE = process.env.STATE;          // e.g. "Alabama"
const STATE_CODE = process.env.STATE_CODE; // e.g. "AL"
const SOURCE = process.env.SOURCE;
const XLSX_PATH = process.argv[2];
if (!STATE || !STATE_CODE || !SOURCE || !XLSX_PATH) {
  console.error('Usage: STATE=<name> STATE_CODE=<2-letter> SOURCE="<provenance>" node import-usa-state-rinks.cjs <xlsx path>');
  process.exit(1);
}

const COUNTRY = 'United States';

// Reuse the dedupe logic from import-country-rinks.cjs
const normName = (s) => (s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/['']/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();
const stripParens = (s) => (s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
const normAddr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const slugify = (s) => (s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/['']/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');
const parseInt0 = (s) => { const n = parseInt(String(s || '').replace(/[^0-9]/g, ''), 10); return isNaN(n) ? null : n; };

function splitLeagueTeam(raw) {
  if (!raw) return { league: null, home_team: null };
  const trimmed = raw.trim();
  if (!trimmed) return { league: null, home_team: null };
  // "SPHL" or "Birmingham Bulls (SPHL)" or "SPHL: Birmingham Bulls"
  const m = trimmed.match(/^([A-Za-z0-9 .&'-]+?)\s*[:\(]\s*(.+?)\s*\)?$/);
  if (m) return { league: m[1].trim(), home_team: m[2].trim() };
  return { league: trimmed, home_team: null };
}

(async () => {
  console.log(`📂 Reading ${XLSX_PATH}`);
  const wb = XLSX.readFile(XLSX_PATH);
  const sh = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sh, { header: 1, blankrows: false });

  // Find header row (first row with "Name" + "City" cells)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const r = rows[i] || [];
    if (r.some(c => typeof c === 'string' && c.toLowerCase().includes('name')) &&
        r.some(c => typeof c === 'string' && c.toLowerCase() === 'city')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    console.error('❌ Could not find header row (looking for Name + City).');
    process.exit(1);
  }
  console.log(`   header at row ${headerIdx + 1}`);

  // Map columns
  const header = rows[headerIdx].map(c => String(c || '').toLowerCase().trim());
  const col = {
    num: header.findIndex(h => h === '#'),
    name: header.findIndex(h => h.includes('name')),
    address: header.findIndex(h => h === 'address'),
    city: header.findIndex(h => h === 'city'),
    type: header.findIndex(h => h === 'type'),
    league: header.findIndex(h => h.includes('league')),
    website: header.findIndex(h => h === 'website'),
    notes: header.findIndex(h => h === 'notes'),
  };
  console.log('   columns:', col);

  const dataRows = rows.slice(headerIdx + 1).filter(r => r && r.some(c => c !== null && c !== undefined && c !== ''));
  // Filter out editorial notes / footer
  const cleanRows = dataRows.filter(r => {
    const first = String(r[0] || '').trim();
    if (!first || first.match(/^[A-Z][a-z]+:/) || first.match(/^Source:/)) return false;
    // Must have a name in the name column
    const name = r[col.name];
    if (!name || !String(name).trim()) return false;
    // Skip editorial placeholders (states with no rinks)
    const nameStr = String(name).toLowerCase();
    if (nameStr.startsWith('no permanent') || nameStr.startsWith('no ') && nameStr.includes('rink')) {
      console.log(`   ⏭️  skipping editorial placeholder: ${name}`);
      return false;
    }
    return true;
  });
  console.log(`   ${cleanRows.length} data rows\n`);

  // Fetch existing US rinks
  const { data: existing, error: exErr } = await sb.from('rinks')
    .select('id, name, slug, city, province_state, country, address, is_active')
    .eq('country', COUNTRY);
  if (exErr) { console.error('❌ fetch existing:', exErr.message); process.exit(1); }
  console.log(`   ${existing?.length || 0} existing US rinks in DB`);

  const bySlug = new Map();
  const byNormName = new Map();
  for (const r of existing || []) {
    if (r.slug) bySlug.set(r.slug, r);
    byNormName.set(normName(r.name), r);
  }
  const byNormAddr = new Map();
  for (const r of existing || []) {
    if (r.address) byNormAddr.set(normAddr(r.address), r);
  }

  let inserted = 0, updated = 0, skipped = 0, failed = 0;
  const failures = [];
  const usedIds = new Set();

  for (const r of cleanRows) {
    const rawName = r[col.name];
    if (!rawName) { skipped++; continue; }
    const address = r[col.address] || null;
    const city = r[col.city] || null;
    const leagueTeam = r[col.league] || null;
    const note = r[col.notes] || null;
    const website = r[col.website] || null;
    const slug = slugify(rawName);
    const { league, home_team } = splitLeagueTeam(leagueTeam);
    const notesParts = [];
    if (league) notesParts.push(`League: ${league}`);
    if (home_team) notesParts.push(`Home team: ${home_team}`);
    if (note) notesParts.push(note);
    const notes = notesParts.length ? notesParts.join(' | ') : null;

    // Find match
    let match = null;
    if (bySlug.has(slug) && !usedIds.has(bySlug.get(slug).id)) {
      match = bySlug.get(slug);
    } else {
      const nn = normName(rawName);
      const candidate = byNormName.get(nn);
      if (candidate && !usedIds.has(candidate.id)) match = candidate;
    }
    if (!match && address) {
      const na = normAddr(address);
      const candidate = na ? byNormAddr.get(na) : null;
      if (candidate && !usedIds.has(candidate.id)) match = candidate;
    }
    if (!match) {
      const baseIn = normName(stripParens(rawName));
      if (baseIn) {
        for (const ev of existing) {
          if (usedIds.has(ev.id)) continue;
          const baseEx = normName(stripParens(ev.name));
          if (baseEx && baseIn === baseEx) { match = ev; break; }
        }
      }
    }

    try {
      if (match) {
        usedIds.add(match.id);
        const patch = {};
        if (!match.address && address) patch.address = address;
        if (!match.city && city) patch.city = city;
        if (!match.province_state && STATE_CODE) patch.province_state = STATE_CODE;
        if (!match.notes && notes) patch.notes = notes;
        if (!match.website_url && website) patch.website_url = website.startsWith('http') ? website : `https://${website}`;
        if (!match.source) patch.source = SOURCE;
        if (!match.slug || match.slug !== slug) patch.slug = slug;
        if (Object.keys(patch).length === 0) {
          console.log(`   ⊘ ${rawName} → already complete`);
          skipped++;
          continue;
        }
        const { error: upErr } = await sb.from('rinks').update(patch).eq('id', match.id);
        if (upErr) { failed++; failures.push({ name: rawName, error: upErr.message }); console.log(`   ✗ ${rawName} update: ${upErr.message}`); }
        else { updated++; console.log(`   ↻ ${rawName} (id=${match.id.slice(0,8)}) updated: ${Object.keys(patch).join(', ')}`); }
      } else {
        const { error: insErr } = await sb.from('rinks').insert({
          name: rawName,
          slug,
          country: COUNTRY,
          address,
          city,
          province_state: STATE_CODE,
          website_url: website ? (website.startsWith('http') ? website : `https://${website}`) : null,
          notes,
          source: SOURCE,
        });
        if (insErr) { failed++; failures.push({ name: rawName, error: insErr.message }); console.log(`   ✗ ${rawName} insert: ${insErr.message}`); }
        else { inserted++; console.log(`   ✓ ${rawName} inserted`); }
      }
    } catch (e) {
      failed++;
      failures.push({ name: rawName, error: e.message });
      console.log(`   ✗ ${rawName} exception: ${e.message}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  inserted: ${inserted}`);
  console.log(`  updated:  ${updated}`);
  console.log(`  skipped:  ${skipped} (already complete)`);
  console.log(`  failed:   ${failed}`);
  if (failures.length) {
    console.log(`\nFailures:`);
    for (const f of failures) console.log(`  - ${f.name}: ${f.error}`);
  }
  process.exit(failures.length > 0 ? 1 : 0);
})();
