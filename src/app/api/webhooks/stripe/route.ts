import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getStripe() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia',
  });
}

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

async function updateUserTier(clerkUserId: string, tier: string | null, subscriptionId: string | null, customerId: string | null, status: string, expiresAtIso: string | null) {
  const supabase = getSupabase() as any;
  const update: Record<string, any> = {
    tier,
    subscription_status: status,
  };
  if (subscriptionId) update.stripe_subscription_id = subscriptionId;
  if (customerId) update.stripe_customer_id = customerId;
  if (expiresAtIso) update.tier_expires_at = expiresAtIso;
  const { error } = await supabase.from('profiles').update(update).eq('user_id', clerkUserId);
  if (error) {
    console.error('[Webhook] Failed to update user tier', { clerkUserId, tier, error });
    throw new Error('user_tier_update_failed');
  }
  console.log(`[Webhook] User ${clerkUserId} -> tier=${tier}, status=${status}, expires=${expiresAtIso}`);
}

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
        const metadata = session.metadata || {};

        // User-level tier subscription (new 4-tier model)
        if (metadata.clerk_user_id && metadata.tier) {
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
          await updateUserTier(metadata.clerk_user_id, metadata.tier, subscriptionId, customerId, subscription.status, expiresAt);
          break;
        }

        // Entity-level badge (legacy founding member per-player / per-rink)
        const { playerId, tier } = metadata;
        if (!playerId || !tier) {
          console.error('[Webhook] Missing metadata in session', session.id);
          break;
        }

        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
        const status = subscription.status;

        const supabase = getSupabase() as any;
        const { error } = await supabase
          .from('players')
          .update({ badge_tier: tier, stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, subscription_status: status, subscription_expires_at: expiresAt })
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
        const metadata = subscription.metadata || {};

        if (metadata.clerk_user_id) {
          const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
          const tier = subscription.status === 'active' || subscription.status === 'trialing' ? (metadata.tier || null) : null;
          await updateUserTier(metadata.clerk_user_id, tier, subscription.id, subscription.customer, subscription.status, expiresAt);
          break;
        }

        const { playerId } = metadata;
        if (!playerId) break;

        const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();

        const supabase = getSupabase() as any;
        await supabase
          .from('players')
          .update({ subscription_status: subscription.status, subscription_expires_at: expiresAt })
          .eq('id', playerId);

        console.log(`[Webhook] Subscription updated for player ${playerId}: ${subscription.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const metadata = subscription.metadata || {};

        if (metadata.clerk_user_id) {
          await updateUserTier(metadata.clerk_user_id, null, null, null, 'cancelled', null);
          break;
        }

        const { playerId } = metadata;
        if (!playerId) break;

        const supabase = getSupabase() as any;
        await supabase
          .from('players')
          .update({ badge_tier: 'free', stripe_subscription_id: null, subscription_status: 'cancelled', subscription_expires_at: null })
          .eq('id', playerId);

        console.log(`[Webhook] Subscription cancelled for player ${playerId} — reverted to free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;

        const supabase = getSupabase() as any;
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (userProfile) {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('user_id', userProfile.user_id);
          break;
        }

        const { data: player } = await supabase
          .from('players')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

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
