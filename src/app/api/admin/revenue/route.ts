import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminFromRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' as any })
  : null;

// Tier rename 2026-06-17: was supporter/verified/pro → roster/roster_plus/pro/business tiers.
// 2026-07-02 brief: added 8 new canonical tiers. Env var names changed.
// Both old (STRIPE_PRICE_TIER_*) and new (STRIPE_PRICE_*) env vars are checked so
// existing subscribers on the old products still map correctly while new subscribers
// on the new products map to the new tier names. Federation has no Stripe product
// (contact-sales only) so it's not represented here.
const PRICE_TO_TIER: Record<string, string> = {
  // Old tiers (pre-2026-07-02) — backed by STRIPE_PRICE_TIER_* env vars
  [process.env.STRIPE_PRICE_TIER_STARTER || '']: 'roster',
  [process.env.STRIPE_PRICE_TIER_FAMILY_PLUS || '']: 'roster_plus',
  [process.env.STRIPE_PRICE_TIER_PRO || '']: 'pro',
  // New tiers (2026-07-02 brief) — backed by STRIPE_PRICE_* env vars
  [process.env.STRIPE_PRICE_VERIFIED_IDENTITY || '']: 'verified_identity',
  [process.env.STRIPE_PRICE_IDENTITY_PLUS || '']: 'identity_plus',
  [process.env.STRIPE_PRICE_CLUB_STARTER || '']: 'club_starter',
  [process.env.STRIPE_PRICE_CLUB_PRO || '']: 'club_pro',
  [process.env.STRIPE_PRICE_CLUB_ELITE || '']: 'club_elite',
  [process.env.STRIPE_PRICE_LEAGUE || '']: 'league',
  [process.env.STRIPE_PRICE_BUSINESS_LISTING || '']: 'business_listing',
  [process.env.STRIPE_PRICE_BUSINESS_PLUS || '']: 'business_plus',
  // Legacy aliases kept for safety (in case the renamed env vars are also still set)
  [process.env.STRIPE_PRICE_ROSTER || '']: 'roster',
  [process.env.STRIPE_PRICE_ROSTER_PLUS || '']: 'roster_plus',
  [process.env.STRIPE_PRICE_PRO || '']: 'pro',
  [process.env.STRIPE_PRICE_BUSINESS_STARTER || '']: 'business_listing',
  [process.env.STRIPE_PRICE_BUSINESS_PRO || '']: 'business_plus',
  [process.env.STRIPE_PRICE_BUSINESS_PREMIUM || '']: 'business_plus',
};

/**
 * GET /api/admin/revenue
 * Returns Stripe-backed revenue snapshot.
 */
export async function GET(_req: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;
  if (!stripe) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  try {
    // Pull all active subscriptions (paginated, up to 1000)
    const subs: Stripe.Subscription[] = [];
    let starting_after: string | undefined;
    for (let i = 0; i < 10; i++) {
      const r = await stripe.subscriptions.list({
        status: 'all',
        limit: 100,
        ...(starting_after ? { starting_after } : {}),
      });
      subs.push(...r.data);
      if (!r.has_more) break;
      starting_after = r.data[r.data.length - 1].id;
    }

    const tierCounts: Record<string, number> = {
      // Old tier buckets
      roster: 0, roster_plus: 0, pro: 0,
      // New tier buckets (2026-07-02 brief)
      verified_identity: 0, identity_plus: 0,
      club_starter: 0, club_pro: 0, club_elite: 0, league: 0,
      business_listing: 0, business_plus: 0,
      other: 0,
    };
    let mrrCents = 0;
    let arrCents = 0;
    let trialingNow = 0;
    let pastDue = 0;

    for (const sub of subs) {
      const item = sub.items.data[0];
      if (!item) continue;
      const priceId = item.price.id;
      const tier = PRICE_TO_TIER[priceId] || 'other';
      if (tier !== 'other') tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      else tierCounts.other += 1;

      if (sub.status === 'trialing') trialingNow += 1;
      if (sub.status === 'past_due' || sub.status === 'unpaid') pastDue += 1;
      if (sub.status !== 'active' && sub.status !== 'trialing') continue;

      const unitAmount = item.price.unit_amount || 0;
      const interval = item.price.recurring?.interval || 'month';
      const intervalCount = item.price.recurring?.interval_count || 1;
      if (interval === 'year') {
        // Annual subscription
        arrCents += (unitAmount * intervalCount) / 12; // normalize to monthly
        mrrCents += (unitAmount * intervalCount) / 12;
      } else {
        // Monthly (or any other interval — best effort)
        mrrCents += (unitAmount * intervalCount);
        arrCents += (unitAmount * intervalCount) * 12;
      }
    }

    // Recent events (last 7d)
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    const events: Stripe.Event[] = [];
    for (let i = 0; i < 5; i++) {
      const r: any = await stripe.events.list({
        created: { gte: sevenDaysAgo },
        types: {
          all_of: [
            'customer.subscription.created',
            'customer.subscription.deleted',
            'invoice.payment_failed',
            'invoice.paid',
          ],
        },
        limit: 100,
      } as any);
      events.push(...(r.data as Stripe.Event[]));
      if (!r.has_more) break;
    }

    let newSubsLast7d = 0;
    let cancellationsLast7d = 0;
    let paymentFailuresLast7d = 0;
    let successfulPaymentsLast7d = 0;
    const recentEvents: Array<{ type: string; created: number; amount?: number; tier?: string }> = [];

    for (const ev of events) {
      const data: any = ev.data?.object;
      if (ev.type === 'customer.subscription.created') {
        newSubsLast7d += 1;
        const priceId = data?.items?.data?.[0]?.price?.id;
        recentEvents.unshift({
          type: 'new_subscription',
          created: ev.created,
          amount: data?.items?.data?.[0]?.price?.unit_amount,
          tier: PRICE_TO_TIER[priceId] || 'other',
        });
      } else if (ev.type === 'customer.subscription.deleted') {
        cancellationsLast7d += 1;
        recentEvents.unshift({ type: 'cancellation', created: ev.created });
      } else if (ev.type === 'invoice.payment_failed') {
        paymentFailuresLast7d += 1;
        recentEvents.unshift({ type: 'payment_failed', created: ev.created, amount: data?.amount_due });
      } else if (ev.type === 'invoice.paid') {
        successfulPaymentsLast7d += 1;
      }
    }

    // Churn: cancellationsLast7d / activeAtStartOfPeriod
    const activeAtStart = subs.length + cancellationsLast7d - newSubsLast7d;
    const churnRate = activeAtStart > 0 ? cancellationsLast7d / activeAtStart : 0;

    return NextResponse.json({
      activeSubscribers: subs.filter((s) => s.status === 'active' || s.status === 'trialing').length,
      tierCounts,
      mrrCents: Math.round(mrrCents),
      arrCents: Math.round(arrCents),
      trialingNow,
      pastDue,
      newSubsLast7d,
      cancellationsLast7d,
      paymentFailuresLast7d,
      successfulPaymentsLast7d,
      churnRate,
      recentEvents: recentEvents.slice(0, 20),
      generatedAt: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'stripe_error', message: e.message }, { status: 500 });
  }
}
