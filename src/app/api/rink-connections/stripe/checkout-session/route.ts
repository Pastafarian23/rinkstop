export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createCheckoutSession, bookingToLineItem } from '@/lib/stripe-connect';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { bookingRequestId } = body as { bookingRequestId?: string };

  if (!bookingRequestId) {
    return NextResponse.json({ error: 'bookingRequestId is required.' }, { status: 400 });
  }

  const { data: br, error: brErr } = await supabaseAdmin
    .from('booking_requests')
    .select('id, rink_id, status, counter_price_cents, requested_start, requested_end, notes, requesting_user_id')
    .eq('id', bookingRequestId)
    .single();

  if (brErr || !br) {
    return NextResponse.json({ error: 'Booking request not found.' }, { status: 404 });
  }

  if (br.status !== 'approved') {
    return NextResponse.json({ error: 'Booking must be approved before payment.' }, { status: 400 });
  }

  if (!br.counter_price_cents) {
    return NextResponse.json({ error: 'Price not set. Rink owner must approve with a price.' }, { status: 400 });
  }

  const { data: claim } = await supabaseAdmin
    .from('claims')
    .select('id')
    .eq('entity_id', br.rink_id)
    .eq('claim_type', 'rink')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();

  const isRequester = br.requesting_user_id === userId;
  if (!claim && !isRequester) {
    return NextResponse.json({ error: 'Not authorized for this booking.' }, { status: 403 });
  }

  const { data: rinkOwner } = await supabaseAdmin
    .from('rink_owners')
    .select('stripe_account_id, stripe_onboarding_complete')
    .eq('rink_id', br.rink_id)
    .maybeSingle();

  if (!rinkOwner?.stripe_account_id || !rinkOwner.stripe_onboarding_complete) {
    return NextResponse.json({ error: 'Rink owner has not completed Stripe onboarding.' }, { status: 400 });
  }

  const { data: rink } = await supabaseAdmin
    .from('rinks')
    .select('name')
    .eq('id', br.rink_id)
    .single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rinkstop.com';
  const lineItem = bookingToLineItem({
    name: `Ice Time at ${rink?.name || 'Rink'}`,
    description: `${new Date(br.requested_start).toLocaleString()} - ${new Date(br.requested_end).toLocaleString()}${br.notes ? ` | ${br.notes}` : ''}`,
    amount: br.counter_price_cents,
  });

  const successUrl = `${appUrl}/dashboard/rink-connections/bookings?paid=1&id=${br.id}`;
  const cancelUrl = `${appUrl}/dashboard/rink-connections/bookings?cancelled=1&id=${br.id}`;

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
    successUrl,
    cancelUrl,
    expiresAt,
  });

  await supabaseAdmin
    .from('booking_requests')
    .update({
      payment_session_id: session.sessionId,
      payment_session_url: session.url,
      payment_expires_at: new Date(expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', br.id);

  return NextResponse.json({ url: session.url, sessionId: session.sessionId });
}
