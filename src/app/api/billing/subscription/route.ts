import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/billing/subscription
// Returns the current user's subscription + payment method + invoice history.
//
// Response shape:
//   {
//     subscription: {
//       id, status, current_period_end, cancel_at_period_end,
//       price_amount, price_currency, price_interval,
//       product_name, product_description,
//     } | null,
//     payment_method: {
//       brand, last4, exp_month, exp_year,
//     } | null,
//     invoices: [{ id, amount_paid, currency, status, hosted_invoice_url, invoice_pdf, created }],
//     customer_id: string | null,
//   }

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia' as any,
  });
}

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'stripe_not_configured' },
      { status: 503 }
    );
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id, tier, tier_expires_at, subscription_status, is_founding_member')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileErr) {
    console.error('[billing/subscription] profile lookup failed', profileErr);
    return NextResponse.json({ error: 'profile_lookup_failed' }, { status: 500 });
  }

  const customerId = profile?.stripe_customer_id || null;
  const subscriptionId = profile?.stripe_subscription_id || null;

  // No Stripe customer yet — fully free user.
  if (!customerId) {
    return NextResponse.json({
      subscription: null,
      payment_method: null,
      invoices: [],
      customer_id: null,
      profile_tier: profile?.tier || 'free',
      is_founding_member: profile?.is_founding_member || false,
    });
  }

  const stripe = getStripe();

  // Fetch subscription (live from Stripe — most accurate)
  let subscription: any = null;
  let paymentMethod: any = null;
  let invoices: any[] = [];

  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method', 'items.data.price.product'],
      });
      // current_period_end moved off the Subscription object in newer API versions
      // — it's now on each subscription item.
      const currentPeriodEnd =
        (sub as any).current_period_end ??
        sub.items.data[0]?.current_period_end ??
        null;
      subscription = {
        id: sub.id,
        status: sub.status,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: sub.cancel_at_period_end,
        canceled_at: sub.canceled_at,
        price_amount: sub.items.data[0]?.price?.unit_amount ?? null,
        price_currency: sub.items.data[0]?.price?.currency ?? 'usd',
        price_interval: sub.items.data[0]?.price?.recurring?.interval ?? null,
        product_name:
          typeof sub.items.data[0]?.price?.product === 'object' &&
          sub.items.data[0]?.price?.product !== null
            ? (sub.items.data[0]?.price?.product as any).name
            : null,
        product_description:
          typeof sub.items.data[0]?.price?.product === 'object' &&
          sub.items.data[0]?.price?.product !== null
            ? (sub.items.data[0]?.price?.product as any).description
            : null,
      };

      const pm = sub.default_payment_method;
      if (pm && typeof pm === 'object' && 'card' in pm && pm.card) {
        paymentMethod = {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year,
        };
      }
    } catch (e) {
      // Subscription may have been deleted at Stripe; surface a "no subscription" state
      console.warn('[billing/subscription] subscription retrieve failed', e);
    }
  }

  // Fetch last 10 invoices for the customer
  try {
    const list = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
    });
    invoices = list.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      hosted_invoice_url: inv.hosted_invoice_url,
      invoice_pdf: inv.invoice_pdf,
      created: inv.created,
      period_end: inv.period_end,
      description: inv.description || (inv.lines.data[0]?.description ?? null),
    }));
  } catch (e) {
    console.warn('[billing/subscription] invoices list failed', e);
  }

  return NextResponse.json({
    subscription,
    payment_method: paymentMethod,
    invoices,
    customer_id: customerId,
    profile_tier: profile?.tier || 'free',
    is_founding_member: profile?.is_founding_member || false,
    tier_expires_at: profile?.tier_expires_at,
    subscription_status: profile?.subscription_status,
  });
}
