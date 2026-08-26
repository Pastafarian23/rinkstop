export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe-connect';
import { supabaseAdmin } from '@/lib/supabase';
import { logReceived, markProcessed, markFailed } from '@/lib/stripe-webhook-log';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  let event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  let eventRowId = 'unknown';
  try {
    const logResult = await logReceived(event);
    eventRowId = logResult.id;

    // Idempotency: skip if this event.id was already processed successfully.
    // Stripe retries up to 72h; without this guard a retried
    // checkout.session.completed would re-confirm a booking that's already
    // confirmed/paid (the bare .eq('id') update would no-op on identical
    // values, but we still want the dedup audit trail and to skip
    // side effects like the ice_listings status flip below).
    if (logResult.alreadyExisted) {
      const { data: prior } = await supabaseAdmin
        .from('stripe_webhook_events')
        .select('status')
        .eq('id', eventRowId)
        .single();
      if (prior?.status === 'processed') {
        console.log(`[stripe/webhook] event ${event.id} already processed — skipping`);
        return NextResponse.json({ received: true, deduped: true });
      }
      console.log(`[stripe/webhook] event ${event.id} previously ${prior?.status ?? 'unknown'} — reprocessing`);
    }

  const session = event.data.object as any;
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;

  switch (event.type) {
    case 'checkout.session.completed': {
      if (session.payment_status !== 'paid') break;

      const bookingRequestId = session.metadata?.bookingRequestId;
      if (!bookingRequestId) break;

      // Idempotency guard on the booking update: only flip status='confirmed'
      // if the booking is currently in a pre-confirmation state. A replayed
      // event (caught above) wouldn't reach here, but defense-in-depth: a
      // direct replay (e.g., attacker re-fires the same Stripe event after
      // manually constructing a request) can't move a cancelled/refunded
      // booking back to confirmed.
      const { error: updateErr } = await supabaseAdmin
        .from('booking_requests')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          payment_intent_id: paymentIntentId,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingRequestId)
        .in('status', ['pending', 'negotiating', 'approved']);

      if (updateErr) {
        console.error('[stripe/webhook] booking_requests update failed', updateErr);
        break;
      }

      const { data: br } = await supabaseAdmin
        .from('booking_requests')
        .select('listing_id, rink_id, requesting_user_id')
        .eq('id', bookingRequestId)
        .single();

      if (br?.listing_id) {
        await supabaseAdmin
          .from('ice_listings')
          .update({ status: 'booked', updated_at: new Date().toISOString() })
          .eq('id', br.listing_id);
      }

      break;
    }

    case 'payment_intent.payment_failed': {
      const bookingRequestId = session.metadata?.bookingRequestId;
      if (!bookingRequestId) break;

      await supabaseAdmin
        .from('booking_requests')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingRequestId);
      break;
    }

    case 'charge.refunded': {
      const bookingRequestId = session.metadata?.bookingRequestId;
      if (!bookingRequestId) break;

      await supabaseAdmin
        .from('booking_requests')
        .update({
          payment_status: 'refunded',
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingRequestId);
      break;
    }

    default:
      break;
  }

    await markProcessed(eventRowId);
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[stripe/webhook] Handler error:', err.message);
    await markFailed(eventRowId, err.message || 'unknown error');
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
