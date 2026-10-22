import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminFromRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' as any })
  : null;

// 2026-07-02 brief: 8 paid tiers + Federation (contact-sales only). Old tier
// names (roster, roster_plus, pro, premium, business_starter, business_pro,
// business_premium, enterprise) are no longer referenced anywhere — see
// supabase/migrations/2026-07-02_remove_old_tier_names.sql.
// 2026-10-22 tier consolidation: organization plans now live under
// STRIPE_PRICE_ORG_* env names. The legacy CLUB_*/BUSINESS_* env vars are
// still read so an un-migrated .env keeps working during rollout.
const PRICE_TO_TIER: Record<string, string> = {
  [process.env.STRIPE_PRICE_VERIFIED_IDENTITY || '']: 'verified_identity',
  [process.env.STRIPE_PRICE_IDENTITY_PLUS || '']: 'identity_plus',
  [process.env.STRIPE_PRICE_ORG_PLUS || '']: 'org_plus',
  [process.env.STRIPE_PRICE_ORG_PRO || '']: 'org_pro',
  [process.env.STRIPE_PRICE_ORG_ELITE || '']: 'org_elite',
  [process.env.STRIPE_PRICE_CLUB_STARTER || '']: 'org_plus',
  [process.env.STRIPE_PRICE_CLUB_PRO || '']: 'org_pro',
  [process.env.STRIPE_PRICE_CLUB_ELITE || '']: 'org_elite',
  [process.env.STRIPE_PRICE_LEAGUE || '']: 'org_enterprise',
  [process.env.STRIPE_PRICE_BUSINESS_LISTING || '']: 'org_plus',
  [process.env.STRIPE_PRICE_BUSINESS_PLUS || '']: 'org_pro',
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
      verified_identity: 0, identity_plus: 0,
      org_plus: 0, org_pro: 0, org_elite: 0, org_enterprise: 0,
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
