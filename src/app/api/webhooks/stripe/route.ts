import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

<<<<<<< Updated upstream
// Lazy Stripe init so build doesn't fail when env vars are missing at build time
=======
>>>>>>> Stashed changes
function getStripe() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia',
  });
}

<<<<<<< Updated upstream
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
=======
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars');
    _supabase = createClient(url, key);
  }
  return _supabase;
}
>>>>>>> Stashed changes

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: ReturnType<typeof stripe.webhooks.constructEvent>;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const { playerId, tier } = session.metadata || {};

        if (!playerId || !tier) {
          console.error('[Webhook] Missing playerId/tier in session metadata', session.id);
          break;
        }

        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

<<<<<<< Updated upstream
        // Fetch subscription to get current period end
=======
>>>>>>> Stashed changes
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
        const status = subscription.status;

<<<<<<< Updated upstream
        const { error } = await supabase
          .from('players')
          .update({
            badge_tier: tier,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: status,
            subscription_expires_at: expiresAt,
          })
=======
        const supabase = getSupabase() as any;
        const { error } = await supabase
          .from('players')
          .update({ badge_tier: tier, stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, subscription_status: status, subscription_expires_at: expiresAt })
>>>>>>> Stashed changes
          .eq('id', playerId);

        if (error) {
          console.error('[Webhook] Failed to update player:', error);
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        console.log(`[Webhook] Player ${playerId} upgraded to ${tier}, expires ${expiresAt}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const { playerId } = subscription.metadata || {};
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
        if (!playerId) break;

        const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();

<<<<<<< Updated upstream
        await supabase
          .from('players')
          .update({
            subscription_status: subscription.status,
            subscription_expires_at: expiresAt,
          })
=======
        const supabase = getSupabase() as any;
        await supabase
          .from('players')
          .update({ subscription_status: subscription.status, subscription_expires_at: expiresAt })
>>>>>>> Stashed changes
          .eq('id', playerId);

        console.log(`[Webhook] Subscription updated for player ${playerId}: ${subscription.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const { playerId } = subscription.metadata || {};
<<<<<<< Updated upstream

        if (!playerId) break;

        await supabase
          .from('players')
          .update({
            badge_tier: 'free',
            stripe_subscription_id: null,
            subscription_status: 'cancelled',
            subscription_expires_at: null,
          })
=======
        if (!playerId) break;

        const supabase = getSupabase() as any;
        await supabase
          .from('players')
          .update({ badge_tier: 'free', stripe_subscription_id: null, subscription_status: 'cancelled', subscription_expires_at: null })
>>>>>>> Stashed changes
          .eq('id', playerId);

        console.log(`[Webhook] Subscription cancelled for player ${playerId} — reverted to free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;

<<<<<<< Updated upstream
=======
        const supabase = getSupabase() as any;
>>>>>>> Stashed changes
        const { data: player } = await supabase
          .from('players')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (player) {
          await supabase
            .from('players')
            .update({ subscription_status: 'past_due' })
            .eq('id', player.id);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[Webhook] Handler error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}