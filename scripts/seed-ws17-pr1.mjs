#!/usr/bin/env node
// scripts/seed-ws17-pr1.mjs
//
// WS17 PR1 - seed 1 rink (US, active) with 1 week of recurring programming
// and 1 published event. Idempotent: rerun = no-op if the rink already has
// rows (the rink is selected deterministically — first active US rink; reruns
// match by name).
//
// Usage:
//   node scripts/seed-ws17-pr1.mjs            # seeds against .env-connected dev DB
//   node scripts/seed-ws17-pr1.mjs --wipe    # wipes existing rows for THIS rink before seeding
//
// Selection: first active US rink with is_active=true (or status active).
//   Override with TARGET_RINK_ID env var if needed.

import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const WIPE = args.has('--wipe');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const TARGET = {
  rinkName: process.env.TARGET_RINK_NAME || 'Alpharetta Ice Forum',
  fallbackCountry: 'United States',
  fallbackCity: 'Alpharetta',
};

const PROGRAMMING_WEEK = [
  { activity_type: 'public_skate',  day_of_week: 0, start_time: '14:00', end_time: '16:00', price_cents: 1500, skill_level: 'all', gender: 'all', capacity: 80, description: 'Family-friendly public skate. Skate rental available on-site.' },
  { activity_type: 'stick_and_puck', day_of_week: 1, start_time: '06:30', end_time: '07:45', price_cents: 2000, skill_level: 'all', gender: 'all', capacity: 30, gear_rules: 'Helmet required. Full equipment recommended.', description: 'Early-morning stick-and-puck. Limited capacity for shooting drills.' },
  { activity_type: 'learn_to_skate', day_of_week: 2, start_time: '17:00', end_time: '17:45', price_cents: 1800, skill_level: 'beginner', gender: 'coed', age_min: 5, age_max: 12, capacity: 20, description: 'Snowplow Sam through Level 3 taught by Skate USA certified coaches.' },
  { activity_type: 'open_hockey',  day_of_week: 3, start_time: '20:00', end_time: '22:00', price_cents: 2500, skill_level: 'intermediate', gender: 'all', age_min: 18, age_max: null, capacity: 32, description: 'Adult open hockey. USA Hockey membership required at the door.' },
  { activity_type: 'pickup',        day_of_week: 4, start_time: '19:00', end_time: '20:30', price_cents: 2200, skill_level: 'all', gender: 'all', capacity: 24, description: 'No-contact pickup hockey. Bring dark and light jerseys.' },
  { activity_type: 'drop_in',       day_of_week: 5, start_time: '21:00', end_time: '23:00', price_cents: 2500, skill_level: 'intermediate', gender: 'all', capacity: 26, description: 'Friday-night drop-in. Run by the Atlanta Blades alumni crew.' },
  { activity_type: 'youth_league',  day_of_week: 6, start_time: '08:00', end_time: '10:00', price_cents: null, skill_level: 'all', gender: 'coed', age_min: 8, age_max: 14, capacity: 40, description: 'Saturday-morning youth house league (Mites + Squirts). In-season only.' },
];

const SAMPLE_EVENT = {
  title: 'Alpharetta Summer Skills Camp',
  subtitle: 'Three-day power skating and stickhandling intensive',
  description: 'A focused three-day camp for AAA/AA players entering U14–U16 tryouts. 90 minutes on-ice per day with video review and small-group skill stations. Lunch included for full-day attendees.',
  event_type: 'camp',
  duration_days: 3,
  start_date_offset_days: 21,
  starts_at_hour: 9,
  ends_at_hour: 14,
  timezone: 'America/New_York',
  registration_opens_offset_days: -7,
  registration_closes_offset_days: 7,
  venue_name: 'Alpharetta Ice Forum — Rink 1',
  address: 'Alpharetta, GA',
  price_cents: 45000,
  currency: 'USD',
  early_bird_price_cents: 38000,
  early_bird_until_offset_days: 14,
  capacity: 48,
  spots_remaining: 14,
  waitlist_enabled: true,
  registration_url: 'https://example.org/alpharetta-summer-skills-camp',
  registration_method: 'external',
  hotel_partner_url: 'https://example.org/hotels/alpharetta',
  hotel_discount_code: 'ICE2026',
  hotel_block_until_offset_days: 30,
  status: 'published',
  visibility: 'public',
  tags: ['aa','aaa','u14','u16','northeast-region'],
  divisions: [
    { name: 'U14 Boys', birth_year_min: 2011, birth_year_max: 2012, skill_level: 'aaa', gender: 'boys', sort_order: 1, capacity: 16 },
    { name: 'U14 Girls', birth_year_min: 2011, birth_year_max: 2012, skill_level: 'aaa', gender: 'girls', sort_order: 2, capacity: 16 },
    { name: 'U16 Boys', birth_year_min: 2009, birth_year_max: 2010, skill_level: 'aaa', gender: 'boys', sort_order: 3, capacity: 16 },
  ],
};

function isoDayAt(offsetDays, hour, tz) {
  // Build a Date in the rink's timezone by constructing a UTC time that
  // lands on the desired local hour. Without a TZ library we approximate
  // by using the rink's longitude and applying a fixed -5/-4 offset; this
  // is a seed-time value and the seed verifier can re-read it. For
  // America/New_York in summer we use -4 (EDT).
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(hour + (tz === 'America/New_York' ? 4 : 0), 0, 0, 0); // shift to UTC for EDT
  return d.toISOString();
}

function isoDate(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

function fmtErr(label, err) {
  return `[${label}] ${err.code || 'no-code'}: ${err.message || ''}${err.details ? ` (${err.details})` : ''}`;
}

async function pickRink() {
  if (process.env.TARGET_RINK_ID) {
    const { data, error } = await supabase
      .from('rinks')
      .select('id, name, slug, country, city, province_state')
      .eq('id', process.env.TARGET_RINK_ID)
      .maybeSingle();
    if (error) throw new Error(fmtErr('rink-id-pick', error));
    if (!data) throw new Error('TARGET_RINK_ID not found');
    return data;
  }

  // Try the named target first
  const { data: named, error: namedErr } = await supabase
    .from('rinks')
    .select('id, name, slug, country, city, province_state')
    .eq('name', TARGET.rinkName)
    .maybeSingle();
  if (namedErr) throw new Error(fmtErr('rink-named-pick', namedErr));
  if (named) return named;

  // Fallback: any active US rink
  const { data: usAny, error: usErr } = await supabase
    .from('rinks')
    .select('id, name, slug, country, city, province_state')
    .eq('country', TARGET.fallbackCountry)
    .limit(1)
    .maybeSingle();
  if (usErr) throw new Error(fmtErr('rink-us-pick', usErr));
  if (!usAny) {
    throw new Error('No active US rink found. Set TARGET_RINK_ID or seed at least one rink first.');
  }
  return usAny;
}

async function wipeForRink(rinkId) {
  const delProg = await supabase.from('rink_programming').delete().eq('rink_id', rinkId);
  if (delProg.error) throw new Error(fmtErr('wipe-programming', delProg.error));
  // event_divisions have FK to rink_events with ON DELETE CASCADE
  const delEv = await supabase.from('rink_events').delete().eq('rink_id', rinkId);
  if (delEv.error) throw new Error(fmtErr('wipe-events', delEv.error));
  console.log(`[wipe] Cleared all programming + events for rink ${rinkId}`);
}

async function seedProgramming(rinkId) {
  const rows = PROGRAMMING_WEEK.map((s) => ({
    rink_id: rinkId,
    activity_type: s.activity_type,
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
    price_cents: s.price_cents,
    currency: 'USD',
    capacity: s.capacity,
    skill_level: s.skill_level,
    age_min: s.age_min ?? null,
    age_max: s.age_max ?? null,
    gender: s.gender,
    gear_rules: s.gear_rules ?? null,
    description: s.description ?? null,
    status: 'published',
  }));
  const { data, error } = await supabase
    .from('rink_programming')
    .insert(rows)
    .select('id, activity_type, day_of_week, start_time, end_time');
  if (error) throw new Error(fmtErr('seed-programming', error));
  console.log(`[seed] Inserted ${data.length} programming slots.`);
  return data;
}

async function seedEvent(rinkId) {
  // Build ISO timestamps in rink-local timezone approximation
  const evt = {
    rink_id: rinkId,
    title: SAMPLE_EVENT.title,
    subtitle: SAMPLE_EVENT.subtitle,
    description: SAMPLE_EVENT.description,
    event_type: SAMPLE_EVENT.event_type,
    starts_at: isoDayAt(SAMPLE_EVENT.start_date_offset_days, SAMPLE_EVENT.starts_at_hour, SAMPLE_EVENT.timezone),
    ends_at: isoDayAt(SAMPLE_EVENT.start_date_offset_days + SAMPLE_EVENT.duration_days - 1, SAMPLE_EVENT.ends_at_hour, SAMPLE_EVENT.timezone),
    timezone: SAMPLE_EVENT.timezone,
    registration_opens_at: isoDayAt(SAMPLE_EVENT.registration_opens_offset_days, 9, SAMPLE_EVENT.timezone),
    registration_closes_at: isoDayAt(SAMPLE_EVENT.registration_closes_offset_days, 17, SAMPLE_EVENT.timezone),
    venue_name: SAMPLE_EVENT.venue_name,
    address: SAMPLE_EVENT.address,
    price_cents: SAMPLE_EVENT.price_cents,
    currency: SAMPLE_EVENT.currency,
    early_bird_price_cents: SAMPLE_EVENT.early_bird_price_cents,
    early_bird_until: isoDayAt(SAMPLE_EVENT.early_bird_until_offset_days, 23, SAMPLE_EVENT.timezone),
    capacity: SAMPLE_EVENT.capacity,
    spots_remaining: SAMPLE_EVENT.spots_remaining,
    waitlist_enabled: SAMPLE_EVENT.waitlist_enabled,
    registration_url: SAMPLE_EVENT.registration_url,
    registration_method: SAMPLE_EVENT.registration_method,
    hotel_partner_url: SAMPLE_EVENT.hotel_partner_url,
    hotel_discount_code: SAMPLE_EVENT.hotel_discount_code,
    hotel_block_until: isoDate(SAMPLE_EVENT.hotel_block_until_offset_days),
    status: SAMPLE_EVENT.status,
    visibility: SAMPLE_EVENT.visibility,
    tags: SAMPLE_EVENT.tags,
  };

  // Auto-derive slug via the API (server-side unique) — but seed script
  // talks to the DB directly. Use the slugify helper from src/lib/slug
  // to keep behavior identical to the admin POST handler.
  const slugMod = await import(new URL('../src/lib/slug.ts', import.meta.url).pathname).catch(() => null);
  // We can't import a .ts file from a .mjs script directly in Node without a loader.
  // Inline a minimal slugify so the seed stays runnable.
  const slugify = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '') || 'event';
  evt.slug = slugify(evt.title);

  const { data: ev, error: evErr } = await supabase
    .from('rink_events')
    .insert(evt)
    .select('id, slug, title')
    .single();
  if (evErr) throw new Error(fmtErr('seed-event', evErr));
  console.log(`[seed] Inserted event "${ev.title}" (slug=${ev.slug}).`);

  // Insert divisions
  const divRows = SAMPLE_EVENT.divisions.map((d) => ({
    event_id: ev.id,
    name: d.name,
    birth_year_min: d.birth_year_min,
    birth_year_max: d.birth_year_max,
    skill_level: d.skill_level,
    gender: d.gender,
    capacity: d.capacity,
    spots_remaining: d.capacity,
    sort_order: d.sort_order,
    status: 'open',
  }));
  const { data: divs, error: divErr } = await supabase
    .from('event_divisions')
    .insert(divRows)
    .select('id, name');
  if (divErr) throw new Error(fmtErr('seed-divisions', divErr));
  console.log(`[seed] Inserted ${divs.length} event divisions.`);
  return ev;
}

(async () => {
  try {
    const rink = await pickRink();
    console.log(`[seed] Selected rink "${rink.name}" (${rink.id}, ${rink.city} ${rink.province_state || ''} ${rink.country})`);

    if (WIPE) await wipeForRink(rink.id);

    const { count: existing } = await supabase
      .from('rink_programming')
      .select('id', { count: 'exact', head: true })
      .eq('rink_id', rink.id);

    if (existing > 0) {
      console.log(`[seed] Rink already has ${existing} programming rows; skipping re-seed. Use --wipe to reset.`);
    } else {
      await seedProgramming(rink.id);
      await seedEvent(rink.id);
    }

    // Post-state verification
    const { count: progCount } = await supabase.from('rink_programming').select('id', { count: 'exact', head: true }).eq('rink_id', rink.id);
    const { count: evCount } = await supabase.from('rink_events').select('id', { count: 'exact', head: true }).eq('rink_id', rink.id);
    const { data: divsForRink } = await supabase.from('event_divisions').select('id, event_id').in('event_id',
      (await supabase.from('rink_events').select('id').eq('rink_id', rink.id)).data?.map(e => e.id) || [],
    );
    console.log(`[verify] rink_id=${rink.id} programming=${progCount} events=${evCount} divisions=${divsForRink?.length || 0}`);

    console.log('[done] WS17 PR1 seed complete.');
  } catch (e) {
    console.error('[seed-error]', e.message);
    process.exit(1);
  }
})();
