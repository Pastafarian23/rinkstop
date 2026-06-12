#!/usr/bin/env node
/**
 * One-time backfill: geocode rinks with NULL lat/lon using OpenStreetMap Nominatim.
 * Free, no API key, rate-limited to 1 req/sec (HTTP 429 on faster).
 *
 * Source priority for the geocode query:
 *   1. address (street-level) — most precise
 *   2. city + country
 *   3. name + city + country
 *
 * Run:  node scripts/backfill-rinks-geocode.mjs
 * Resume-safe: only touches rows with NULL lat/lon.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const envText = readFileSync('.env', 'utf8');
const get = (k) => envText.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.replace(/^"|"$/g, '') || '';
const supabase = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'));

const SLEEP_MS = 1100; // Nominatim usage policy: max 1 req/sec
const USER_AGENT = 'RinkStop-Platform/1.0 (geocoding-backfill; admin@rinkstop.com)';

async function geocode(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '0');
  const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' } });
  if (r.status === 429) {
    console.warn('  429 rate-limited, sleeping 5s...');
    await new Promise((r) => setTimeout(r, 5000));
    return geocode(query);
  }
  if (!r.ok) {
    console.warn(`  HTTP ${r.status}`);
    return null;
  }
  const j = await r.json();
  if (!j.length) return null;
  return { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon), display: j[0].display_name };
}

function buildQuery(r) {
  // Try address first (most precise)
  if (r.address && !r.address.match(/tbc|TBC|via Facebook|exact address/i)) {
    return `${r.address}, ${r.city ? r.city.split(',')[0].trim() + ', ' : ''}${r.country}`;
  }
  // Fall back to city + country
  if (r.city) return `${r.city.split(',')[0].trim()}, ${r.country}`;
  // Last resort: name + country
  return `${r.name}, ${r.country}`;
}

async function main() {
  console.log('Fetching rinks with NULL lat/lon...');
  const { data: rinks, error } = await supabase
    .from('rinks')
    .select('id, name, city, country, address, status')
    .or('latitude.is.null,longitude.is.null')
    .neq('status', 'closed') // skip permanently closed
    .neq('status', 'placeholder') // skip placeholders
    .order('country', { ascending: true });
  if (error) throw error;
  console.log(`Found ${rinks.length} rinks to geocode. Estimated time: ${Math.round((rinks.length * SLEEP_MS) / 1000 / 60)} minutes.\n`);

  let updated = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < rinks.length; i++) {
    const r = rinks[i];
    const q = buildQuery(r);
    process.stdout.write(`[${i + 1}/${rinks.length}] ${r.name} (${r.country}) ... `);
    const result = await geocode(q);
    if (result) {
      const { error: upErr } = await supabase
        .from('rinks')
        .update({ latitude: result.lat, longitude: result.lon })
        .eq('id', r.id);
      if (upErr) {
        console.log(`UPDATE FAILED: ${upErr.message}`);
        failed++;
        failures.push({ id: r.id, name: r.name, error: upErr.message });
      } else {
        console.log(`✓ ${result.lat.toFixed(4)}, ${result.lon.toFixed(4)}`);
        updated++;
      }
    } else {
      console.log(`✗ not found`);
      failed++;
      failures.push({ id: r.id, name: r.name, query: q });
    }
    await new Promise((r) => setTimeout(r, SLEEP_MS));
  }

  console.log(`\n=== DONE ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed:  ${failed}`);
  if (failures.length) {
    console.log(`\nFailures:`);
    for (const f of failures) console.log('  -', f);
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
