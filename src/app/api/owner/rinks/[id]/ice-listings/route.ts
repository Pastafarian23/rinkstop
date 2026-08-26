// src/app/api/owner/rinks/[id]/ice-listings/route.ts
//
// WS17 PR4 - Ice listings for rink owners.
//
//   GET  /api/owner/rinks/[id]/ice-listings     — list all ice listings
//   POST /api/owner/rinks/[id]/ice-listings    — create a new ice listing

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwner } from '@/lib/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, applyRateLimitHeaders } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Security audit 2026-08-26 fix #5: rate limit ice listing creation.
// 30 creates/hr per rink prevents spam / inventory flooding.
const POST_RATE_LIMIT = { maxRequests: 30, windowMs: 60 * 60 * 1000 };

const VALID_SLOT_TYPES = new Set(['practice','game','tournament','camp','clinic','lesson','other']);
const VALID_VISIBILITIES = new Set(['public','connections_only']);
const VALID_STATUSES = new Set(['available','pending','booked','cancelled']);

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  const { data, error } = await supabaseAdmin
    .from('ice_listings')
    .select('id, rink_id, title, description, requested_price_cents, currency, start_time, end_time, timezone, age_group, skill_level, slot_type, visibility, status, created_at, updated_at')
    .eq('rink_id', owner.owner.rinkId)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[ice-listings] list failed', error);
    return NextResponse.json({ error: 'Failed to load ice listings.' }, { status: 500 });
  }

  return NextResponse.json({ listings: data || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  // Security audit 2026-08-26 fix #5: rate limit per rink.
  const rateKey = `ice-listing:user:${owner.owner.rinkId}`;
  const rateResult = await checkRateLimit(rateKey, POST_RATE_LIMIT);
  if (!rateResult.allowed) {
    const resp = NextResponse.json(
      { error: 'Too many listings created. Please try again later.' },
      { status: 429 },
    );
    return applyRateLimitHeaders(resp, rateResult);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON.');
  }

  if (typeof body.title !== 'string' || !body.title.trim()) {
    return badRequest('title is required.');
  }
  if (!body.start_time || !body.end_time) {
    return badRequest('start_time and end_time are required.');
  }
  if (!VALID_SLOT_TYPES.has(body.slot_type as string)) {
    return badRequest(`slot_type must be one of: ${[...VALID_SLOT_TYPES].join(', ')}.`);
  }
  if (body.visibility && !VALID_VISIBILITIES.has(body.visibility as string)) {
    return badRequest('visibility must be public or connections_only.');
  }
  if (body.status && !VALID_STATUSES.has(body.status as string)) {
    return badRequest('status must be available, pending, booked, or cancelled.');
  }
  if (body.requested_price_cents !== undefined && body.requested_price_cents !== null && (typeof body.requested_price_cents !== 'number' || body.requested_price_cents < 0)) {
    return badRequest('requested_price_cents must be a non-negative number or null.');
  }

  const insert = {
    rink_id: owner.owner.rinkId,
    title: (body.title as string).trim(),
    description: (body.description as string)?.trim() || null,
    requested_price_cents: body.requested_price_cents ?? null,
    currency: (body.currency as string) || 'USD',
    start_time: body.start_time,
    end_time: body.end_time,
    timezone: (body.timezone as string) || 'America/New_York',
    age_group: (body.age_group as string)?.trim() || null,
    skill_level: (body.skill_level as string)?.trim() || null,
    slot_type: body.slot_type as string,
    visibility: (body.visibility as string) || 'public',
    status: (body.status as string) || 'available',
  };

  const { data, error } = await supabaseAdmin
    .from('ice_listings')
    .insert(insert)
    .select('id')
    .single();

  if (error) {
    console.error('[ice-listings] insert failed', error);
    return NextResponse.json({ error: 'Failed to create ice listing.' }, { status: 500 });
  }

  return NextResponse.json({ id: data?.id }, { status: 201 });
}
