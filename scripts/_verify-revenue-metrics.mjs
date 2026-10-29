/**
 * scripts/_verify-revenue-metrics.mjs
 *
 * Dry-run verification of src/lib/revenue-metrics.ts against the LIVE
 * Supabase project. Mirrors the production logic so we can confirm the
 * numbers before shipping. Read-only — no writes.
 *
 * Run: node scripts/_verify-revenue-metrics.mjs
 */
import fs from 'node:fs';

const creds = JSON.parse(
  fs.readFileSync('/root/.openclaw/credentials/supabase.json', 'utf8'),
);
const base = creds.url;
const key = creds.serviceRoleKey;
const H = { apikey: key, Authorization: `Bearer ${key}` };

const TEST_EMAIL_RE =
  /(^test|@example\.com|@kiloclaw\.dev|test@|\.test@|@test\.|no-?reply|donotreply)/i;
const isTestEmail = (e) => (e ? TEST_EMAIL_RE.test(e.trim()) : false);

async function get(path, opts = {}) {
  const r = await fetch(`${base}/rest/v1/${path}`, { headers: H, ...opts });
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

async function countAll(table) {
  const r = await fetch(`${base}/rest/v1/${table}?select=*`, {
    headers: { ...H, Prefer: 'count=exact', Range: '0-0' },
  });
  const cr = r.headers.get('content-range') || '';
  return Number(cr.split('/')[1] || 0);
}

async function countNonNull(table, col) {
  const r = await fetch(`${base}/rest/v1/${table}?select=*&${col}=not.is.null`, {
    headers: { ...H, Prefer: 'count=exact', Range: '0-0' },
  });
  const cr = r.headers.get('content-range') || '';
  return Number(cr.split('/')[1] || 0);
}

const out = {};

const profiles = await get('profiles?select=email,tier,stripe_subscription_id,stripe_session_id');
const ds = profiles.filter((p) => p.tier === 'dataset_license');
out.datasetAll = ds.length;
out.datasetTest = ds.filter((p) => isTestEmail(p.email)).length;
out.datasetReal = out.datasetAll - out.datasetTest;
out.datasetRevenueCents = out.datasetReal * 49900;
out.paidProfiles = profiles.filter((p) => p.stripe_subscription_id).length;
out.paidProfilesTest = profiles.filter(
  (p) => p.stripe_subscription_id && isTestEmail(p.email),
).length;

const news = await get('newsletter_subscribers?select=email,is_active');
const newsActive = news.filter((n) => n.is_active !== false);
out.newsletterAll = newsActive.length;
out.newsletterTest = newsActive.filter((n) => isTestEmail(n.email)).length;

const leads = await get('leads?select=email,source,listing_id');
out.leadsAll = leads.length;
out.leadsTest = leads.filter(
  (l) => l.source === 'test' || isTestEmail(l.email),
).length;
out.listingInquiries = leads.filter((l) => l.listing_id != null).length;

const subs = await get('listing_submissions?select=email,status');
out.submissionsAll = subs.length;
out.submissionsTest = subs.filter((s) => isTestEmail(s.email)).length;
out.submissionsPending = subs.filter((s) => s.status === 'pending').length;

for (const t of ['booking_requests', 'payment_records', 'b2b_prospects']) {
  try {
    out[t] = await countAll(t);
  } catch {
    out[t] = 'table missing';
  }
}

// Funnel (30 days)
const since = new Date(Date.now() - 30 * 864e5).toISOString();
const wanted = [
  'money_page_viewed',
  'dataset_license_purchase_clicked',
  'advertise_cta_clicked',
  'partner_with_us_clicked',
  'hockey_database_cta_clicked',
  'newsletter_signup_submitted',
  'pricing_viewed',
  'pricing_card_clicked',
  'checkout_started',
  'checkout_completed',
].join(',');
// Funnel with pagination (PostgREST caps at 1000 rows/request).
const ev = [];
let start = since;
for (let i = 0; i < 60; i++) {
  const rows = await get(
    `analytics_events?select=name,ts,props&ts=gte.${start}&name=in.(${wanted})&order=ts.asc&limit=1000`,
  );
  if (!rows.length) break;
  ev.push(...rows);
  if (rows.length < 1000) break;
  start = new Date(new Date(rows[rows.length - 1].ts).getTime() + 1).toISOString();
}
out.funnel = {};
for (const e of ev) out.funnel[e.name] = (out.funnel[e.name] || 0) + 1;
out.funnelRowsFetched = ev.length;

out.totals = {
  lifetimeRevenueCents: out.datasetRevenueCents,
  payingCustomers: out.datasetReal + (out.paidProfiles - out.paidProfilesTest),
  realAudience:
    out.newsletterAll - out.newsletterTest + (out.leadsAll - out.leadsTest),
};

console.log(JSON.stringify(out, null, 2));
