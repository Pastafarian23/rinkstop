import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logReceived, markProcessed, markFailed } from '@/lib/stripe-webhook-log';

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

  // Founding Member scarcity lever: award is_founding_member=true to the first 500
  // paying members (Starter or higher), only on the first time they become a paid tier.
  // Once the cap is hit, no more are awarded.
  if (tier && tier !== 'free' && status === 'active') {
    const { data: existing } = await supabase
      .from('profiles')
      .select('is_founding_member')
      .eq('user_id', clerkUserId)
      .maybeSingle();

    if (existing && !existing.is_founding_member) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_founding_member', true);
      if ((count || 0) < 500) {
        update.is_founding_member = true;
        console.log(`[Webhook] Awarded Founding Member status to ${clerkUserId} (cap: 500, current: ${count})`);
      } else {
        console.log(`[Webhook] Founding Member cap of 500 reached; ${clerkUserId} gets Starter without founding badge`);
      }
    }
  }

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

  let eventRowId = 'unknown';
  try {
    eventRowId = (await logReceived(event)).id;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const metadata = session.metadata || {};

        // User-level tier subscription (new 4-tier model)
        if (metadata.clerk_user_id && metadata.tier) {
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;
          // The subscription object on a session.completed event is the string ID,
          // not a hydrated object — we need to fetch it. Wrap in try/catch so a
          // transient Stripe API hiccup doesn't 500 the whole webhook (Stripe
          // will retry, but we want max resilience).
          let subscription: any;
          try {
            subscription = await stripe.subscriptions.retrieve(subscriptionId);
          } catch (e: any) {
            console.error(`[Webhook] subscriptions.retrieve failed for ${subscriptionId} (will retry on Stripe retry):`, e.message);
            // Re-throw so Stripe retries the whole webhook
            throw e;
          }
          const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
          await updateUserTier(metadata.clerk_user_id, metadata.tier, subscriptionId, customerId, subscription.status, expiresAt);

          // Funnel event: the user completed checkout. Correlate to the
          // pricing_viewed + checkout_started events via user_id + session.id.
          console.log('[analytics]', JSON.stringify({
            name: 'checkout_completed',
            userId: metadata.clerk_user_id,
            pathname: '/pricing',
            props: { tier: metadata.tier, sessionId: session.id },
            ts: new Date().toISOString(),
          }));
          // Best-effort Supabase insert via getSupabase().
          try {
            const _supa = getSupabase() as any;
            await _supa.from('analytics_events').insert({
              name: 'checkout_completed',
              user_id: metadata.clerk_user_id,
              pathname: '/pricing',
              props: { tier: metadata.tier, sessionId: session.id },
            });
          } catch {
            // ignore — console log is the durable record
          }
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
          // ───────────────────────────────────────────────────────────────────
          // DUNNING POLICY (decision 2026-06-16, user-approved):
          //
          // Stripe's recommended Smart Retries default = 8 retries over 2 weeks.
          // Source: https://docs.stripe.com/billing/revenue-recovery/smart-retries
          //
          // Behavior: a user who paid for the year keeps their tier for the full
          // 2-week dunning window (status=active|trialing|past_due|incomplete|
          // incomplete_expired). The tier is only nulled on a TRUE cancellation
          // (status=canceled|unpaid) which fires when Stripe has exhausted retries.
          //
          // This means: one failed payment = user keeps Pro for 2 weeks while
          // Stripe retries the card. If all 8 retries fail, Stripe sends
          // customer.subscription.deleted, which nulls the tier.
          //
          // If you change this, also update docs/stripe-flow-audit.md and the
          // MEMORY.md dunning policy note.
          // ───────────────────────────────────────────────────────────────────
          // Smart tier resolution: only DOWNGRADE the tier on a true cancellation
          // (status='canceled' or 'unpaid'). For temporary dunning states
          // (past_due, incomplete, incomplete_expired), KEEP the existing tier
          // but update the status. Otherwise a single failed payment would wipe
          // the user's Pro tier instantly, which is wrong.
          //
          // Resolution:
          //   - active / trialing → keep the existing tier (use metadata.tier)
          //   - past_due / incomplete / incomplete_expired → KEEP tier, update status + expires_at
          //   - canceled / unpaid → tier=null (user truly lost access)
          const isLiveStatus = subscription.status === 'active' || subscription.status === 'trialing';
          const isDunning = subscription.status === 'past_due' || subscription.status === 'incomplete' || subscription.status === 'incomplete_expired';
          const tier: string | null = isLiveStatus
            ? (metadata.tier || null)
            : isDunning
              ? (metadata.tier || null) // keep tier during dunning — user paid, we just haven't collected yet
              : null; // canceled / unpaid → downgrade
          await updateUserTier(metadata.clerk_user_id, tier, subscription.id, subscription.customer, subscription.status, expiresAt);

          // Funnel event: the user's subscription went live (or transitioned).
          // We only count first-time activations for the conversion rate.
          if (isLiveStatus) {
            console.log('[analytics]', JSON.stringify({
              name: 'subscription_active',
              userId: metadata.clerk_user_id,
              pathname: '/pricing',
              props: { tier, subscriptionId: subscription.id, status: subscription.status },
              ts: new Date().toISOString(),
            }));
            try {
              const _supa = getSupabase() as any;
              await _supa.from('analytics_events').insert({
                name: 'subscription_active',
                user_id: metadata.clerk_user_id,
                pathname: '/pricing',
                props: { tier, subscriptionId: subscription.id, status: subscription.status },
              });
            } catch {
              // ignore
            }
          }
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
          .select('user_id, tier, stripe_subscription_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (userProfile) {
          // CRITICAL: do NOT downgrade tier on a single failed payment. Just
          // set status to past_due. Stripe's recommended Smart Retries default
          // is 8 retries over 2 weeks (see customer.subscription.updated case
          // for full policy + docs link). Until Stripe exhausts those retries
          // and sends customer.subscription.deleted, the user keeps their tier.
          //
          // The tier will be wiped when customer.subscription.deleted fires
          // (handled in the case above), not here.
          await supabase
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('user_id', userProfile.user_id);
          console.log(`[Webhook] payment_failed for user ${userProfile.user_id} - marked past_due, tier=${userProfile.tier} kept`);
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

      case 'invoice.paid': {
        // Confirms a successful renewal. The subscription.updated event usually
        // fires with current_period_end refreshed, but invoice.paid is a stronger
        // signal that the renewal actually cleared. We use it as a backstop to
        // refresh tier_expires_at — if Stripe sends the renewal webhook out of
        // order, we still get the right expires_at.
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string | null;
        if (!subscriptionId) break;

        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const metadata = subscription.metadata || {};
        const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();

        if (metadata.clerk_user_id) {
          // Only refresh expires_at — do NOT touch the tier. The user is paid up.
          const supabase = getSupabase() as any;
          const { error } = await supabase
            .from('profiles')
            .update({
              tier_expires_at: expiresAt,
              subscription_status: subscription.status,
            })
            .eq('user_id', metadata.clerk_user_id);
          if (error) {
            console.error('[Webhook] invoice.paid failed to update expires_at', error);
          } else {
            console.log(`[Webhook] invoice.paid refreshed expires_at for ${metadata.clerk_user_id} to ${expiresAt}`);
          }
          break;
        }

        const { playerId } = metadata;
        if (playerId) {
          const supabase = getSupabase() as any;
          await supabase
            .from('players')
            .update({ subscription_expires_at: expiresAt, subscription_status: subscription.status })
            .eq('id', playerId);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    await markProcessed(eventRowId);
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[Webhook] Handler error:', err.message);
    await markFailed(eventRowId, err.message || 'unknown error');
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
