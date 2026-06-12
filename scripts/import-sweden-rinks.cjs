#!/usr/bin/env node
/**
 * import-sweden-rinks.cjs
 *
 * Imports Sweden ice rinks from the Arnel-provided spreadsheet
 * (Europe_Ice_Rinks_Sweden_RinkStop.xlsx) into the `rinks` table.
 *
 * Source: Arnel-supplied spreadsheet sourced from Wikipedia + swehockey.se.
 * Acknowledged gaps in source: community-level rinks have city-only addresses
 * (no street), no lat/long, no phone/email/website available in source.
 *
 * Fields imported (sourced from spreadsheet):
 *   - name, address, city, province_state, country='Sweden'
 *   - capacity (parsed int), year_opened (parsed int)
 *   - league (parsed from league_team), home_team (best-effort parse)
 *   - notes (from spreadsheet, including "Sweden's largest arena" type notes)
 *   - source='Europe_Ice_Rinks_Sweden_RinkStop.xlsx (Wikipedia + swehockey.se)'
 *
 * Fields NOT imported (would require invention or federation login):
 *   - latitude, longitude (would need geocoding)
 *   - phone, email, website_url (not in source)
 *   - ice_size, surface_type (not in source)
 *
 * Idempotent: skips rinks that already exist (matched by name + country).
 * Updates notes/league/capacity if the existing row has those fields empty.
 *
 * Run: node scripts/import-sweden-rinks.cjs
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SOURCE = 'Europe_Ice_Rinks_Sweden_RinkStop.xlsx (Wikipedia + swehockey.se)';

/** Parse "Borås, Västra Götaland" → { city: 'Borås', province: 'Västra Götaland' } */
function splitCityRegion(raw) {
  if (!raw) return { city: null, province: null };
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 1) return { city: parts[0], province: null };
  return { city: parts[0], province: parts.slice(1).join(', ') };
}

/** Parse "13,850" → 13850 */
function parseInt0(s) {
  if (s == null) return null;
  const n = parseInt(String(s).replace(/[,\s]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse "SHL – Djurgårdens IF, AIK (high-profile), Swedish NT"
 *   → { league: 'SHL', team: 'Djurgårdens IF' }
 * League is the part before the dash. Team is the first team named.
 */
function splitLeagueTeam(raw) {
  if (!raw) return { league: null, team: null, leagueNote: null };
  const dashSplit = raw.split(/[–—\-]/);
  const league = dashSplit[0]?.trim() || null;
  const rest = dashSplit.slice(1).join('–').trim();
  // First team = before first comma or parenthesis
  const teamMatch = rest.split(/[,(]/)[0]?.trim();
  return { league, team: teamMatch || null, leagueNote: rest || null };
}

/** Slug from name. "Avicii Arena" → "avicii-arena" */
function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[éèê]/g, 'e')
    .replace(/ü/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const jsonPath = path.join('/tmp', 'sweden-rinks.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('Missing /tmp/sweden-rinks.json. Run the python extraction first.');
    process.exit(1);
  }
  const rinks = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${rinks.length} rinks from JSON`);

  // Pull existing Sweden rinks once
  const { data: existing, error: exErr } = await sb
    .from('rinks')
    .select('id, name, capacity, notes, source')
    .eq('country', 'Sweden');
  if (exErr) { console.error('Pull existing failed:', exErr); process.exit(1); }
  const existingByName = new Map((existing || []).map(r => [r.name, r]));
  console.log(`Existing Sweden rinks in DB: ${existingByName.size}`);

  let inserted = 0, updated = 0, skipped = 0, failed = 0;
  const failures = [];
  const inserts = [];
  const updates = [];

  for (const r of rinks) {
    const { city, province } = splitCityRegion(r.city_region);
    const cap = parseInt0(r.capacity);
    const year = parseInt0(r.opened);
    const { league, team, leagueNote } = splitLeagueTeam(r.league_team);
    const slug = slugify(r.name);
    const address = r.address || city; // If address is city-only, still useful as address

    // Compose notes (rinks table has no league/home_team/year_opened columns)
    const noteParts = [];
    if (r.notes) noteParts.push(r.notes);
    if (league) noteParts.push(`League: ${league}`);
    if (team) noteParts.push(`Home team: ${team}`);
    if (year) noteParts.push(`Opened: ${year}`);
    const composedNotes = noteParts.length ? noteParts.join(' | ') : null;

    const row = {
      name: r.name,
      slug,
      city: city || null,
      province_state: province || null,
      country: 'Sweden',
      address,
      capacity: cap,
      notes: composedNotes,
      source: SOURCE,
      is_active: true,
    };

    const ex = existingByName.get(r.name);
    if (ex) {
      // Skip if all sourced fields already populated
      const needUpdate = (
        (cap && !ex.capacity) ||
        (composedNotes && !ex.notes)
      );
      if (!needUpdate) { skipped++; continue; }
      const patch = {};
      if (cap && !ex.capacity) patch.capacity = cap;
      if (composedNotes && !ex.notes) patch.notes = composedNotes;
      const { error } = await sb.from('rinks').update(patch).eq('id', ex.id);
      if (error) { failed++; failures.push({ name: r.name, op: 'update', error: error.message }); }
      else { updated++; }
    } else {
      inserts.push(row);
    }
  }

  // Bulk insert in batches of 50
  for (let i = 0; i < inserts.length; i += 50) {
    const batch = inserts.slice(i, i + 50);
    const { data, error } = await sb.from('rinks').insert(batch).select('id');
    if (error) {
      console.error(`Insert batch ${i}-${i+batch.length} failed:`, error);
      for (const b of batch) failures.push({ name: b.name, op: 'insert', error: error.message });
      failed += batch.length;
    } else {
      inserted += data?.length || 0;
      console.log(`Inserted batch ${i+1}-${Math.min(i+50, inserts.length)}: ${data?.length} rows`);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped} (already in DB, fully populated)`);
  console.log(`Failed:   ${failed}`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.slice(0, 10).forEach(f => console.log(' ', f));
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
