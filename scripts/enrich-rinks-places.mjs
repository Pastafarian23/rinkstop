#!/usr/bin/env node
/**
 * WS20 — Rink Places enrichment script (2026-08-07)
 *
 * Calls Google Places API (New) v1 for targeted rink pages and writes
 * structured metadata (place_id, cover_photo_url, opening_hours_json,
 * rating, user_ratings_total, formatted_address, website, phone) to a
 * new `rinks_places_cache` Supabase table.
 *
 * Scope: 72 GSC rink pages with impressions in 28d + 3 PH rinks = 75 total.
 *
 * Cost: ~$2.40 at Places API (New) Basic Data pricing ($0.032/call).
 *   - 1 Find Place call per rink
 *   - 1 Place Details call per rink (if Find Place succeeds)
 *
 * Duplicate-content safety: SKIPS `editorialSummary` field. Only writes
 * structured metadata + photo URLs + hours. Editorial copy stays unique
 * via the existing buildRinkBlurb() generator on the rink page.
 *
 * Idempotent: re-running just refreshes the cache. Uses place_id as the
 * join key for Places calls; writes back to rinks.place_id on first hit
 * so subsequent runs can skip Find Place and go straight to Details.
 *
 * Usage:
 *   node scripts/enrich-rinks-places.mjs                # full 75
 *   node scripts/enrich-rinks-places.mjs --dry-run     # show plan, no calls
 *   node scripts/enrich-rinks-places.mjs --limit=25    # first 25
 *   node scripts/enrich-rinks-places.mjs --limit=5     # test run
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs';

const SA_PATH = '/root/.openclaw/credentials/gsc.json';
const GMAPS_PATH = '/root/.openclaw/credentials/google-maps.json';

const gmapsKey = JSON.parse(fs.readFileSync(GMAPS_PATH, 'utf8')).key;
if (!gmapsKey) { console.error('Missing Google Maps key in google-maps.json'); process.exit(1); }

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars'); process.exit(1);
}

// ---- CLI flags ----
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;

// ---- Build target list: 72 GSC rink pages + 3 PH rinks ----
const gsc = JSON.parse(fs.readFileSync(
  '/root/.openclaw/workspace/memory/gsc-pages-impressions-28d-2026-08-07.json',
  'utf8'
));
const gscSlugs = gsc.rows
  .map(r => r.keys[0].replace('https://www.rinkstop.com', '').replace('https://rinkstop.com', ''))
  .filter(u => u.includes('/directory/rinks/') && /^\/directory\/rinks\/[a-z0-9-]+\/?$/.test(u) && !u.includes('?'))
  .map(u => u.replace('/directory/rinks/', '').split('/')[0]);
const phRinks = [
  'sm-skating-sm-mall-of-asia-ph',
  'sm-skating-sm-megamall-ph',
  'sm-skating-sm-seaside-city-cebu-ph',
];
const targetSlugs = [...new Set([...gscSlugs, ...phRinks])];
if (limit) targetSlugs.length = Math.min(limit, targetSlugs.length);

console.log(`Target list: ${targetSlugs.length} rinks`);
console.log(`Mode: ${dryRun ? 'DRY RUN (no Places calls)' : 'LIVE'}`);

// ---- DB lookup: get current enrichment state ----
const { data: dbRinks, error: dbErr } = await sb
  .from('rinks')
  .select('id, slug, name, city, country, place_id, cover_photo_url, opening_hours_json')
  .in('slug', targetSlugs);

if (dbErr) { console.error('DB error:', dbErr.message); process.exit(1); }
console.log(`DB matches: ${dbRinks?.length ?? 0} / ${targetSlugs.length}`);

if (dryRun) {
  console.log('\nDry run — would enrich these slugs:');
  for (const r of dbRinks || []) {
    const needsPlace = !r.place_id;
    const needsPhoto = !r.cover_photo_url;
    console.log(`  ${r.slug.padEnd(60)} | place_id=${r.place_id ? 'YES' : 'NO '} | photo=${r.cover_photo_url ? 'YES' : 'NO '} | ${r.city}`);
  }
  process.exit(0);
}

// ---- Step 1: ensure rinks_places_cache table exists ----
// Migration applied via Supabase Management API (see _run-migration.mjs).
// Script no longer falls back to inline exec_sql — the project doesn't expose
// that RPC, so we treat the table as created out-of-band.
console.log('Assuming rinks_places_cache exists (migration applied via Management API).');

// ---- Step 2: for each rink, Find Place then Place Details ----
let callsMade = 0;
let photosFound = 0;
let ratingsFound = 0;
let hoursFound = 0;
let errors = [];

async function findPlace(rinkName, city, country) {
  const q = [rinkName, city, country].filter(Boolean).join(' ');
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': gmapsKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({
      textQuery: q,
    }),
  });
  callsMade++;
  const j = await r.json();
  if (!r.ok) {
    errors.push({ rink: q, status: r.status, body: j });
    return null;
  }
  return j.places?.[0] || null;
}

async function getPlaceDetails(placeId) {
  const r = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': gmapsKey,
      'X-Goog-FieldMask': [
        'id',
        'displayName',
        'formattedAddress',
        'nationalPhoneNumber',
        'internationalPhoneNumber',
        'websiteUri',
        'googleMapsUri',
        'rating',
        'userRatingCount',
        'regularOpeningHours',
        'photos',
        'location',
      ].join(','),
    },
  });
  callsMade++;
  const j = await r.json();
  if (!r.ok) {
    errors.push({ rink: placeId, status: r.status, body: j });
    return null;
  }
  return j;
}

for (const rink of dbRinks || []) {
  console.log(`\n[${rink.slug}] ${rink.name} — ${rink.city}, ${rink.country}`);
  try {
    // If rink already has a place_id, skip Find Place, go straight to Details
    let placeId = rink.place_id;
    let details = null;

    if (!placeId) {
      const place = await findPlace(rink.name, rink.city, rink.country);
      if (!place) {
        console.log('  ⚠ No match found');
        continue;
      }
      placeId = place.id;
      console.log(`  Found place_id: ${placeId}`);
    } else {
      console.log(`  Reusing place_id: ${placeId}`);
    }

    // Get full details
    details = await getPlaceDetails(placeId);
    if (!details) {
      console.log('  ⚠ Place Details failed');
      // If we're reusing a cached place_id and it 404'd, clear it so the next run re-finds it
      const wasCached = !!rink.place_id;
      if (wasCached) {
        const lastErr = errors[errors.length - 1];
        if (lastErr && lastErr.status === 404) {
          console.log(`  Clearing stale place_id ${placeId} from rinks table`);
          await sb.from('rinks').update({ place_id: null }).eq('id', rink.id);
        }
      }
      continue;
    }

    // Build the cache row (SKIP editorialSummary for duplicate-content safety)
    const cacheRow = {
      rink_id: rink.id,
      place_id: placeId,
      cover_photo_url: details.photos?.[0]?.name
        ? `https://places.googleapis.com/v1/${details.photos[0].name}/media?maxHeightPx=800&maxWidthPx=1200&key=${gmapsKey}`
        : null,
      opening_hours_json: details.regularOpeningHours || null,
      rating: details.rating || null,
      user_ratings_total: details.userRatingCount || null,
      formatted_address: details.formattedAddress || null,
      google_phone: details.internationalPhoneNumber || details.nationalPhoneNumber || null,
      google_website: details.websiteUri || null,
      google_maps_url: details.googleMapsUri || null,
      photos_urls: (details.photos || []).slice(0, 5).map(p =>
        `https://places.googleapis.com/v1/${p.name}/media?maxHeightPx=400&maxWidthPx=600&key=${gmapsKey}`
      ),
    };

    // Upsert cache row
    const { error: cacheErr } = await sb
      .from('rinks_places_cache')
      .upsert(cacheRow, { onConflict: 'rink_id' });

    if (cacheErr) {
      console.log(`  ⚠ Cache write failed: ${cacheErr.message}`);
      errors.push({ rink: rink.slug, error: cacheErr.message });
      continue;
    }

    // Backfill place_id on rinks table if missing
    if (!rink.place_id && placeId) {
      await sb.from('rinks').update({ place_id: placeId }).eq('id', rink.id);
    }

    // Backfill cover_photo_url on rinks table if missing
    if (!rink.cover_photo_url && cacheRow.cover_photo_url) {
      await sb.from('rinks').update({ cover_photo_url: cacheRow.cover_photo_url }).eq('id', rink.id);
      photosFound++;
    }

    // Backfill latitude/longitude on rinks table if missing
    if ((!rink.latitude || !rink.longitude) && details.location?.latitude != null && details.location?.longitude != null) {
      await sb.from('rinks').update({ latitude: details.location.latitude, longitude: details.location.longitude }).eq('id', rink.id);
      console.log(`  ✓ wrote lat/lon: ${details.location.latitude},${details.location.longitude}`);
    }

    if (cacheRow.rating) ratingsFound++;
    if (cacheRow.opening_hours_json) hoursFound++;
    console.log(`  ✓ photo=${cacheRow.cover_photo_url ? 'YES' : 'NO'} rating=${cacheRow.rating || 'N/A'} hours=${cacheRow.opening_hours_json ? 'YES' : 'NO'}`);

    // Small delay to stay well below rate limits
    await new Promise(r => setTimeout(r, 250));
  } catch (e) {
    console.log(`  ✗ Error: ${e.message}`);
    errors.push({ rink: rink.slug, error: e.message });
  }
}

console.log('\n=== SUMMARY ===');
console.log(`Places API calls: ${callsMade}`);
console.log(`Photos backfilled: ${photosFound}`);
console.log(`Ratings found: ${ratingsFound}`);
console.log(`Hours found: ${hoursFound}`);
console.log(`Errors: ${errors.length}`);
if (errors.length) {
  console.log('First 5 errors:');
  errors.slice(0, 5).forEach(e => console.log('  ', JSON.stringify(e)));
}
console.log(`Estimated cost: ~$${(callsMade * 0.032).toFixed(2)}`);
