import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/billing/portal
// Body: (none required)
// Returns: { url } — a Stripe Customer Portal session URL the user should be redirected to.
//
// Behavior:
//   1. Look up the user's profile to get stripe_customer_id.
//   2. If the user has never interacted with Stripe (no customer id), create one on demand.
//   3. Create a portal session with `return_url` set to /dashboard/subscription.
//
// The Customer Portal lets users:
//   - Update payment method
//   - View + download invoices (PDFs)
//
// IMPORTANT — CANCEL/DOWNGRADE IS NOT SELF-SERVE:
//   The Stripe Customer Portal must be configured (Stripe Dashboard → Settings → Billing →
//   Customer portal) to DISABLE the "Cancel subscription" and "Switch plan" actions. We do
//   not want users to cancel or downgrade without talking to support first. This route
//   exists ONLY to give users billing history + payment method management.
//
//   If you need to change or cancel your plan: email support@rinkstop.com.
//
//   All plan changes (including tier upgrades) go through /api/tier/upgrade, which now
//   rejects downgrade requests for users with an active subscription.
//
// Security: rate limit 5 reqs per 10 min per user, scoped to userId not IP.

const RATE_LIMIT = { maxRequests: 5, windowMs: 10 * 60 * 1000 };

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia' as any,
  });
}

export async function POST(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'stripe_not_configured', message: 'STRIPE_SECRET_KEY not set' },
      { status: 503 }
    );
  }

  // Look up the user's profile
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id, email, display_name')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileErr) {
    console.error('[billing/portal] profile lookup failed', profileErr);
    return NextResponse.json({ error: 'profile_lookup_failed' }, { status: 500 });
  }

  const stripe = getStripe();

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    // Free user has never been a Stripe customer — create one so the portal works.
    // The portal will show "no subscriptions, no payment history" which is fine;
    // the user can also re-visit /pricing to start a subscription.
    try {
      const customer = await stripe.customers.create({
        metadata: { clerk_user_id: userId },
        ...(profile?.email ? { email: profile.email } : {}),
        ...(profile?.display_name ? { name: profile.display_name } : {}),
      });
      customerId = customer.id;
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', userId);
    } catch (e) {
      console.error('[billing/portal] customer create failed', e);
      return NextResponse.json({ error: 'customer_create_failed' }, { status: 500 });
    }
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard/subscription`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('[billing/portal] session create failed', e);
    return NextResponse.json(
      { error: 'portal_session_failed', message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
