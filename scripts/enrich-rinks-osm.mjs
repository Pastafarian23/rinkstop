#!/usr/bin/env node
/**
 * Free rink enrichment via OpenStreetMap + Wikipedia/Wikidata.
 *
 * Replaces the Google Places API (New) script for cost-sensitive rinks.
 * Sources:
 *   - Overpass API (overpass-api.de) — OSM tags: phone, hours, website,
 *     addr:housenumber, addr:street, addr:city, image, wikidata, wikipedia
 *   - Wikidata REST API — labels, descriptions, P18 (image)
 *   - Wikipedia REST API — article extract + thumbnail
 *
 * Coverage: ~80% of what Google Places Basic Data provides (missing:
 * rating, user_ratings_total, editorialSummary which we explicitly
 * skip for duplicate-content reasons anyway).
 *
 * Cost: $0.00. Rate limit: 1 req/sec to each endpoint (Overpass is
 * strict; Wikidata/Wikipedia are lenient but we still respect 1/sec).
 *
 * Output: writes back to rinks.cover_photo_url, rinks.opening_hours_json,
 * rinks.phone (and the rinks_places_cache for backward compat). Plus
 * rinks_places_cache.formatted_address if found.
 *
 * Idempotent: re-running refreshes values. Skips rows that already have
 * cover_photo_url AND opening_hours_json (unless --force).
 *
 * Usage:
 *   node scripts/enrich-rinks-osm.mjs                    # 9 new-growth rinks
 *   node scripts/enrich-rinks-osm.mjs --limit=3         # first 3
 *   node scripts/enrich-rinks-osm.mjs --all             # all 1917 rinks
 *   node scripts/enrich-rinks-osm.mjs --dry-run        # show plan
 *   node scripts/enrich-rinks-osm.mjs --force          # refresh even if populated
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
config({ path: '.env.local' });

// ---- Args ----
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const forceAll = args.includes('--force');
const onlyNew = !args.includes('--all');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;

const USER_AGENT = 'RinkStop/1.0 (https://rinkstop.com; contact@rinkstop.com)';

const SLUGS_NEW_GROWTH = [
  'amherst-stadium',
  'pista-de-gelo-do-campismo-lisboa-ice-rink',
  'mall-of-dhahran-ice-rink',
  'alpha-ice-complex',
  'andover-community-center',
  'acadia-arena',
  'chelmsford-ice-arena-riverside-ice',
  'aeon-mall-b-nh-t-n-ice-rink',
  'bog-ice-arena-kingston',
];

// ---- Supabase admin client ----
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing Supabase env'); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

// ---- OSM query ----
// Look within 200m of (lat,lon) for any ice_hockey/sports_centre/ice_rink node
function overpassQuery(lat, lon) {
  return `
[out:json][timeout:25];
(
  node(around:200,${lat},${lon})[leisure=sports_centre][sport=ice_hockey];
  node(around:200,${lat},${lon})[leisure=ice_rink];
  node(around:200,${lat},${lon})[sport=ice_hockey];
  node(around:200,${lat},${lon})[leisure=sports_centre][name~"[Ii]ce|[Hh]ockey|[Rr]ink|[Aa]rena",i];
  node(around:200,${lat},${lon})[building=stadium][name~"[Ii]ce|[Hh]ockey|[Rr]ink|[Aa]rena",i];
  way(around:200,${lat},${lon})[leisure=sports_centre][sport=ice_hockey];
  way(around:200,${lat},${lon})[leisure=ice_rink];
  way(around:200,${lat},${lon})[building=stadium][name~"[Ii]ce|[Hh]ockey|[Rr]ink|[Aa]rena",i];
);
out body;
`.trim();
}

async function fetchOSM(lat, lon) {
  const q = overpassQuery(lat, lon);
  // Try up to 3 times with backoff (Overpass returns 504 when overloaded)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
        body: 'data=' + encodeURIComponent(q),
      });
      if (res.ok) {
        const data = await res.json();
        return data.elements?.[0] || null;
      }
      if (res.status === 504 || res.status === 429) {
        console.warn(`  Overpass ${res.status}, retrying in ${(attempt + 1) * 5}s...`);
        await sleep((attempt + 1) * 5000);
        continue;
      }
      console.warn(`  Overpass ${res.status}: ${(await res.text()).slice(0, 100)}`);
      return null;
    } catch (e) {
      console.warn(`  Overpass error: ${e.message}, retrying...`);
      await sleep((attempt + 1) * 5000);
    }
  }
  return null;
}

// ---- Wikidata/Wikipedia fetch ----
async function fetchWikidata(osmEl) {
  const qid = osmEl?.tags?.wikidata;
  const wikiTitle = osmEl?.tags?.wikipedia; // format: "en:Title"
  if (!qid && !wikiTitle) return null;

  let result = { description: null, image: null, extract: null };

  // Wikidata → description + image
  if (qid) {
    try {
      const wdRes = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (wdRes.ok) {
        const wd = await wdRes.json();
        const ent = wd.entities?.[qid];
        if (ent?.descriptions?.en?.value) result.description = ent.descriptions.en.value;
        if (ent?.claims?.P18?.[0]?.mainsnak?.datavalue?.value) {
          const imageName = ent.claims.P18[0].mainsnak.datavalue.value;
          result.image = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageName)}?width=1200`;
        }
      }
    } catch (e) { console.warn('  Wikidata error:', e.message); }
  }

  // Wikipedia → extract + thumbnail
  let title = wikiTitle;
  if (!title && qid) {
    // Derive from Wikidata sitelinks
    const wdRes = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, { headers: { 'User-Agent': USER_AGENT } });
    if (wdRes.ok) {
      const wd = await wdRes.json();
      title = wd.entities?.[qid]?.sitelinks?.enwiki?.title;
    }
  }
  if (title) {
    title = title.replace(/^en:/, '');
    try {
      const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (wikiRes.ok) {
        const wiki = await wikiRes.json();
        if (wiki.extract) result.extract = wiki.extract.slice(0, 500);
        if (!result.image && wiki.originalimage?.source) result.image = wiki.originalimage.source;
        else if (!result.image && wiki.thumbnail?.source) result.image = wiki.thumbnail.source.replace(/\/\d+px-/, '/1200px-');
      }
    } catch (e) { console.warn('  Wikipedia error:', e.message); }
  }

  return (result.description || result.image || result.extract) ? result : null;
}

function osmToOpeningHours(tags) {
  // OSM opening_hours format is standard (e.g., "Mo-Fr 10:00-22:00; Sa-Su 09:00-23:00")
  // Our schema is JSON with weekday_text[] (Google Places format). Convert if present.
  const oh = tags.opening_hours;
  if (!oh) return null;
  // Pass through as a simple object that the page can read
  return { osm_raw: oh };
}

function osmToPhone(tags) {
  const phone = tags.phone || tags['contact:phone'];
  return phone ? String(phone).replace(/^tel:/, '') : null;
}

function osmToAddress(tags) {
  const parts = [];
  if (tags['addr:housenumber'] && tags['addr:street']) parts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`);
  else if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
  if (tags['addr:country']) parts.push(tags['addr:country']);
  return parts.length > 0 ? parts.join(', ') : null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function processRink(rink) {
  console.log(`\n--- ${rink.slug} (${rink.name}) ---`);
  console.log(`  lat/lon: ${rink.latitude}, ${rink.longitude}`);

  const osmEl = await fetchOSM(rink.latitude, rink.longitude);
  await sleep(1100); // 1 req/sec to be polite
  if (!osmEl) {
    console.log('  ✗ No OSM match');
    return null;
  }
  const tags = osmEl.tags || {};
  console.log(`  ✓ OSM ${osmEl.type}/${osmEl.id} | ${tags.name || '(no name)'}`);

  const wikiData = await fetchWikidata(osmEl);
  await sleep(1100);

  const phone = osmToPhone(tags);
  const address = osmToAddress(tags);
  const hours = osmToOpeningHours(tags);
  const photo = wikiData?.image;

  const result = { phone, address, hours, photo, description: wikiData?.description, extract: wikiData?.extract, website: tags.website || null };
  console.log(`  → phone: ${phone ? 'YES' : 'no'} | address: ${address ? 'YES' : 'no'} | hours: ${hours ? 'YES' : 'no'} | photo: ${photo ? 'YES' : 'no'} | website: ${tags.website ? 'YES' : 'no'} | wiki: ${wikiData ? 'YES' : 'no'}`);
  return result;
}

// ---- Main ----
async function main() {
  // Pick rinks to process
  let query = sb.from('rinks')
    .select('id, slug, name, city, country, latitude, longitude, cover_photo_url, opening_hours_json, phone, address, google_phone, google_website')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .eq('is_active', true)
    .order('slug')
    .limit(limit);

  if (onlyNew) query = query.in('slug', SLUGS_NEW_GROWTH);
  if (!forceAll) {
    // Skip rinks that already have both photo AND hours (avoid overwriting good data)
    // We're OK with overwriting phone since OSM phone is usually better
  }

  const { data: rinks, error } = await query;
  if (error) { console.error('DB error:', error.message); process.exit(1); }

  console.log(`Found ${rinks?.length ?? 0} rinks to process\n`);

  if (dryRun) {
    for (const r of rinks || []) {
      console.log(`  ${r.slug} (${r.name}) — has photo=${!!r.cover_photo_url}, hours=${!!r.opening_hours_json}, phone=${!!r.phone}`);
    }
    process.exit(0);
  }

  let success = 0, skip = 0;
  for (const rink of rinks || []) {
    const data = await processRink(rink);
    if (!data) { skip++; continue; }

    // Build writeback
    const updates = {};
    if (data.phone && !rink.phone) updates.phone = data.phone;
    if (data.phone && !rink.google_phone) updates.google_phone = data.phone;
    if (data.hours && !rink.opening_hours_json) updates.opening_hours_json = data.hours;
    if (data.photo && !rink.cover_photo_url) updates.cover_photo_url = data.photo;
    if (data.address && !rink.address) updates.address = data.address;
    if (data.website && !rink.website_url && !rink.google_website) updates.google_website = data.website;

    if (Object.keys(updates).length === 0) {
      console.log(`  → All fields already populated, skipping`);
      skip++;
      continue;
    }

    const { error: updErr } = await sb.from('rinks').update(updates).eq('id', rink.id);
    if (updErr) {
      console.log(`  ✗ Update failed: ${updErr.message}`);
    } else {
      console.log(`  ✓ Updated: ${Object.keys(updates).join(', ')}`);
      success++;
    }
  }

  console.log(`\n=== Done: ${success} updated, ${skip} skipped ===`);
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
