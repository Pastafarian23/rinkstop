// scripts/enrich-rinks-places-details-only.mjs
// Resumable Details-only pass for rinks that already have place_id but no hours/phone/website/maps URL.
// Cost: Place Details at $17/1000 (free first 5,000/mo) → 293 rinks ≈ $4.98.

import './load-secrets.mjs';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const googleCreds = JSON.parse(await readFile('/root/.openclaw/credentials/google-maps.json', 'utf8'));
const GOOGLE_KEY = googleCreds.key;

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

async function main() {
  const { data: rinks, error } = await supabase
    .from('rinks')
    .select('id, slug, name, place_id')
    .eq('is_active', true)
    .not('place_id', 'is', null)
    .or('opening_hours_json.is.null,google_phone.is.null,google_website.is.null,google_maps_url.is.null')
    .order('id', { ascending: true });

  if (error) throw error;
  if (!rinks || !rinks.length) {
    console.log('[enrich-rinks-places-details-only] no rinks to process');
    return;
  }

  let processed = 0;
  let withHours = 0;
  let withPhone = 0;
  let withWebsite = 0;
  let withMapsUrl = 0;
  let errors = 0;

  console.log(`[enrich-rinks-places-details-only] starting for ${rinks.length} rinks`);
  for (const rink of rinks) {
    processed++;
    try {
      const details = await placeDetails(rink.place_id);
      const update = {
        opening_hours_json: details.opening_hours || null,
        google_phone: details.formatted_phone_number || null,
        google_website: details.website || null,
        google_maps_url: details.url || null,
      };
      const { error: updateErr } = await supabase.from('rinks').update(update).eq('id', rink.id);
      if (updateErr) throw updateErr;
      if (update.opening_hours_json) withHours++;
      if (update.google_phone) withPhone++;
      if (update.google_website) withWebsite++;
      if (update.google_maps_url) withMapsUrl++;
      console.log(`[${rink.slug}] OK (${update.opening_hours_json ? 'hours' : 'no-hours'}, ${update.google_phone ? 'phone' : 'no-phone'})`);
    } catch (err) {
      errors++;
      console.log(`[${rink.slug}] ERR: ${err.message}`);
    }
  }

  console.log('\n[enrich-rinks-places-details-only] DONE');
  console.log(`processed: ${processed}`);
  console.log(`with hours: ${withHours}`);
  console.log(`with phone: ${withPhone}`);
  console.log(`with website: ${withWebsite}`);
  console.log(`with maps url: ${withMapsUrl}`);
  console.log(`errors: ${errors}`);
}

main().catch((err) => {
  console.error('[enrich-rinks-places-details-only] FATAL:', err);
  process.exit(1);
});
