// scripts/enrich-rinks-photos.mjs
// One-time Google Places enrichment for rinks.
// For each active rink with no cover_photo_url, fetch the first Google
// Place photo and store the signed photo URL on the rink row.
//
// Usage:
//   node scripts/enrich-rinks-photos.mjs            # default limit 50
//   node scripts/enrich-rinks-photos.mjs 5          # test on 5 rinks
//   node scripts/enrich-rinks-photos.mjs 5000       # full sweep
//   LIMIT=200 node scripts/enrich-rinks-photos.mjs  # env override
//
// Resumable: queries rinks WHERE cover_photo_url IS NULL, so re-runs pick
// up where they left off. Idempotent. Safe to interrupt with SIGINT/SIGTERM.
//
// Cost: ~$7 per 1,000 photos (Google Places Photo - Load). 738 candidate
// rinks on first pass = ~$5.17. Plus Text Search at $32/1000 = ~$0.02 for
// 738 queries. So ~$5.20 for the first pass; subsequent passes are smaller.

import './load-secrets.mjs';
import { readFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE env. Check scripts/load-secrets.mjs.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: 'public' } });

// Load the Google Maps key from credentials/google-maps.json.
// We don't put this in the Supabase secrets file because it's an external
// service key, not a Supabase key. Keep it scoped to this script.
const creds = JSON.parse(await readFile('/root/.openclaw/credentials/google-maps.json', 'utf-8'));
const GOOGLE_KEY = creds.key;
if (!GOOGLE_KEY || GOOGLE_KEY.length < 30) {
  console.error('Google Maps key missing or invalid in /root/.openclaw/credentials/google-maps.json');
  process.exit(1);
}

// Limit: argv[2] wins, then env LIMIT, then 50.
const LIMIT = parseInt(process.argv[2] || process.env.LIMIT || '50', 10);

// Sleep helper. 0.5s between rinks keeps us well under the
// 1000 req/min rate limit (Text Search) and is polite to Google's servers.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAUSE_MS = 500;

const stats = {
  total: 0,
  enriched: 0,
  noPlace: 0,
  noPhotos: 0,
  errors: 0,
};

const errorLog = [];

/**
 * Google Places Text Search.
 * Returns the JSON-decoded response.
 *
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 */
async function textSearch(query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Text Search HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(`Text Search API status=${json.status} error_message=${json.error_message || ''}`);
  }
  return json;
}

/**
 * Google Places Photo.
 * Returns the SIGNED photo URL extracted from the 302 Location header.
 * Does NOT follow the redirect (that would burn API quota needlessly).
 *
 * Docs: https://developers.google.com/maps/documentation/places/web-service/photos
 */
async function getPhotoUrl(photoReference) {
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${encodeURIComponent(photoReference)}&key=${GOOGLE_KEY}`;
  // redirect: 'manual' so we get the 302 response, not the followed image bytes.
  const res = await fetch(url, { redirect: 'manual' });
  if (res.status === 302 || res.status === 301) {
    // Case-insensitive header lookup — Node lowercases all header names.
    const loc = res.headers.get('location');
    if (!loc) {
      throw new Error(`302 with no Location header (ref=${photoReference.slice(0, 20)}...)`);
    }
    return loc;
  }
  if (!res.ok) {
    throw new Error(`Photo HTTP ${res.status}: ${await res.text()}`);
  }
  // Some Google endpoints may not redirect; treat as failure.
  throw new Error(`Photo endpoint did not return redirect (status=${res.status})`);
}

async function processRink(rink) {
  const query = [rink.name, rink.city, rink.country].filter(Boolean).join(' ');

  let search;
  try {
    search = await textSearch(query);
  } catch (e) {
    console.log(`[err ] ${rink.slug}: text-search-failed: ${e.message}`);
    errorLog.push({ slug: rink.slug, stage: 'text-search', error: e.message });
    stats.errors++;
    return;
  }

  const results = search.results || [];
  if (results.length === 0) {
    console.log(`[skip] ${rink.slug}: no-place-found`);
    stats.noPlace++;
    return;
  }

  const photos = results[0].photos || [];
  if (photos.length === 0) {
    console.log(`[skip] ${rink.slug}: no-photos-on-place`);
    stats.noPhotos++;
    return;
  }

  const photoRef = photos[0].photo_reference;
  let url;
  try {
    url = await getPhotoUrl(photoRef);
  } catch (e) {
    console.log(`[err ] ${rink.slug}: photo-fetch-failed: ${e.message}`);
    errorLog.push({ slug: rink.slug, stage: 'photo', error: e.message });
    stats.errors++;
    return;
  }

  const { error: updateErr } = await supabaseAdmin
    .from('rinks')
    .update({ cover_photo_url: url })
    .eq('id', rink.id);

  if (updateErr) {
    console.log(`[err ] ${rink.slug}: db-update-failed: ${updateErr.message}`);
    errorLog.push({ slug: rink.slug, stage: 'db', error: updateErr.message });
    stats.errors++;
    return;
  }

  console.log(`[photo] ${rink.slug} -> ${url}`);
  stats.enriched++;
}

async function main() {
  console.log(`[start] limit=${LIMIT} key=${GOOGLE_KEY.slice(0, 8)}...`);

  // Fetch candidates. Filter is in the WHERE clause, so re-runs pick up
  // rinks still missing cover_photo_url. Order by id for stable progress.
  // We restrict to is_active=true AND latitude IS NOT NULL because the
  // user explicitly said the 300 null-latitude rinks are not our problem
  // (and Places Text Search by name+city+country is more reliable than
  // by lat/lon reverse geocoding anyway).
  const { data: rinks, error } = await supabaseAdmin
    .from('rinks')
    .select('id, name, slug, city, country, latitude, longitude, is_active, cover_photo_url')
    .eq('is_active', true)
    .not('latitude', 'is', null)
    .is('cover_photo_url', null)
    .order('id', { ascending: true })
    .limit(LIMIT);

  if (error) {
    console.error('Failed to load rinks:', error);
    process.exit(1);
  }

  stats.total = rinks.length;
  console.log(`[load] ${stats.total} rinks to process`);

  for (let i = 0; i < rinks.length; i++) {
    const rink = rinks[i];
    try {
      await processRink(rink);
    } catch (e) {
      // Defensive: processRink catches its own errors, but a stray throw
      // shouldn't kill the whole run.
      console.log(`[err ] ${rink.slug}: unexpected: ${e.message}`);
      errorLog.push({ slug: rink.slug, stage: 'unexpected', error: e.message });
      stats.errors++;
    }
    // Pause between rinks (but not after the last one).
    if (i < rinks.length - 1) {
      await sleep(PAUSE_MS);
    }
  }

  console.log('');
  console.log('[done] stats:', JSON.stringify(stats, null, 2));
  if (errorLog.length) {
    console.log('[done] error log:');
    for (const e of errorLog.slice(0, 20)) {
      console.log(`  - ${e.slug}: [${e.stage}] ${e.error}`);
    }
    if (errorLog.length > 20) console.log(`  ... and ${errorLog.length - 20} more`);
  }
  // Exit 0 even with skips — they're expected (some places genuinely have no photos).
  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
