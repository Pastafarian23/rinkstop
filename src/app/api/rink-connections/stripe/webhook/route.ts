export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe-connect';
import { supabaseAdmin } from '@/lib/supabase';

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

  const session = event.data.object as any;
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;

  switch (event.type) {
    case 'checkout.session.completed': {
      if (session.payment_status !== 'paid') break;

      const bookingRequestId = session.metadata?.bookingRequestId;
      if (!bookingRequestId) break;

      const { error: updateErr } = await supabaseAdmin
        .from('booking_requests')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          payment_intent_id: paymentIntentId,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingRequestId);

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

  return NextResponse.json({ received: true });
}
