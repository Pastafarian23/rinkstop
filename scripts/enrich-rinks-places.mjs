// scripts/enrich-rinks-places.mjs
// One-time Google Places enrichment for RinkStop rinks.
//
// For every active rink that has latitude/longitude and no place_id yet:
//   1. Text Search: "{name} {city} {country}" → get top result's place_id
//   2. Place Details: fetch opening_hours, phone, website, maps URL
//   3. Update the rink row with all 5 enrichment fields
//
// Resumable: the query filter is `place_id IS NULL`, so re-running picks up
// where it left off. The script exits cleanly when no more work is left.
//
// Usage:
//   node scripts/enrich-rinks-places.mjs           # default limit: 50
//   node scripts/enrich-rinks-places.mjs 5         # test on 5 rinks
//   node scripts/enrich-rinks-places.mjs 5000      # process all remaining
//
// Cost: ~$49/1000 rinks (Text Search $32 + Details $17). For 738 rinks the
// first pass is roughly $36 total.

import './load-secrets.mjs';
import { readFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env vars (load-secrets.mjs should have loaded them).');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Google Maps API key
const creds = JSON.parse(await readFile('/root/.openclaw/credentials/google-maps.json', 'utf-8'));
const GOOGLE_KEY = creds.key;
if (!GOOGLE_KEY || GOOGLE_KEY.length < 30) {
  console.error('Google Maps key missing or malformed in /root/.openclaw/credentials/google-maps.json');
  process.exit(1);
}

// Limit (CLI arg) — default 50 for safety
const LIMIT = Number.parseInt(process.argv[2] || '50', 10);
if (Number.isNaN(LIMIT) || LIMIT <= 0) {
  console.error('Limit must be a positive integer.');
  process.exit(1);
}

// Sleep helper (0.5s between rinks to be polite to the API)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PER_RINK_DELAY_MS = 500;

let processed = 0;
let withHours = 0;
let withPhone = 0;
let withWebsite = 0;
let withMapsUrl = 0;
let noPlaceFound = 0;
let errors = 0;
const startTime = Date.now();

/**
 * Place Text Search — returns the top candidate's place_id (or null).
 * Endpoint: https://maps.googleapis.com/maps/api/place/textsearch/json
 */
async function textSearch(query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Text Search HTTP ${res.status}`);
  const json = await res.json();
  if (json.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(`Text Search API status=${json.status} error=${json.error_message || ''}`);
  }
  const top = (json.results || [])[0];
  return top ? top.place_id : null;
}

/**
 * Place Details — fetches opening_hours, phone, website, and maps URL.
 * Endpoint: https://maps.googleapis.com/maps/api/place/details/json
 */
async function placeDetails(placeId) {
  const fields = 'opening_hours,formatted_phone_number,website,url';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Place Details HTTP ${res.status}`);
  const json = await res.json();
  if (json.status && json.status !== 'OK') {
    throw new Error(`Place Details API status=${json.status} error=${json.error_message || ''}`);
  }
  return json.result || {};
}

/**
 * Process one rink. Returns true if the row was updated, false if skipped.
 */
async function enrichRink(rink) {
  const query = [rink.name, rink.city, rink.country].filter(Boolean).join(' ');
  if (!query.trim()) {
    console.log(`  [${rink.slug}] SKIP: empty name+city+country`);
    return false;
  }

  let placeId;
  try {
    placeId = await textSearch(query);
  } catch (err) {
    console.log(`  [${rink.slug}] TEXT-SEARCH-ERR: ${err.message}`);
    return false;
  }

  if (!placeId) {
    console.log(`  [${rink.slug}] no-place-found`);
    noPlaceFound++;
    return false;
  }

  let details;
  try {
    details = await placeDetails(placeId);
  } catch (err) {
    console.log(`  [${rink.slug}] DETAILS-ERR: ${err.message}`);
    return false;
  }

  const update = {
    place_id: placeId,
    opening_hours_json: details.opening_hours || null,
    google_phone: details.formatted_phone_number || null,
    google_website: details.website || null,
    google_maps_url: details.url || null,
  };

  const { error: updateErr } = await supabase
    .from('rinks')
    .update(update)
    .eq('id', rink.id);

  if (updateErr) {
    console.log(`  [${rink.slug}] UPDATE-ERR: ${updateErr.message}`);
    return false;
  }

  if (update.opening_hours_json) withHours++;
  if (update.google_phone) withPhone++;
  if (update.google_website) withWebsite++;
  if (update.google_maps_url) withMapsUrl++;

  const hoursNote = update.opening_hours_json ? 'hours' : 'no-hours';
  const phoneNote = update.google_phone ? 'phone' : 'no-phone';
  console.log(`  [${rink.slug}] OK (${hoursNote}, ${phoneNote})`);
  return true;
}

async function main() {
  console.log(`[enrich-rinks-places] starting (limit=${LIMIT})`);

  // Fetch candidate rinks: active, have lat, no place_id yet
  const { data: rinks, error } = await supabase
    .from('rinks')
    .select('id, slug, name, city, country, latitude, longitude')
    .eq('is_active', true)
    .not('latitude', 'is', null)
    .is('place_id', null)
    .order('id', { ascending: true })
    .limit(LIMIT);

  if (error) {
    console.error('Failed to fetch rinks:', error.message);
    process.exit(1);
  }

  if (!rinks || rinks.length === 0) {
    console.log('[enrich-rinks-places] no rinks to enrich (all done or none eligible). exiting.');
    return;
  }

  console.log(`[enrich-rinks-places] ${rinks.length} rinks to process`);

  for (const rink of rinks) {
    processed++;
    try {
      await enrichRink(rink);
    } catch (err) {
      errors++;
      console.log(`  [${rink.slug}] UNEXPECTED-ERR: ${err.message}`);
    }
    // Politeness delay between rinks
    if (processed < rinks.length) {
      await sleep(PER_RINK_DELAY_MS);
    }
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[enrich-rinks-places] DONE in ${elapsedSec}s`);
  console.log(`  processed:          ${processed}`);
  console.log(`  with hours:         ${withHours}`);
  console.log(`  with phone:         ${withPhone}`);
  console.log(`  with website:       ${withWebsite}`);
  console.log(`  with maps url:      ${withMapsUrl}`);
  console.log(`  no place found:     ${noPlaceFound}`);
  console.log(`  errors:             ${errors}`);
}

main().catch((err) => {
  console.error('[enrich-rinks-places] FATAL:', err);
  process.exit(1);
});
