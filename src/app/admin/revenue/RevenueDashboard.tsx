'use client';

import { useState, useCallback, useEffect } from 'react';

interface RevenueData {
  activeSubscribers: number;
  tierCounts: Record<string, number>;
  mrrCents: number;
  arrCents: number;
  trialingNow: number;
  pastDue: number;
  newSubsLast7d: number;
  cancellationsLast7d: number;
  paymentFailuresLast7d: number;
  successfulPaymentsLast7d: number;
  churnRate: number;
  recentEvents: Array<{ type: string; created: number; amount?: number; tier?: string }>;
  siteMetrics?: SiteMetrics | null;
  siteMetricsError?: string | null;
  generatedAt: number;
}

interface SiteMetrics {
  oneTime: {
    datasetLicenses: number;
    datasetLicensesTest: number;
    datasetLicenseRevenueCents: number;
    totalOneTimeCustomers: number;
    totalOneTimeRevenueCents: number;
  };
  subscriptions: { activeProfiles: number; activeProfilesTest: number };
  audience: {
    newsletterSubscribers: number;
    newsletterSubscribersTest: number;
    leads: number;
    leadsTest: number;
    totalRealAudience: number;
  };
  pipeline: {
    listingSubmissions: number;
    listingSubmissionsTest: number;
    pendingListingSubmissions: number;
    listingInquiries: number;
    bookingRequests: number;
    paymentRecords: number;
    b2bProspects: number;
  };
  funnel: {
    moneyPageViews: number;
    moneyPageViewsByPage: Record<string, number>;
    datasetPurchaseClicks: number;
    advertiseClicks: number;
    partnerClicks: number;
    hockeyDatabaseClicks: number;
    newsletterSignupSubmissions: number;
    contactSubmissions: number;
    addListingViews: number;
    listingSubmissions30d: number;
    pricingViews: number;
    pricingCardClicks: number;
    checkoutStarted: number;
    checkoutCompleted: number;
  };
  totals: { lifetimeRevenueCents: number; payingCustomers: number; realAudience: number };
  generatedAt: string;
}

interface Props {
  initial: { data?: RevenueData; error?: string; status?: number };
}

const TIER_COLORS: Record<string, string> = {
  verified_identity: 'text-amber-300',
  identity_plus: 'text-amber-400',
  org_plus: 'text-amber-400',
  org_pro: 'text-amber-300',
  org_elite: 'text-amber-200',
  org_enterprise: 'text-rose-300',
  other: 'text-slate-500',
};

const TIER_BG: Record<string, string> = {
  verified_identity: 'bg-amber-400',
  identity_plus: 'bg-amber-500',
  org_plus: 'bg-amber-500',
  org_pro: 'bg-amber-400',
  org_elite: 'bg-amber-300',
  org_enterprise: 'bg-rose-400',
  other: 'bg-slate-800',
};

function fmtMoney(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function timeAgo(unix: number): string {
  const sec = Math.floor(Date.now() / 1000 - unix);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function RevenueDashboard({ initial }: Props) {
  const [data, setData] = useState<RevenueData | null>(initial.data || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initial.error || null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/revenue');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  if (error && !data) {
    return (
      <div className="bg-rose-400/10 border border-rose-400/20 text-rose-400 px-4 py-3 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-slate-400">Loading revenue data…</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-xs text-slate-500 font-mono">
          Generated {timeAgo(Math.floor(data.generatedAt / 1000))}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-white text-xs rounded transition-colors"
        >
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Stat label="MRR" value={fmtMoney(data.mrrCents)} color="text-teal-400" sub="Monthly Recurring Revenue" />
        <Stat label="ARR" value={fmtMoney(data.arrCents)} color="text-amber-400" sub="Annual Run Rate" />
        <Stat label="Active Subscribers" value={data.activeSubscribers.toLocaleString()} sub={`${data.trialingNow} trialing, ${data.pastDue} past due`} />
        <Stat
          label="Churn (7d)"
          value={`${(data.churnRate * 100).toFixed(1)}%`}
          color={data.churnRate > 0.1 ? 'text-rose-400' : 'text-slate-300'}
          sub={`${data.cancellationsLast7d} canceled, ${data.newSubsLast7d} new`}
        />
      </div>

      {/* ── Site-side revenue signals (2026-10-28) ───────────────────────────
          The Stripe cards above only cover subscriptions. These cards cover
          every OTHER revenue signal that was previously invisible: one-time
          purchases, audience captured, inbound business pipeline, and the
          money-page funnel. Test rows are excluded from the real counts. */}
      {data.siteMetrics ? (
        <>
          <h3 className="text-sm uppercase tracking-wider text-slate-500 mb-3 mt-2">
            Site Revenue Signals
          </h3>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <Stat
              label="Lifetime Revenue"
              value={fmtMoney(data.siteMetrics.totals.lifetimeRevenueCents)}
              color={data.siteMetrics.totals.lifetimeRevenueCents > 0 ? 'text-teal-400' : 'text-rose-400'}
              sub="confirmed one-time purchases"
            />
            <Stat
              label="Paying Customers"
              value={data.siteMetrics.totals.payingCustomers.toLocaleString()}
              color={data.siteMetrics.totals.payingCustomers > 0 ? 'text-teal-400' : 'text-rose-400'}
              sub="real, test rows excluded"
            />
            <Stat
              label="Dataset Licenses"
              value={data.siteMetrics.oneTime.datasetLicenses.toLocaleString()}
              color={data.siteMetrics.oneTime.datasetLicenses > 0 ? 'text-teal-400' : 'text-slate-300'}
              sub={`$499 each · ${data.siteMetrics.oneTime.datasetLicensesTest} test excluded`}
            />
            <Stat
              label="Real Audience"
              value={data.siteMetrics.totals.realAudience.toLocaleString()}
              sub="newsletter + leads, test excluded"
            />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <h3 className="text-sm uppercase tracking-wider text-slate-500 mb-3">Audience (real only)</h3>
              <div className="space-y-3">
                <Row label="Newsletter subscribers" value={data.siteMetrics.audience.newsletterSubscribers} color="text-teal-400" sub={`${data.siteMetrics.audience.newsletterSubscribersTest} test excluded`} />
                <Row label="Leads captured" value={data.siteMetrics.audience.leads} color="text-teal-400" sub={`${data.siteMetrics.audience.leadsTest} test excluded`} />
                <Row label="Newsletter signups (30d)" value={data.siteMetrics.funnel.newsletterSignupSubmissions} />
                <Row label="Contact submissions (30d)" value={data.siteMetrics.funnel.contactSubmissions} sub="from any money page" />
                <Row label="Add-listing views (30d)" value={data.siteMetrics.funnel.addListingViews} />
                <Row label="Listing submissions (30d)" value={data.siteMetrics.funnel.listingSubmissions30d} sub="our only real lead source" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <h3 className="text-sm uppercase tracking-wider text-slate-500 mb-3">Business Pipeline</h3>
              <div className="space-y-3">
                <Row label="Listing submissions" value={data.siteMetrics.pipeline.listingSubmissions} color="text-teal-400" sub={`${data.siteMetrics.pipeline.pendingListingSubmissions} pending`} />
                <Row label="Listing inquiries" value={data.siteMetrics.pipeline.listingInquiries} />
                <Row label="Booking requests" value={data.siteMetrics.pipeline.bookingRequests} />
                <Row label="B2B prospects" value={data.siteMetrics.pipeline.b2bProspects} />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-8">
            <h3 className="text-sm uppercase tracking-wider text-slate-500 mb-3">
              Money-Page Funnel (last 30 days)
            </h3>
            <div className="space-y-3">
              <Row label="Money-page views" value={data.siteMetrics.funnel.moneyPageViews} />
              <Row label="Dataset purchase clicks ($499)" value={data.siteMetrics.funnel.datasetPurchaseClicks} color={data.siteMetrics.funnel.datasetPurchaseClicks > 0 ? 'text-teal-400' : 'text-slate-300'} />
              <Row label="Advertise CTA clicks" value={data.siteMetrics.funnel.advertiseClicks} />
              <Row label="Partner CTA clicks" value={data.siteMetrics.funnel.partnerClicks} />
              <Row label="Hockey-database CTA clicks" value={data.siteMetrics.funnel.hockeyDatabaseClicks} />
              <Row label="Pricing views" value={data.siteMetrics.funnel.pricingViews} />
              <Row label="Pricing card clicks" value={data.siteMetrics.funnel.pricingCardClicks} />
              <Row label="Checkout started" value={data.siteMetrics.funnel.checkoutStarted} />
              <Row label="Checkout completed" value={data.siteMetrics.funnel.checkoutCompleted} color={data.siteMetrics.funnel.checkoutCompleted > 0 ? 'text-teal-400' : 'text-rose-400'} />
            </div>
            {Object.keys(data.siteMetrics.funnel.moneyPageViewsByPage).length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800/60">
                <div className="text-xs uppercase tracking-wider text-slate-600 mb-2">Views by page</div>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(data.siteMetrics.funnel.moneyPageViewsByPage).map(([page, n]) => (
                    <span key={page} className="text-xs font-mono text-slate-400">
                      {page}: <span className="text-slate-200">{n}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-amber-400/10 border border-amber-400/20 text-amber-300 px-4 py-3 rounded-lg mb-8 text-sm">
          Site revenue metrics unavailable
          {data.siteMetricsError ? `: ${data.siteMetricsError}` : '.'}
        </div>
      )}

      {/* Subscribers by tier */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-6">
        <h3 className="text-sm uppercase tracking-wider text-slate-500 mb-4">Subscribers by Tier</h3>
        <div className="space-y-3">
          {(['verified_identity', 'identity_plus', 'org_plus', 'org_pro', 'org_elite', 'org_enterprise', 'other'] as const).map((tier) => {
            const count = data.tierCounts[tier] || 0;
            const max = Math.max(...Object.values(data.tierCounts), 1);
            const pct = (count / max) * 100;
            return (
              <div key={tier} className="flex items-center gap-4">
                <div className={`w-20 text-xs uppercase tracking-wider ${TIER_COLORS[tier]}`}>{tier}</div>
                <div className="flex-1 h-6 bg-slate-800 rounded overflow-hidden">
                  <div className={`h-full ${TIER_BG[tier]} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <div className="w-12 text-right text-sm font-mono text-white">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column: events + payment health */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm uppercase tracking-wider text-slate-500 mb-3">Recent Events (7d)</h3>
          {data.recentEvents.length === 0 ? (
            <p className="text-slate-500 text-sm">No recent events.</p>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {data.recentEvents.map((ev, i) => (
                <li key={i} className="text-xs flex items-center gap-2 py-1.5 border-b border-slate-800/50">
                  <span className="text-slate-500 font-mono w-16">{timeAgo(ev.created)}</span>
                  <span
                    className={
                      ev.type === 'new_subscription'
                        ? 'text-teal-400'
                        : ev.type === 'cancellation'
                        ? 'text-rose-400'
                        : ev.type === 'payment_failed'
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }
                  >
                    {ev.type === 'new_subscription' && '↑ New subscription'}
                    {ev.type === 'cancellation' && '↓ Cancellation'}
                    {ev.type === 'payment_failed' && '⚠ Payment failed'}
                  </span>
                  {ev.tier && <span className="text-slate-500">[{ev.tier}]</span>}
                  {ev.amount !== undefined && ev.amount !== null && (
                    <span className="ml-auto font-mono text-slate-300">{fmtMoney(ev.amount)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm uppercase tracking-wider text-slate-500 mb-3">Payment Health (7d)</h3>
          <div className="space-y-3">
            <Row label="Successful payments" value={data.successfulPaymentsLast7d} color="text-teal-400" />
            <Row label="Failed payments" value={data.paymentFailuresLast7d} color={data.paymentFailuresLast7d > 0 ? 'text-rose-400' : 'text-slate-300'} />
            <Row label="New subscriptions" value={data.newSubsLast7d} color="text-white" />
            <Row label="Cancellations" value={data.cancellationsLast7d} color={data.cancellationsLast7d > 0 ? 'text-amber-400' : 'text-slate-300'} />
            <Row label="Trialing" value={data.trialingNow} color="text-slate-300" sub="active trials right now" />
            <Row label="Past due" value={data.pastDue} color={data.pastDue > 0 ? 'text-rose-400' : 'text-slate-300'} sub="action required" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color = 'text-white', sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function Row({ label, value, color, sub }: { label: string; value: number | string; color?: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-slate-800/50 pb-2">
      <div>
        <span className="text-sm text-slate-300">{label}</span>
        {sub && <span className="text-xs text-slate-500 ml-2">{sub}</span>}
      </div>
      <span className={`text-lg font-mono ${color || 'text-white'}`}>{value}</span>
    </div>
  );
}
