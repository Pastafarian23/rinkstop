// src/app/api/admin/rinks/[id]/events/route.ts
//
// WS17 PR1 - one-off events admin CRUD (list + create).
//
//   GET  /api/admin/rinks/[id]/events
//   POST /api/admin/rinks/[id]/events
//
// Tier gating: admin-only via getAdminFromRequest(). Rink-owner
// (Starter+) write paths come in PR3.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
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

/**
 * Normalize a user-supplied ISO 8601 timestamp to either an ISO string, an
 * explicit null, or an error message. We return a discriminated result
 * instead of throwing so the caller can keep request flow linear.
 */
type IsoResult = { ok: true; value: string | null } | { ok: false; error: string };
function parseIsoOrNull(v: unknown): IsoResult {
  if (v === undefined || v === null || v === '') return { ok: true, value: null };
  if (typeof v !== 'string') return { ok: false, error: 'not a string' };
  const d = new Date(v);
  if (isNaN(d.getTime())) return { ok: false, error: 'invalid ISO timestamp' };
  return { ok: true, value: d.toISOString() };
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function asPositiveIntOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) return NaN;
  return Math.trunc(v);
}

function validateCreateBody(body: Record<string, any>): string | null {
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
  if (Date.parse(body.starts_at) >= Date.parse(body.ends_at)) return 'ends_at must be after starts_at.';
  if (body.status !== undefined && !STATUSES.has(body.status)) {
    return `status must be one of: ${[...STATUSES].join(', ')}`;
  }
  if (body.visibility !== undefined && !VISIBILITIES.has(body.visibility)) {
    return `visibility must be one of: ${[...VISIBILITIES].join(', ')}`;
  }
  if (body.registration_method !== undefined && body.registration_method !== null && !REG_METHODS.has(body.registration_method)) {
    return `registration_method must be one of: ${[...REG_METHODS].join(', ')} (or null).`;
  }
  for (const k of ['price_cents','early_bird_price_cents','capacity','spots_remaining'] as const) {
    const v = body[k];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'number' || v < 0) return `${k} must be a non-negative integer (or null).`;
  }
  if (body.tags !== undefined && body.tags !== null) {
    if (!Array.isArray(body.tags) || !body.tags.every((t: any) => typeof t === 'string')) {
      return 'tags must be an array of strings (or null).';
    }
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`admin-rink-events-list:${getClientIP(_request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const gate = await getAdminFromRequest();
  if ('response' in gate) return gate.response;
  const { id } = await params;
  if (!id || typeof id !== 'string') return badRequest('rink id is required.');

  const { data, error } = await supabaseAdmin
    .from('rink_events')
    .select('id, rink_id, slug, title, subtitle, event_type, starts_at, ends_at, timezone, registration_opens_at, registration_closes_at, price_cents, currency, early_bird_price_cents, early_bird_until, capacity, spots_remaining, waitlist_enabled, banner_image_url, logo_url, registration_url, registration_method, eventconnect_id, sportninja_id, hotel_partner_url, hotel_discount_code, hotel_block_until, status, visibility, source_url, tags, created_at, updated_at')
    .eq('rink_id', id)
    .order('starts_at', { ascending: false });

  if (error) {
    console.error('[admin-rink-events] list failed', error);
    return NextResponse.json({ error: 'Failed to load events.' }, { status: 500 });
  }

  return NextResponse.json({ events: data || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`admin-rink-events-create:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const gate = await getAdminFromRequest();
  if ('response' in gate) return gate.response;
  const { id } = await params;
  if (!id || typeof id !== 'string') return badRequest('rink id is required.');

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON.');
  }

  const validationError = validateCreateBody(body);
  if (validationError) return badRequest(validationError);

  // Verify rink exists
  const { data: rink, error: rinkErr } = await supabaseAdmin
    .from('rinks')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (rinkErr) {
    console.error('[admin-rink-events] rink lookup failed', rinkErr);
    return NextResponse.json({ error: 'Failed to look up rink.' }, { status: 500 });
  }
  if (!rink) return NextResponse.json({ error: 'rink_not_found' }, { status: 404 });

  // Auto-generate slug from title (and ensure uniqueness against existing events).
  const slug = await uniqueSlug(body.title, async (candidate) => {
    const { count } = await supabaseAdmin
      .from('rink_events')
      .select('id', { count: 'exact', head: true })
      .eq('slug', candidate);
    return (count ?? 0) > 0;
  });

  // Normalize date fields (any field missing → null)
  const startsAt = new Date(body.starts_at).toISOString();
  const endsAt = new Date(body.ends_at).toISOString();
  const regOpens  = parseIsoOrNull(body.registration_opens_at);
  const regCloses = parseIsoOrNull(body.registration_closes_at);
  if (!regOpens.ok)  return badRequest(`registration_opens_at: ${regOpens.error}`);
  if (!regCloses.ok) return badRequest(`registration_closes_at: ${regCloses.error}`);
  const earlyBird = parseIsoOrNull(body.early_bird_until);
  if (!earlyBird.ok) return badRequest(`early_bird_until: ${earlyBird.error}`);

  const insert = {
    rink_id: id,
    slug,
    title: body.title.trim(),
    subtitle: typeof body.subtitle === 'string' ? body.subtitle.slice(0, 1000) : null,
    description: typeof body.description === 'string' ? body.description.slice(0, 20000) : null,
    event_type: body.event_type,
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: typeof body.timezone === 'string' && body.timezone.length > 0 ? body.timezone : 'America/New_York',
    registration_opens_at: regOpens.value,
    registration_closes_at: regCloses.value,
    venue_name: typeof body.venue_name === 'string' ? body.venue_name.slice(0, 500) : null,
    address:    typeof body.address === 'string' ? body.address.slice(0, 2000) : null,
    latitude:  typeof body.latitude  === 'number' ? body.latitude  : null,
    longitude: typeof body.longitude === 'number' ? body.longitude : null,
    price_cents:   asPositiveIntOrNull(body.price_cents) ?? null,
    currency:      typeof body.currency === 'string' && body.currency.length === 3 ? body.currency.toUpperCase() : 'USD',
    early_bird_price_cents: asPositiveIntOrNull(body.early_bird_price_cents) ?? null,
    early_bird_until: earlyBird.value,
    capacity:        asPositiveIntOrNull(body.capacity) ?? null,
    spots_remaining: asPositiveIntOrNull(body.spots_remaining) ?? null,
    waitlist_enabled: typeof body.waitlist_enabled === 'boolean' ? body.waitlist_enabled : false,
    banner_image_url: typeof body.banner_image_url === 'string' ? body.banner_image_url.slice(0, 2048) : null,
    logo_url:         typeof body.logo_url === 'string' ? body.logo_url.slice(0, 2048) : null,
    registration_url:    typeof body.registration_url === 'string' ? body.registration_url.slice(0, 2048) : null,
    registration_method: body.registration_method ?? null,
    eventconnect_id: typeof body.eventconnect_id === 'string' ? body.eventconnect_id.slice(0, 200) : null,
    sportninja_id:   typeof body.sportninja_id   === 'string' ? body.sportninja_id.slice(0, 200) : null,
    hotel_partner_url:   typeof body.hotel_partner_url === 'string' ? body.hotel_partner_url.slice(0, 2048) : null,
    hotel_discount_code: typeof body.hotel_discount_code === 'string' ? body.hotel_discount_code.slice(0, 100) : null,
    hotel_block_until:   typeof body.hotel_block_until === 'string' ? body.hotel_block_until : null,
    status:     body.status     ?? 'draft',
    visibility: body.visibility ?? 'public',
    source_url: typeof body.source_url === 'string' ? body.source_url.slice(0, 2048) : null,
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 32) : null,
    created_by: gate.admin.userId,
    updated_by: gate.admin.userId,
  };

  const { data, error } = await supabaseAdmin
    .from('rink_events')
    .insert(insert)
    .select()
    .single();
  if (error) {
    console.error('[admin-rink-events] insert failed', error);
    return NextResponse.json({ error: 'Failed to create event.' }, { status: 500 });
  }

  return NextResponse.json({ event: data }, { status: 201 });
}
