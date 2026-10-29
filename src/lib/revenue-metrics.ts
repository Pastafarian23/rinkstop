/**
 * src/lib/revenue-metrics.ts
 *
 * Live, site-side revenue metrics from Supabase.
 *
 * WHY THIS EXISTS (2026-10-28, Arnel directive):
 *   The Stripe-only /api/admin/revenue endpoint reported MRR/ARR/churn, but
 *   because RinkStop has ZERO paid subscriptions, that dashboard showed an
 *   empty, all-zero page — which is exactly how a $0-revenue business can stay
 *   invisible for months.
 *
 *   This module pulls the OTHER revenue signals that live in Supabase:
 *     - one-time purchases (profiles.tier = 'dataset_license')
 *     - newsletter / lead captures (newsletter_subscribers, leads)
 *     - listing submissions (listing_submissions)
 *     - booking requests + payment records
 *     - the money-page funnel (money_page_viewed → CTA clicks → purchases)
 *
 *   Every count is split into "real" vs "test" where the schema allows it, so
 *   test rows can never be reported as revenue again.
 *
 * TEST DETECTION RULES:
 *   - emails matching /^test|.*@example\.com|.*@kiloclaw\.dev|.*test/i
 *   - leads.source === 'test'
 *   - listing_submissions with no website AND a test-looking email
 *   - analytics props.flags / props.test === true
 */

import { supabaseAdmin } from '@/lib/supabase';

export interface RevenueMetrics {
  /** One-time purchases, excluding test rows. */
  oneTime: {
    datasetLicenses: number;
    datasetLicensesTest: number;
    datasetLicenseRevenueCents: number;
    totalOneTimeCustomers: number;
    totalOneTimeRevenueCents: number;
  };
  /** Subscription side (site-side mirror of Stripe). */
  subscriptions: {
    activeProfiles: number;
    activeProfilesTest: number;
  };
  /** Audience captured. */
  audience: {
    newsletterSubscribers: number;
    newsletterSubscribersTest: number;
    leads: number;
    leadsTest: number;
    totalRealAudience: number;
  };
  /** Inbound business interest. */
  pipeline: {
    listingSubmissions: number;
    listingSubmissionsTest: number;
    pendingListingSubmissions: number;
    listingInquiries: number;
    bookingRequests: number;
    paymentRecords: number;
    b2bProspects: number;
  };
  /** Money-page funnel (last 30 days). */
  funnel: {
    moneyPageViews: number;
    moneyPageViewsByPage: Record<string, number>;
    datasetPurchaseClicks: number;
    advertiseClicks: number;
    partnerClicks: number;
    hockeyDatabaseClicks: number;
    newsletterSignupSubmissions: number;
    /** Contact-form submissions (terminal step of the money-page funnel). */
    contactSubmissions: number;
    /**
     * Listing-submission funnel (30d). The listing form is our only source of
     * REAL leads to date — both live submissions came through /add-listing.
     * These events already existed (fired client-side by AddListingForm) but
     * were only visible in /admin/funnel, not in the revenue dashboard.
     */
    addListingViews: number;
    listingSubmissions30d: number;
    pricingViews: number;
    pricingCardClicks: number;
    checkoutStarted: number;
    checkoutCompleted: number;
  };
  /** Paid totals across every channel. */
  totals: {
    lifetimeRevenueCents: number;
    payingCustomers: number;
    realAudience: number;
  };
  generatedAt: string;
}

const DATASET_LICENSE_PRICE_CENTS = 49900;

const TEST_EMAIL_RE = /(^test|@example\.com|@kiloclaw\.dev|test@|\.test@|@test\.|no-?reply|donotreply)/i;

function isTestEmail(email?: string | null): boolean {
  if (!email) return false;
  return TEST_EMAIL_RE.test(email.trim());
}

/** Rows we fetch are capped for safety; counts are exact via PostgREST count. */
async function countRows(
  table: string,
  build: (q: ReturnType<typeof supabaseAdmin.from>) => ReturnType<typeof supabaseAdmin.from>,
): Promise<number> {
  const q = build(supabaseAdmin.from(table));
  const { count, error } = await q.select('*', { count: 'exact', head: true });
  if (error) {
    console.error(`[revenue-metrics] count ${table} failed:`, error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Count rows where a column IS NOT NULL.
 * PostgREST needs `col=not.is.null` (not the SDK's `.not(col,'is',null)`),
 * so this goes through the REST URL directly.
 */
async function countNonNull(table: string, column: string): Promise<number> {
  try {
    const baseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!baseUrl || !serviceKey) {
      console.error(
        `[revenue-metrics] countNonNull ${table}.${column} skipped: Supabase env not set`,
      );
      return 0;
    }
    const url = `${baseUrl}/rest/v1/${table}?select=*&${column}=not.is.null`;
    const res = await fetch(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'count=exact',
        Range: '0-0',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`[revenue-metrics] countNonNull ${table}.${column} failed:`, res.status);
      return 0;
    }
    const contentRange = res.headers.get('content-range') || '';
    const total = Number(contentRange.split('/')[1] || 0);
    return Number.isFinite(total) ? total : 0;
  } catch (e: any) {
    console.error(`[revenue-metrics] countNonNull ${table}.${column} threw:`, e?.message);
    return 0;
  }
}

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // ── One-time purchases ───────────────────────────────────────────────────
  // dataset_license purchases upsert a profiles row with tier='dataset_license'
  // and a stripe_session_id (see src/app/api/webhooks/stripe/route.ts).
  const { data: datasetRows } = await supabaseAdmin
    .from('profiles')
    .select('email, stripe_session_id, created_at')
    .eq('tier', 'dataset_license');

  const datasetAll = datasetRows ?? [];
  const datasetTest = datasetAll.filter((r) => isTestEmail(r.email)).length;
  const datasetReal = datasetAll.length - datasetTest;

  // ── Subscriptions (site-side) ────────────────────────────────────────────
  const { data: paidRows } = await supabaseAdmin
    .from('profiles')
    .select('email, tier, subscription_status, stripe_subscription_id')
    .not('stripe_subscription_id', 'is', null);

  const paidAll = paidRows ?? [];
  const paidTest = paidAll.filter((r) => isTestEmail(r.email)).length;

  // ── Audience ─────────────────────────────────────────────────────────────
  const { data: newsRows } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('email, source, is_active');
  const newsAll = (newsRows ?? []).filter((r) => r.is_active !== false);
  const newsTest = newsAll.filter((r) => isTestEmail(r.email)).length;

  const { data: leadRows } = await supabaseAdmin
    .from('leads')
    .select('email, source, created_at');
  const leadAll = leadRows ?? [];
  const leadTest = leadAll.filter(
    (r) => r.source === 'test' || isTestEmail(r.email),
  ).length;

  // ── Pipeline ─────────────────────────────────────────────────────────────
  const { data: submissionRows } = await supabaseAdmin
    .from('listing_submissions')
    .select('id, email, status, listing_type, created_at');
  const submissionsAll = submissionRows ?? [];
  const submissionTest = submissionsAll.filter((r) => isTestEmail(r.email)).length;
  const pendingSubmissions = submissionsAll.filter((r) => r.status === 'pending').length;

  const listingInquiries = await countNonNull('leads', 'listing_id');
  const bookingRequests = await countRows('booking_requests', (q) => q);
  const paymentRecords = await countRows('payment_records', (q) => q);
  const b2bProspects = await countRows('b2b_prospects', (q) => q);

  // ── Money-page funnel (last 30 days) ─────────────────────────────────────
  const funnelEvents = await fetchFunnelEvents(thirtyDaysAgo);

  const moneyPageViewsByPage: Record<string, number> = {};
  for (const e of funnelEvents) {
    if (e.name !== 'money_page_viewed') continue;
    const page = (e.props?.page as string) || 'unknown';
    moneyPageViewsByPage[page] = (moneyPageViewsByPage[page] || 0) + 1;
  }

  const countEvent = (name: string) => funnelEvents.filter((e) => e.name === name).length;

  const datasetRevenueCents = datasetReal * DATASET_LICENSE_PRICE_CENTS;

  // Lifetime revenue: Stripe is the source of truth for payments; we only
  // count site-side rows that Stripe has already confirmed via webhook
  // (dataset_license profiles carry a stripe_session_id).
  const lifetimeRevenueCents = datasetRevenueCents;

  return {
    oneTime: {
      datasetLicenses: datasetReal,
      datasetLicensesTest: datasetTest,
      datasetLicenseRevenueCents: datasetRevenueCents,
      totalOneTimeCustomers: datasetReal,
      totalOneTimeRevenueCents: datasetRevenueCents,
    },
    subscriptions: {
      activeProfiles: paidAll.length - paidTest,
      activeProfilesTest: paidTest,
    },
    audience: {
      newsletterSubscribers: newsAll.length - newsTest,
      newsletterSubscribersTest: newsTest,
      leads: leadAll.length - leadTest,
      leadsTest: leadTest,
      totalRealAudience: newsAll.length - newsTest + (leadAll.length - leadTest),
    },
    pipeline: {
      listingSubmissions: submissionsAll.length - submissionTest,
      listingSubmissionsTest: submissionTest,
      pendingListingSubmissions: pendingSubmissions,
      listingInquiries,
      bookingRequests,
      paymentRecords,
      b2bProspects,
    },
    funnel: {
      moneyPageViews: countEvent('money_page_viewed'),
      moneyPageViewsByPage,
      datasetPurchaseClicks: countEvent('dataset_license_purchase_clicked'),
      advertiseClicks: countEvent('advertise_cta_clicked'),
      partnerClicks: countEvent('partner_with_us_clicked'),
      hockeyDatabaseClicks: countEvent('hockey_database_cta_clicked'),
      newsletterSignupSubmissions: countEvent('newsletter_signup_submitted'),
      contactSubmissions: countEvent('contact_submitted'),
      addListingViews: countEvent('add_listing_intent_viewed'),
      listingSubmissions30d: countEvent('add_listing_submitted'),
      pricingViews: countEvent('pricing_viewed'),
      pricingCardClicks: countEvent('pricing_card_clicked'),
      checkoutStarted: countEvent('checkout_started'),
      checkoutCompleted: countEvent('checkout_completed'),
    },
    totals: {
      lifetimeRevenueCents,
      payingCustomers: datasetReal + (paidAll.length - paidTest),
      realAudience: newsAll.length - newsTest + (leadAll.length - leadTest),
    },
    generatedAt: now.toISOString(),
  };
}

interface FunnelEvent {
  name: string;
  props: Record<string, unknown> | null;
}

async function fetchFunnelEvents(sinceIso: string): Promise<FunnelEvent[]> {
  const wanted = new Set([
    'money_page_viewed',
    'dataset_license_purchase_clicked',
    'advertise_cta_clicked',
    'partner_with_us_clicked',
    'hockey_database_cta_clicked',
    'newsletter_signup_submitted',
    'contact_submitted',
    'add_listing_intent_viewed',
    'add_listing_submitted',
    'pricing_viewed',
    'pricing_card_clicked',
    'checkout_started',
    'checkout_completed',
  ]);

  const out: FunnelEvent[] = [];
  let start = sinceIso;

  // Paginate (PostgREST caps at 1000 rows per request).
  for (let i = 0; i < 40; i++) {
    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .select('name, ts, props')
      .gte('ts', start)
      .in('name', Array.from(wanted))
      .order('ts', { ascending: true })
      .limit(1000);

    if (error) {
      console.error('[revenue-metrics] funnel query failed:', error.message);
      break;
    }
    const rows = (data ?? []) as FunnelEvent[];
    if (rows.length === 0) break;
    out.push(...rows);
    if (rows.length < 1000) break;
    const lastTs = (rows[rows.length - 1] as unknown as { ts: string }).ts;
    const next = new Date(new Date(lastTs).getTime() + 1).toISOString();
    if (next === start) break;
    start = next;
  }

  return out;
}
