// src/app/api/admin/rinks/[id]/programming/route.ts
//
// WS17 PR1 - Programming & Events Directory.
//
// Admin CRUD for recurring weekly programming at a rink.
//
//   GET  /api/admin/rinks/[id]/programming
//        -> list all programming slots for the rink (any status, admin-only)
//   POST /api/admin/rinks/[id]/programming
//        -> create a new slot. Body: see schema. created_by = current admin.
//
// Tier gating: admin-only via getAdminFromRequest(). Rink-owner (paid tier)
// write paths come in PR3 (/dashboard/rink/[slug]/programming) — those reuse
// the same /api/admin/rinks/*.[id] helper via a side-channel gate.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

const ACTIVITY_TYPES = new Set([
  'stick_and_puck','public_skate','learn_to_skate','open_hockey',
  'adult_league','youth_league','drop_in','pickup','figure_skating',
  'power_skating','rat_hockey','shinny','skate_school','broomball',
]);
const SKILL_LEVELS = new Set(['beginner','intermediate','advanced','all']);
const GENDERS = new Set(['boys','girls','coed','all']);
const STATUSES = new Set(['draft','published','archived']);
const HHMM_RE = /^\d{2}:\d{2}(?::\d{2})?$/;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function asPositiveIntOrNull(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) return NaN;
  return Math.trunc(v);
}

function validateCreateBody(body: Record<string, any>) {
  if (!body || typeof body !== 'object') return 'Body must be JSON.';
  if (typeof body.activity_type !== 'string' || !ACTIVITY_TYPES.has(body.activity_type)) {
    return `activity_type must be one of: ${[...ACTIVITY_TYPES].join(', ')}`;
  }
  if (typeof body.day_of_week !== 'number' || body.day_of_week < 0 || body.day_of_week > 6) {
    return 'day_of_week must be an integer 0..6 (Sun..Sat).';
  }
  if (typeof body.start_time !== 'string' || !HHMM_RE.test(body.start_time)) {
    return 'start_time must be an HH:MM string.';
  }
  if (typeof body.end_time !== 'string' || !HHMM_RE.test(body.end_time)) {
    return 'end_time must be an HH:MM string.';
  }
  if (body.start_time >= body.end_time) return 'end_time must be after start_time.';
  if (body.skill_level !== undefined && body.skill_level !== null && !SKILL_LEVELS.has(body.skill_level)) {
    return `skill_level must be one of: ${[...SKILL_LEVELS].join(', ')} (or null).`;
  }
  if (body.gender !== undefined && body.gender !== null && !GENDERS.has(body.gender)) {
    return `gender must be one of: ${[...GENDERS].join(', ')} (or null).`;
  }
  if (body.status !== undefined && !STATUSES.has(body.status)) {
    return `status must be one of: ${[...STATUSES].join(', ')}`;
  }
  if (body.price_cents !== undefined && body.price_cents !== null) {
    if (typeof body.price_cents !== 'number' || body.price_cents < 0) return 'price_cents must be a non-negative integer (or null).';
  }
  for (const k of ['capacity','age_min','age_max'] as const) {
    const v = body[k];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'number' || v < 0) return `${k} must be a non-negative integer (or null).`;
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`admin-rink-programming-list:${getClientIP(_request)}`, RATE_LIMIT);
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
    .from('rink_programming')
    .select('id, rink_id, activity_type, day_of_week, start_time, end_time, price_cents, currency, capacity, skill_level, age_min, age_max, gender, booking_url, booking_method, gear_rules, description, status, effective_from, effective_until, created_by, updated_by, created_at, updated_at')
    .eq('rink_id', id)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[admin-rink-programming] list failed', error);
    return NextResponse.json({ error: 'Failed to load programming.' }, { status: 500 });
  }

  return NextResponse.json({ programming: data || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`admin-rink-programming-create:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const gate = await getAdminFromRequest(request, 'admin_rinks_programming');
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

  // Verify rink exists (fast path: don't write orphan rows).
  const { data: rink, error: rinkErr } = await supabaseAdmin
    .from('rinks')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (rinkErr) {
    console.error('[admin-rink-programming] rink lookup failed', rinkErr);
    return NextResponse.json({ error: 'Failed to look up rink.' }, { status: 500 });
  }
  if (!rink) return NextResponse.json({ error: 'rink_not_found' }, { status: 404 });

  const insert = {
    rink_id: id,
    activity_type: body.activity_type,
    day_of_week: body.day_of_week,
    start_time: body.start_time,
    end_time: body.end_time,
    price_cents: asPositiveIntOrNull(body.price_cents) ?? null,
    currency: typeof body.currency === 'string' && body.currency.length === 3 ? body.currency.toUpperCase() : 'USD',
    capacity: asPositiveIntOrNull(body.capacity) ?? null,
    skill_level: body.skill_level ?? null,
    age_min: asPositiveIntOrNull(body.age_min) ?? null,
    age_max: asPositiveIntOrNull(body.age_max) ?? null,
    gender: body.gender ?? null,
    booking_url: typeof body.booking_url === 'string' ? body.booking_url.slice(0, 2048) : null,
    booking_method: body.booking_method ?? null,
    gear_rules: typeof body.gear_rules === 'string' ? body.gear_rules.slice(0, 4000) : null,
    description: typeof body.description === 'string' ? body.description.slice(0, 4000) : null,
    status: body.status ?? 'published',
    effective_from: typeof body.effective_from === 'string' ? body.effective_from : null,
    effective_until: typeof body.effective_until === 'string' ? body.effective_until : null,
    created_by: gate.admin.userId,
    updated_by: gate.admin.userId,
  };

  const { data, error } = await supabaseAdmin
    .from('rink_programming')
    .insert(insert)
    .select()
    .single();
  if (error) {
    console.error('[admin-rink-programming] insert failed', error);
    return NextResponse.json({ error: 'Failed to create programming slot.' }, { status: 500 });
  }

  return NextResponse.json({ programming: data }, { status: 201 });
}
