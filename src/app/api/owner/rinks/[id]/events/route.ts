// src/app/api/owner/rinks/[id]/events/route.ts
//
// WS17 PR3b - Owner events list + create.
//
//   GET  /api/owner/rinks/[id]/events
//   POST /api/owner/rinks/[id]/events
//
// RLS-gated: signed-in user must own the rink (rinks.claimed_by_user_id).

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwner } from '@/lib/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { uniqueSlug } from '@/lib/slug';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

const EVENT_TYPES = new Set([
  'tournament','camp','clinic','tryout','showcase',
  'exhibition','lesson_series','training','skills_session',
]);
const VISIBILITIES = new Set(['public','unlisted','private']);
const STATUSES = new Set(['draft','published','cancelled','completed']);
const REG_METHODS = new Set(['external','rinkstop','eventconnect','sportninja']);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function asPositiveIntOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) return NaN;
  return Math.trunc(v);
}

type IsoResult = { ok: true; value: string | null } | { ok: false; error: string };
function parseIsoOrNull(v: unknown): IsoResult {
  if (v === undefined || v === null || v === '') return { ok: true, value: null };
  if (typeof v !== 'string') return { ok: false, error: 'not a string' };
  const d = new Date(v);
  if (isNaN(d.getTime())) return { ok: false, error: 'invalid ISO timestamp' };
  return { ok: true, value: d.toISOString() };
}

function validateCreateBody(body: Record<string, unknown>): string | null {
  if (!body || typeof body !== 'object') return 'Body must be JSON.';
  if (typeof body.title !== 'string' || body.title.trim().length === 0) return 'title is required.';
  if (typeof body.event_type !== 'string' || !EVENT_TYPES.has(body.event_type)) {
    return `event_type must be one of: ${[...EVENT_TYPES].join(', ')}`;
  }
  if (typeof body.starts_at !== 'string' || Number.isNaN(Date.parse(body.starts_at))) {
    return 'starts_at must be an ISO 8601 timestamp.';
  }
  if (typeof body.ends_at !== 'string' || Number.isNaN(Date.parse(body.ends_at))) {
    return 'ends_at must be an ISO 8601 timestamp.';
  }
  if (Date.parse(body.starts_at as string) >= Date.parse(body.ends_at as string)) {
    return 'ends_at must be after starts_at.';
  }
  if (body.status !== undefined && !STATUSES.has(body.status as string)) {
    return `status must be one of: ${[...STATUSES].join(', ')}`;
  }
  if (body.visibility !== undefined && !VISIBILITIES.has(body.visibility as string)) {
    return `visibility must be one of: ${[...VISIBILITIES].join(', ')}`;
  }
  if (body.registration_method !== undefined && body.registration_method !== null && !REG_METHODS.has(body.registration_method as string)) {
    return `registration_method must be one of: ${[...REG_METHODS].join(', ')} (or null).`;
  }
  for (const k of ['price_cents','early_bird_price_cents','capacity','spots_remaining'] as const) {
    const v = body[k];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'number' || v < 0) return `${k} must be a non-negative integer (or null).`;
  }
  if (body.tags !== undefined && body.tags !== null) {
    if (!Array.isArray(body.tags) || !body.tags.every((t: unknown) => typeof t === 'string')) {
      return 'tags must be an array of strings (or null).';
    }
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`owner-rink-events-list:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  const { data, error } = await supabaseAdmin
    .from('rink_events')
    .select(`
      id, rink_id, slug, title, subtitle, event_type,
      starts_at, ends_at, timezone,
      registration_opens_at, registration_closes_at,
      venue_name, address, latitude, longitude,
      price_cents, currency,
      early_bird_price_cents, early_bird_until,
      capacity, spots_remaining, waitlist_enabled,
      banner_image_url, logo_url,
      registration_url, registration_method,
      eventconnect_id, sportninja_id,
      hotel_partner_url, hotel_discount_code, hotel_block_until,
      status, visibility, tags, created_at, updated_at
    `)
    .eq('rink_id', owner.owner.rinkId)
    .order('starts_at', { ascending: false });

  if (error) {
    console.error('[owner-events] list failed', error);
    return NextResponse.json({ error: 'Failed to load events.' }, { status: 500 });
  }

  return NextResponse.json({ events: data || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`owner-rink-events-create:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const { id } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON.');
  }

  const validationError = validateCreateBody(body);
  if (validationError) return badRequest(validationError);

  const slug = await uniqueSlug(body.title as string, async (candidate) => {
    const { count } = await supabaseAdmin
      .from('rink_events')
      .select('id', { count: 'exact', head: true })
      .eq('slug', candidate);
    return (count ?? 0) > 0;
  });

  const startsAt = new Date(body.starts_at as string).toISOString();
  const endsAt   = new Date(body.ends_at as string).toISOString();
  const regOpens  = parseIsoOrNull(body.registration_opens_at);
  const regCloses = parseIsoOrNull(body.registration_closes_at);
  if (regOpens.ok === false)  return badRequest(`registration_opens_at: ${regOpens.error}`);
  if (regCloses.ok === false) return badRequest(`registration_closes_at: ${regCloses.error}`);
  const earlyBird = parseIsoOrNull(body.early_bird_until);
  if (earlyBird.ok === false) return badRequest(`early_bird_until: ${earlyBird.error}`);

  const insert = {
    rink_id: owner.owner.rinkId,
    slug,
    title: (body.title as string).trim(),
    subtitle: typeof body.subtitle === 'string' ? (body.subtitle as string).slice(0, 1000) : null,
    description: typeof body.description === 'string' ? (body.description as string).slice(0, 20000) : null,
    event_type: body.event_type,
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: typeof body.timezone === 'string' && body.timezone.length > 0 ? body.timezone : 'America/New_York',
    registration_opens_at: regOpens.value,
    registration_closes_at: regCloses.value,
    venue_name: typeof body.venue_name === 'string' ? (body.venue_name as string).slice(0, 500) : null,
    address:    typeof body.address === 'string' ? (body.address as string).slice(0, 2000) : null,
    latitude:  typeof body.latitude  === 'number' ? body.latitude  : null,
    longitude: typeof body.longitude === 'number' ? body.longitude : null,
    price_cents:   asPositiveIntOrNull(body.price_cents) ?? null,
    currency:      typeof body.currency === 'string' && body.currency.length === 3 ? (body.currency as string).toUpperCase() : 'USD',
    early_bird_price_cents: asPositiveIntOrNull(body.early_bird_price_cents) ?? null,
    early_bird_until: earlyBird.value,
    capacity:        asPositiveIntOrNull(body.capacity) ?? null,
    spots_remaining: asPositiveIntOrNull(body.spots_remaining) ?? null,
    waitlist_enabled: typeof body.waitlist_enabled === 'boolean' ? body.waitlist_enabled : false,
    banner_image_url: typeof body.banner_image_url === 'string' ? (body.banner_image_url as string).slice(0, 2048) : null,
    logo_url:         typeof body.logo_url === 'string' ? (body.logo_url as string).slice(0, 2048) : null,
    registration_url:    typeof body.registration_url === 'string' ? (body.registration_url as string).slice(0, 2048) : null,
    registration_method: body.registration_method ?? null,
    eventconnect_id: typeof body.eventconnect_id === 'string' ? (body.eventconnect_id as string).slice(0, 200) : null,
    sportninja_id:   typeof body.sportninja_id === 'string' ? (body.sportninja_id as string).slice(0, 200) : null,
    hotel_partner_url:   typeof body.hotel_partner_url === 'string' ? (body.hotel_partner_url as string).slice(0, 2048) : null,
    hotel_discount_code: typeof body.hotel_discount_code === 'string' ? (body.hotel_discount_code as string).slice(0, 100) : null,
    hotel_block_until:   typeof body.hotel_block_until === 'string' ? body.hotel_block_until : null,
    status:     body.status     ?? 'draft',
    visibility: body.visibility ?? 'public',
    source_url: typeof body.source_url === 'string' ? (body.source_url as string).slice(0, 2048) : null,
    tags: Array.isArray(body.tags) ? (body.tags as string[]).slice(0, 32) : null,
  };

  const { data, error } = await supabaseAdmin
    .from('rink_events')
    .insert(insert)
    .select('id, slug')
    .single();

  if (error) {
    console.error('[owner-events] insert failed', error);
    return NextResponse.json({ error: 'Failed to create event.' }, { status: 500 });
  }

  return NextResponse.json({ event: data }, { status: 201 });
}
