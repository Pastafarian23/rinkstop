// src/app/api/rink-connections/booking-requests/route.ts
//
// WS17 PR4 - Booking requests.
//
//   GET  /api/rink-connections/booking-requests   — list my booking requests
//   POST /api/rink-connections/booking-requests  — submit a new booking request
//   POST also triggers notifyBookingRequestCreated for rink owners

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyBookingRequestCreated } from '@/lib/rink-notifications';
import { checkRateLimit, applyRateLimitHeaders } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Security audit 2026-08-26 fix #5: rate limit booking request submissions.
// 20 creates/hr per user prevents spam/DoS without blocking legitimate use.
const POST_RATE_LIMIT = { maxRequests: 20, windowMs: 60 * 60 * 1000 };

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('booking_requests')
    .select(`
      id, listing_id, connection_id, rink_id, status,
      requested_price_cents, counter_price_cents,
      requested_start, requested_end, notes, publish_as_event, created_event_id,
      activity_log, created_at, updated_at,
      listing:ice_listings(id, title, start_time, end_time, slot_type),
      rink:rinks(id, name, slug)
    `)
    .eq('requesting_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[booking-requests] list failed', error);
    return NextResponse.json({ error: 'Failed to load booking requests.' }, { status: 500 });
  }

  return NextResponse.json({ requests: data || [] });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  // Security audit 2026-08-26 fix #5: rate limit to prevent spam.
  const rateKey = `booking-request:user:${userId}`;
  const rateResult = await checkRateLimit(rateKey, POST_RATE_LIMIT);
  if (!rateResult.allowed) {
    const resp = NextResponse.json(
      { error: 'Too many booking requests. Please try again later.' },
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

  if (!body.connection_id || typeof body.connection_id !== 'string') {
    return badRequest('connection_id is required.');
  }
  if (!body.rink_id || typeof body.rink_id !== 'string') {
    return badRequest('rink_id is required.');
  }
  if (!body.requested_start || !body.requested_end) {
    return badRequest('requested_start and requested_end are required.');
  }
  if (body.requested_price_cents !== undefined && body.requested_price_cents !== null && (typeof body.requested_price_cents !== 'number' || body.requested_price_cents < 0)) {
    return badRequest('requested_price_cents must be a non-negative number or null.');
  }

  // Verify the connection exists
  const { data: conn } = await supabaseAdmin
    .from('rink_org_connections')
    .select('id')
    .eq('id', body.connection_id as string)
    .eq('rink_id', body.rink_id as string)
    .single();

  if (!conn) {
    return NextResponse.json({ error: 'Connection not found.' }, { status: 404 });
  }

  const now = new Date().toISOString();

  const insert: Record<string, unknown> = {
    connection_id: body.connection_id as string,
    listing_id: (body.listing_id as string) || null,
    rink_id: body.rink_id as string,
    requesting_user_id: userId,
    status: 'pending',
    requested_price_cents: (body.requested_price_cents as number | null) ?? null,
    counter_price_cents: null,
    requested_start: body.requested_start as string,
    requested_end: body.requested_end as string,
    notes: (body.notes as string)?.trim() || null,
    publish_as_event: false,
    activity_log: [{
      action: 'created',
      by: userId,
      at: now,
      note: 'Booking request submitted.',
    }],
  };

  const { data, error } = await supabaseAdmin
    .from('booking_requests')
    .insert(insert)
    .select('id')
    .single();

  if (error) {
    console.error('[booking-requests] insert failed', error);
    return NextResponse.json({ error: 'Failed to submit booking request.' }, { status: 500 });
  }

  // Fire-and-forget: notify rink owners of new booking request
  // Errors here must not block the response.
  const requestId = data?.id;
  if (requestId) {
    // Resolve rink owner user IDs + rink name + requester name in parallel
    const [ownersResult, requesterResult, rinkResult] = await Promise.all([
      supabaseAdmin.from('rink_owners').select('user_id').eq('rink_id', body.rink_id as string),
      supabaseAdmin.from('profiles').select('full_name').eq('user_id', userId).single(),
      supabaseAdmin.from('rinks').select('name').eq('id', body.rink_id as string).single(),
    ]);

    const ownerIds = (ownersResult.data ?? []).map((o: any) => o.user_id).filter(Boolean);
    const requesterName = (requesterResult.data as any)?.full_name ?? 'A customer';
    const rinkName = (rinkResult.data as any)?.name ?? 'this rink';

    if (ownerIds.length > 0) {
      notifyBookingRequestCreated({
        rinkId: body.rink_id as string,
        rinkOwnerUserIds: ownerIds,
        requesterName,
        requestedAt: now,
        rinkName,
        callerInsertId: requestId,
      }).catch(err => console.error('[booking-requests] notifyBookingRequestCreated failed', err));
    }
  }

  return NextResponse.json({ id: data?.id }, { status: 201 });
}
