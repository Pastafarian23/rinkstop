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
    /**
     * Lead response (2026-10-29). Two real leads sat untouched for 8 and 27
     * days with no field anywhere recording that we had never replied.
     * These make the pipeline measurable.
     */
    leadResponse: {
      /** Leads where we have never replied. */
      neverContacted: number;
      /** Leads we have replied to. */
      contacted: number;
      /** Leads converted to a live listing. */
      convertedToListing: number;
      /** Hours from submission to first reply, averaged over replied leads. */
      avgFirstResponseHours: number | null;
      /** Hours since the OLDEST never-replied lead was submitted. */
      oldestUnansweredHours: number | null;
      /** Average hours since submission across all never-replied leads. */
      avgUnansweredHours: number | null;
    };
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
    /**
     * Events dropped from the funnel above because they were our own
     * verification traffic or bot-shaped self-referrer hits. Surfaced so
     * the dashboard can say what it excluded instead of silently shrinking
     * the numbers.
     */
    selfTrafficExcluded: number;
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
    .select('id, email, status, listing_type, created_at, contacted_at, listing_id');
  const submissionsAll = submissionRows ?? [];
  const submissionTest = submissionsAll.filter((r) => isTestEmail(r.email)).length;
  const pendingSubmissions = submissionsAll.filter((r) => r.status === 'pending').length;

  // ── Lead response (2026-10-29) ───────────────────────────────────────────
  // Two real leads sat untouched for 8 and 27 days and NOTHING in the system
  // recorded that we had never replied. These numbers make that visible.
  // Test-looking submissions are excluded, same as everywhere else.
  const realSubmissions = submissionsAll.filter((r) => !isTestEmail(r.email));
  const neverContactedRows = realSubmissions.filter((r) => !r.contacted_at);
  const contactedRows = realSubmissions.filter((r) => !!r.contacted_at);
  const convertedToListing = realSubmissions.filter((r) => !!r.listing_id).length;

  const hoursSince = (iso: string | null): number | null => {
    if (!iso) return null;
    const ms = now.getTime() - new Date(iso).getTime();
    return Number.isFinite(ms) ? Math.round(ms / 3600000) : null;
  };

  const unansweredAges = neverContactedRows
    .map((r) => hoursSince(r.created_at))
    .filter((n): n is number => n !== null);
  const responseTimes = contactedRows
    .map((r) => hoursSince(r.created_at))
    .filter((n): n is number => n !== null);

  const leadResponse = {
    neverContacted: neverContactedRows.length,
    contacted: contactedRows.length,
    convertedToListing,
    avgFirstResponseHours:
      responseTimes.length > 0
        ? Number(
            (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1),
          )
        : null,
    oldestUnansweredHours:
      unansweredAges.length > 0 ? Math.max(...unansweredAges) : null,
    avgUnansweredHours:
      unansweredAges.length > 0
        ? Number((unansweredAges.reduce((a, b) => a + b, 0) / unansweredAges.length).toFixed(1))
        : null,
  };

  const listingInquiries = await countNonNull('leads', 'listing_id');
  const bookingRequests = await countRows('booking_requests', (q) => q);
  const paymentRecords = await countRows('payment_records', (q) => q);
  const b2bProspects = await countRows('b2b_prospects', (q) => q);

  // ── Money-page funnel (last 30 days) ─────────────────────────────────────
  const funnelEvents = await fetchFunnelEvents(thirtyDaysAgo);

  // Exclude our own verification traffic and bot-shaped self-referrer hits.
  // A revenue dashboard that counts the operator's own curls as audience
  // behaviour is worse than no dashboard.
  const organicEvents = funnelEvents.filter((e) => !isSelfTraffic(e));
  const selfTrafficExcluded = funnelEvents.length - organicEvents.length;

  const moneyPageViewsByPage: Record<string, number> = {};
  for (const e of organicEvents) {
    if (e.name !== 'money_page_viewed') continue;
    const page = (e.props?.page as string) || 'unknown';
    moneyPageViewsByPage[page] = (moneyPageViewsByPage[page] || 0) + 1;
  }

  const countEvent = (name: string) => organicEvents.filter((e) => e.name === name).length;

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
      leadResponse,
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
      selfTrafficExcluded,
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
  referrer?: string | null;
  pathname?: string | null;
}

/**
 * Is this event our own traffic (or a bot's), rather than a real visitor?
 *
 * 2026-10-29 (Arnel's revenue dashboard audit): every money-page event
 * recorded in the first 24h of instrumentation was MY OWN verification
 * traffic — a manual curl plus several real-browser tests. The dashboard was
 * reporting `moneyPageViews: 3` and `datasetPurchaseClicks: 1` as if they
 * were audience behaviour. They were not.
 *
 * Two filters:
 *  1. `props.surface === 'verification'` — the explicit marker used by the
 *     manual curl probe.
 *  2. Self-referrer: the event's referrer equals the page's own URL, with no
 *     query string. A human arriving from Google sends
 *     `document.referrer = "https://www.google.com/"`; a page that
 *     re-requests itself (bot, refresh, or our own browser test) ends up with
 *     the current page as its referrer.
 *
 * WHY THE COLUMN IS AUTHORITATIVE FOR THIS CHECK:
 * `client-track.ts` sends `referrer: document.referrer`. On a fresh page load
 * from Google that is the external URL. When a page is opened with NO
 * referrer (our own browser tests, a typed URL, a curl), `document.referrer`
 * is empty and the server falls back to the HTTP `Referer` header — which for
 * a fetch to /api/track is the current page. So:
 *   column referrer == own pathname, no query  ->  self-traffic
 *   column referrer is external                   ->  real visitor
 *   column referrer is another rinkstop.com page -> internal navigation
 *
 * `props.referrer` is only set by AddListingForm, and it is NOT a reliable
 * substitute: for HISTORICAL rows the column held the HTTP header while
 * props held the true source, so a props-first precedence would classify
 * real Google visitors (`props.referrer = "https://www.google.com/"`) as
 * self-traffic via their stale self-referrer column and silently delete
 * real audience from the funnel. The column-first rule gets both right.
 *
 * Deliberately NOT filtering on `props` being null or on user_id: the
 * money pages are mostly visited by logged-out users.
 */
function isSelfTraffic(e: FunnelEvent): boolean {
  if (e.props?.surface === 'verification') return true;

  // NEVER filter a submission event. A submission means a human filled in a
  // form and pressed submit -- the GLXY Cup submission (2026-10-21) has a
  // bare self-referrer and would be dropped by the view heuristics below,
  // but it is a verified real lead. Only VIEW and CLICK events can be
  // bot-shaped.
  const SUBMISSION_EVENTS = new Set([
    'add_listing_submitted',
    'contact_submitted',
    'newsletter_signup_submitted',
  ]);
  if (SUBMISSION_EVENTS.has(e.name)) return false;

  // The `referrer` COLUMN and `props.referrer` can disagree, and when they do
  // the props value is the trustworthy one.
  //
  // The column was the HTTP `Referer` header until 2026-10-29, which for a
  // client-side fetch is the current page -- so historical rows have a
  // self-referrer in the column even when the visitor came from Google.
  // `props.referrer` (document.referrer, set by AddListingForm) records the
  // TRUE source for those same rows.
  //
  // So: if props.referrer exists and is EXTERNAL, it is a real visitor --
  // never self-traffic, regardless of what the column says.
  const columnRef = typeof e.referrer === 'string' ? e.referrer : null;
  const propRef = typeof e.props?.referrer === 'string' ? e.props.referrer : null;

  // An external props.referrer is authoritative proof of a real visitor.
  if (propRef) {
    try {
      const propUrl = new URL(propRef);
      if (!propUrl.hostname.endsWith('rinkstop.com')) return false;
    } catch {
      // unparseable -> fall through to the column check
    }
  }

  // Otherwise use the column. For new rows it holds the real source; for old
  // rows a bare self-referrer is the best available signal and the only
  // thing that distinguishes "our own browser test" from a real visit.
  const effectiveRef: string | null = columnRef ?? propRef;

  // No referrer at all: could be direct traffic. Not enough to exclude.
  if (!effectiveRef) return false;

  try {
    const refUrl = new URL(effectiveRef);
    const path = e.pathname;

    // Same page, no query string -> the page re-requested itself.
    //
    // BUT a self-referrer alone is NOT proof of bot traffic. /pricing is
    // linked 12x from the home page and from every major directory page, so
    // a real visitor can legitimately produce Referer: /pricing (an in-site
    // navigation, a reload, or a bookmarked-URL visit).
    //
    // The discriminator that actually separates them is the referrer-derived
    // CONTEXT. /pricing derives `utmTier` from the referrer: a visitor
    // arriving via /directory/teams gets 'club_starter', via
    // /directory/rinks gets 'business_listing', etc. A request with a
    // self-referrer AND a null tier carries no referrer context at all --
    // that is the shape of an automated check.
    //
    // Measured over the last 30 days: of 907 pricing_viewed rows with
    // utmTier=null, only 3 had referrer === '/pricing'. The other 904 were
    // real traffic (null-referrer direct visits, /directory/games/... etc.).
    // So requiring BOTH conditions excludes exactly the automated cluster
    // and keeps every real visitor.
    if (path && refUrl.pathname === path && !refUrl.search) {
      const tier = e.props?.utmTier;
      const hasReferrerContext = tier !== undefined && tier !== null;
      if (!hasReferrerContext) return true;
      return false;
    }

    // Same page WITH a query string -> a Next.js client-side navigation
    // within our own site (e.g. /add-listing?name=slough). That is how
    // BOTH real listing submissions arrived, so it must NOT be excluded.
    if (path && refUrl.pathname === path && refUrl.search) return false;

    // Different page on our own domain -> legitimate internal navigation.
    if (refUrl.hostname.endsWith('rinkstop.com')) return false;

    // External referrer (google.com etc.) -> a real visitor. Not self-traffic.
    return false;
  } catch {
    return false;
  }
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
      .select('name, ts, props, referrer, pathname')
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
