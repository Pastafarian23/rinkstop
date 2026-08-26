// src/app/api/owner/rinks/[id]/ice-listings/[listingId]/route.ts
//
// WS17 PR4 - Single ice listing update/delete for rink owners.
//
//   PATCH /api/owner/rinks/[id]/ice-listings/[listingId]  — update
//   DELETE /api/owner/rinks/[id]/ice-listings/[listingId]  — remove

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwner } from '@/lib/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, applyRateLimitHeaders } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Security audit 2026-08-26 fix #5: rate limit ice listing mutations.
// PATCH: 60/hr per listing. DELETE: 30/hr per listing.
const PATCH_RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 60 * 1000 };
const DELETE_RATE_LIMIT = { maxRequests: 30, windowMs: 60 * 60 * 1000 };

const VALID_SLOT_TYPES = new Set(['practice','game','tournament','camp','clinic','lesson','other']);
const VALID_VISIBILITIES = new Set(['public','connections_only']);
const VALID_STATUSES = new Set(['available','pending','booked','cancelled']);

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; listingId: string }> },
) {
  const { id, listingId } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  // Security audit 2026-08-26 fix #5.
  const rateKey = `ice-listing-patch:${listingId}`;
  const rateResult = await checkRateLimit(rateKey, PATCH_RATE_LIMIT);
  if (!rateResult.allowed) {
    const resp = NextResponse.json(
      { error: 'Too many update attempts on this listing. Please try again later.' },
      { status: 429 },
    );
    return applyRateLimitHeaders(resp, rateResult);
  }

  const { data: existing } = await supabaseAdmin
    .from('ice_listings')
    .select('id')
    .eq('id', listingId)
    .eq('rink_id', owner.owner.rinkId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Ice listing not found.' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON.');
  }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) return badRequest('title cannot be empty.');
    updates.title = (body.title as string).trim();
  }
  if (body.description !== undefined) updates.description = (body.description as string)?.trim() || null;
  if (body.requested_price_cents !== undefined) {
    if (body.requested_price_cents !== null && (typeof body.requested_price_cents !== 'number' || body.requested_price_cents < 0)) {
      return badRequest('requested_price_cents must be a non-negative number or null.');
    }
    updates.requested_price_cents = body.requested_price_cents;
  }
  if (body.start_time !== undefined) updates.start_time = body.start_time;
  if (body.end_time !== undefined) updates.end_time = body.end_time;
  if (body.timezone !== undefined) updates.timezone = body.timezone;
  if (body.age_group !== undefined) updates.age_group = (body.age_group as string)?.trim() || null;
  if (body.skill_level !== undefined) updates.skill_level = (body.skill_level as string)?.trim() || null;
  if (body.slot_type !== undefined) {
    if (!VALID_SLOT_TYPES.has(body.slot_type as string)) return badRequest(`slot_type must be one of: ${[...VALID_SLOT_TYPES].join(', ')}.`);
    updates.slot_type = body.slot_type;
  }
  if (body.visibility !== undefined) {
    if (!VALID_VISIBILITIES.has(body.visibility as string)) return badRequest('visibility must be public or connections_only.');
    updates.visibility = body.visibility;
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.has(body.status as string)) return badRequest('status must be available, pending, booked, or cancelled.');
    updates.status = body.status;
  }
  updates.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('ice_listings')
    .update(updates)
    .eq('id', listingId);

  if (error) {
    console.error('[ice-listings] update failed', error);
    return NextResponse.json({ error: 'Failed to update ice listing.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; listingId: string }> },
) {
  const { id, listingId } = await params;
  const owner = await requireRinkOwner(request, id);
  if ('response' in owner) return owner.response;

  // Security audit 2026-08-26 fix #5.
  const rateKey = `ice-listing-delete:${listingId}`;
  const rateResult = await checkRateLimit(rateKey, DELETE_RATE_LIMIT);
  if (!rateResult.allowed) {
    const resp = NextResponse.json(
      { error: 'Too many delete attempts on this listing. Please try again later.' },
      { status: 429 },
    );
    return applyRateLimitHeaders(resp, rateResult);
  }

  const { error } = await supabaseAdmin
    .from('ice_listings')
    .delete()
    .eq('id', listingId)
    .eq('rink_id', owner.owner.rinkId);

  if (error) {
    console.error('[ice-listings] delete failed', error);
    return NextResponse.json({ error: 'Failed to remove ice listing.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
