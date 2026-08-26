// src/app/api/rink-connections/booking-requests/[id]/route.ts
//
// WS17 PR4 - Single booking request: update (approve/reject/negotiate).
// Also for the requester to edit their own pending request.
// Phase 2B: rink approval now creates a Stripe Checkout session.
//
//   PATCH  /api/rink-connections/booking-requests/[id]  — update status or details

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createCheckoutSession, bookingToLineItem } from '@/lib/stripe-connect';
import { notifyBookingApproved, notifyBookingRejected } from '@/lib/rink-notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_STATUSES = new Set([
  'pending',
  'negotiating',
  'approved',
  'rejected',
  'cancelled',
  'paid',
  'confirmed',
  'completed',
  'expired',
]);

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

function isRinkOwner(claims: Record<string, unknown>[], rinkId: string): boolean {
  return claims.some(
    (c) => c.entity_id === rinkId && c.claim_type === 'rink' && c.status === 'approved',
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await params;

  // Load the booking request
  const { data: br, error: brErr } = await supabaseAdmin
    .from('booking_requests')
    .select('id, rink_id, requesting_user_id, status, activity_log, connection_id, counter_price_cents, requested_start, requested_end, notes')
    .eq('id', id)
    .single();

  if (brErr || !br) {
    return NextResponse.json({ error: 'Booking request not found.' }, { status: 404 });
  }

  // Load the connection to check rink ownership
  const { data: conn } = await supabaseAdmin
    .from('rink_org_connections')
    .select('id, created_by, rink_id')
    .eq('id', br.connection_id)
    .single();

  if (!conn) {
    return NextResponse.json({ error: 'Booking request not found.' }, { status: 404 });
  }

  // Determine who can do what
  const { data: claims } = await supabaseAdmin
    .from('claims')
    .select('entity_id, claim_type, status')
    .eq('user_id', userId)
    .eq('status', 'approved');

  const isRequester = br.requesting_user_id === userId;
  const isRinkAdmin = isRinkOwner(claims || [], conn.rink_id);
  const isConnectionCreator = conn.created_by === userId;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('Body must be valid JSON.');
  }

  const updates: Record<string, unknown> = {};
  const newLog = Array.isArray(br.activity_log) ? [...br.activity_log] : [];

  // Status transitions
  if (body.status !== undefined) {
    const newStatus = body.status as string;
    if (!VALID_STATUSES.has(newStatus)) {
      return badRequest(`status must be one of: ${[...VALID_STATUSES].join(', ')}.`);
    }

    const rinkAdminTransitions = new Set(['negotiating', 'approved', 'rejected', 'confirmed', 'completed', 'expired']);
    const requesterTransitions = new Set(['cancelled']);

    if (rinkAdminTransitions.has(newStatus) && !isRinkAdmin) {
      return NextResponse.json({ error: 'Only the rink admin can perform this action.' }, { status: 403 });
    }
    if (requesterTransitions.has(newStatus) && !isRequester) {
      return NextResponse.json({ error: 'Only the requester can cancel a booking request.' }, { status: 403 });
    }
    if (newStatus === 'cancelled' && br.status !== 'pending' && br.status !== 'negotiating' && br.status !== 'approved') {
      return badRequest('Only pending, negotiating, or approved requests can be cancelled.');
    }

    updates.status = newStatus;
    newLog.push({ action: 'status_change', by: userId, at: new Date().toISOString(), note: `Status changed to ${newStatus}.` });
  }

  // Counter price (rink admin only)
  if (body.counter_price_cents !== undefined) {
    if (!isRinkAdmin) {
      return NextResponse.json({ error: 'Only the rink admin can set a counter price.' }, { status: 403 });
    }
    if (body.counter_price_cents !== null && (typeof body.counter_price_cents !== 'number' || body.counter_price_cents < 0)) {
      return badRequest('counter_price_cents must be a non-negative number or null.');
    }
    updates.counter_price_cents = body.counter_price_cents;
    newLog.push({ action: 'counter_offer', by: userId, at: new Date().toISOString(), note: `Counter price set to ${body.counter_price_cents} cents.` });
  }

  // Publish as event (rink admin only, after approval)
  if (body.publish_as_event !== undefined) {
    if (!isRinkAdmin) {
      return NextResponse.json({ error: 'Only the rink admin can publish a booking as an event.' }, { status: 403 });
    }
    updates.publish_as_event = Boolean(body.publish_as_event);
  }

  // Notes update (rink admin only)
  if (body.notes !== undefined && isRinkAdmin) {
    updates.notes = (body.notes as string)?.trim() || null;
  }

  // Requester can edit details if still pending
  if (isRequester && br.status === 'pending') {
    if (body.requested_start !== undefined) updates.requested_start = body.requested_start;
    if (body.requested_end !== undefined) updates.requested_end = body.requested_end;
    if (body.requested_price_cents !== undefined) {
      updates.requested_price_cents = body.requested_price_cents ?? null;
      newLog.push({ action: 'updated', by: userId, at: new Date().toISOString(), note: 'Request details updated.' });
    }
    if (body.notes !== undefined) updates.notes = (body.notes as string)?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return badRequest('No valid fields to update.');
  }

  updates.activity_log = newLog;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('booking_requests')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[booking-request] update failed', error);
    return NextResponse.json({ error: 'Failed to update booking request.' }, { status: 500 });
  }

  // Fire-and-forget notifications after status change
  const wasJustApproved = body.status === 'approved' && br.status !== 'approved';
  const wasJustRejected = body.status === 'rejected' && br.status !== 'rejected';
  const firedAt = new Date().toISOString();

  if (wasJustApproved) {
    const [rinkResult] = await Promise.all([
      supabaseAdmin.from('rinks').select('name').eq('id', br.rink_id).single(),
    ]);
    const rinkName = (rinkResult.data as any)?.name ?? 'this rink';
    notifyBookingApproved({
      requesterUserId: br.requesting_user_id,
      entityId: id,
      rinkName,
      approvedAt: firedAt,
      callerInsertId: id,
    }).catch(err => console.error('[booking-request] notifyBookingApproved failed', err));
  }

  if (wasJustRejected) {
    const reason = typeof body.reason === 'string' ? body.reason.trim() : undefined;
    const [rinkResult] = await Promise.all([
      supabaseAdmin.from('rinks').select('name').eq('id', br.rink_id).single(),
    ]);
    const rinkName = (rinkResult.data as any)?.name ?? 'this rink';
    notifyBookingRejected({
      requesterUserId: br.requesting_user_id,
      entityId: id,
      rinkName,
      reason,
      callerInsertId: id,
    }).catch(err => console.error('[booking-request] notifyBookingRejected failed', err));
  }

  // If rink admin just approved with a price, create Stripe Checkout session
  const hasPrice = updates.counter_price_cents !== undefined && (updates.counter_price_cents as number | null) !== null;

  if (wasJustApproved && hasPrice) {
    try {
      const { data: rinkOwner } = await supabaseAdmin
        .from('rink_owners')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('rink_id', br.rink_id)
        .maybeSingle();

      if (rinkOwner?.stripe_account_id && rinkOwner.stripe_onboarding_complete) {
        const { data: rink } = await supabaseAdmin
          .from('rinks')
          .select('name')
          .eq('id', br.rink_id)
          .single();

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rinkstop.com';
        const lineItem = bookingToLineItem({
          name: `Ice Time at ${rink?.name || 'Rink'}`,
          description: `${new Date(br.requested_start).toLocaleString()} - ${new Date(br.requested_end).toLocaleString()}${br.notes ? ` | ${br.notes}` : ''}`,
          amount: updates.counter_price_cents as number,
        });

        const eventStart = new Date(br.requested_start);
        const now = Date.now();
        const hoursUntilEvent = (eventStart.getTime() - now) / (1000 * 60 * 60);

        let expiresAt: number;
        if (hoursUntilEvent < 4) {
          expiresAt = now + 2 * 60 * 60 * 1000;
        } else if (hoursUntilEvent < 24) {
          expiresAt = now + 4 * 60 * 60 * 1000;
        } else if (hoursUntilEvent < 72) {
          expiresAt = now + 24 * 60 * 60 * 1000;
        } else {
          expiresAt = now + 48 * 60 * 60 * 1000;
        }

        const session = await createCheckoutSession({
          accountId: rinkOwner.stripe_account_id,
          lineItems: [lineItem],
          metadata: {
            bookingRequestId: br.id,
            rinkId: br.rink_id,
            type: 'ice_rental',
          },
          successUrl: `${appUrl}/dashboard/rink-connections/bookings?paid=1&id=${br.id}`,
          cancelUrl: `${appUrl}/dashboard/rink-connections/bookings?cancelled=1&id=${br.id}`,
          expiresAt,
        });

        await supabaseAdmin
          .from('booking_requests')
          .update({
            payment_session_id: session.sessionId,
            payment_session_url: session.url,
            payment_expires_at: new Date(expiresAt).toISOString(),
          })
          .eq('id', id);

        return NextResponse.json({
          ok: true,
          checkoutUrl: session.url,
          sessionId: session.sessionId,
          paymentWindowHours: hoursUntilEvent < 4 ? 2 : hoursUntilEvent < 24 ? 4 : hoursUntilEvent < 72 ? 24 : 48,
        });
      }
    } catch (stripeErr) {
      console.error('[booking-request] stripe checkout creation failed', stripeErr);
      // Don't fail the whole request — approval was saved, payment can be retried
    }
  }

  return NextResponse.json({ ok: true });
}
