#!/usr/bin/env node
/**
 * scripts/_daily-revenue-report.mjs
 *
 * Point 5 of Arnel's approved revenue scope: a DAILY revenue report that
 * arrives without anyone having to open a dashboard.
 *
 * Why this exists:
 *   The /admin/revenue dashboard was live and correct, but a dashboard you
 *   have to remember to open is not a report. Arnel approved "expand the
 *   admin revenue dashboard with live site-side metrics" and asked for the
 *   daily number to just arrive.
 *
 * What it reports (all figures come from src/lib/revenue-metrics.ts, the
 * SAME module the dashboard uses -- so this can never disagree with the
 * dashboard):
 *   - Lifetime revenue + paying customers
 *   - Real audience (newsletter + leads, test rows excluded)
 *   - Business pipeline (listing submissions pending, bookings, B2B)
 *   - 30-day money-page funnel
 *   - Self-traffic excluded count (so a zero is a real zero)
 *
 * Delivery: the script PRINTS the report to stdout. The cron that runs it
 * is an `agentTurn` job whose delivery target is the RinkStop Ops Telegram
 * group, so OpenClaw's own channel layer sends it. (An earlier draft tried
 * to call the Maton gateway for a bot token directly — the MATON_API_KEY in
 * .env is REVOKED and the working key in credentials/maton.json has no
 * telegram connection. Going through OpenClaw's channel layer avoids
 * managing bot tokens at all.)
 *
 * Design notes:
 *   - Runs the real production module via esbuild (same technique as
 *     scripts/_probe-revenue-metrics.mjs) rather than re-implementing the
 *     queries. A second implementation of the same math WILL drift.
 *   - Exit code is meaningful: 0 = report produced, non-zero = failed.
 *   - Deliberately reports every day, even when the numbers are zero. A
 *     daily revenue report that only speaks when something is wrong is not
 *     a revenue report -- and Arnel needs to see the zero so he knows the
 *     zero is real.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const CREDS_PATH = '/root/.openclaw/credentials/supabase.json';

function fail(msg, detail) {
  console.error(`[daily-revenue] ${msg}${detail ? `: ${detail}` : ''}`);
  process.exit(1);
}

// ── 1. Load credentials ────────────────────────────────────────────────────
if (!fs.existsSync(CREDS_PATH)) fail('supabase credentials not found', CREDS_PATH);
const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
if (!creds.url || !creds.serviceRoleKey) fail('supabase credentials missing url/serviceRoleKey');

process.env.SUPABASE_URL = creds.url;
process.env.SUPABASE_SERVICE_ROLE_KEY = creds.serviceRoleKey;
process.env.NEXT_PUBLIC_SUPABASE_URL = creds.url;

// ── 2. Bundle + run the REAL production metrics module ────────────────────
const supabaseStub = `
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
export const supabase = supabaseAdmin;
export const supabaseRead = supabaseAdmin;
`;

// The stub lives OUTSIDE src/ so it can never be picked up by tsc, the
// Next build, or git as a stray source file. (An earlier version wrote it
// to src/lib/__daily_report_supabase_stub.ts and it leaked into the working
// tree and blocked the pre-push guard.)
const stubPath = path.join(repoRoot, 'scripts', '.tmp-daily-report-supabase-stub.ts');
fs.writeFileSync(stubPath, supabaseStub);

let metrics;
try {
  const esbuildDir = fs
    .readdirSync(path.join(repoRoot, 'node_modules', '.pnpm'))
    .filter((d) => d.startsWith('esbuild@'))
    .map((d) =>
      path.join(repoRoot, 'node_modules', '.pnpm', d, 'node_modules', 'esbuild', 'lib', 'main.js'),
    )
    .find((p) => fs.existsSync(p));
  if (!esbuildDir) fail('esbuild not found in node_modules/.pnpm');

  const esbuild = await import(pathToFileURL(esbuildDir).href);
  const result = await esbuild.build({
    entryPoints: [path.join(repoRoot, 'src', 'lib', 'revenue-metrics.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    target: 'node20',
    external: ['@supabase/supabase-js'],
    alias: { '@/lib/supabase': stubPath },
    logLevel: 'error',
  });

  const outFile = path.join(repoRoot, '.daily-revenue-report.mjs');
  fs.writeFileSync(outFile, result.outputFiles[0].text);
  const mod = await import(pathToFileURL(outFile).href + `?t=${Date.now()}`);
  metrics = await mod.getRevenueMetrics();
  fs.rmSync(outFile, { force: true });
} catch (e) {
  fail('failed to compute revenue metrics', e?.message ?? String(e));
} finally {
  fs.rmSync(stubPath, { force: true });
}

if (!metrics) fail('metrics computation returned nothing');

// ── 3. Format the report ──────────────────────────────────────────────────
const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const f = metrics.funnel;
const t = metrics.totals;

const lines = [];
lines.push('💰 *RinkStop — Daily Revenue Report*');
lines.push(`_${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC_`);
lines.push('');
lines.push('*Revenue*');
lines.push(`  Lifetime revenue: *${money(t.lifetimeRevenueCents)}**`);
lines.push(`  Paying customers: *${t.payingCustomers}**`);
lines.push(`  Dataset licenses: *${metrics.oneTime.datasetLicenses}**`);
lines.push('');
lines.push('*Audience (real only)*');
lines.push(`  Newsletter: *${metrics.audience.newsletterSubscribers}** (${metrics.audience.newsletterSubscribersTest} test excluded)`);
lines.push(`  Leads: *${metrics.audience.leads}** (${metrics.audience.leadsTest} test excluded)`);
lines.push('');
lines.push('*Pipeline*');
lines.push(`  Listing submissions: *${metrics.pipeline.listingSubmissions}** (${metrics.pipeline.pendingListingSubmissions} pending)`);
lines.push(`  Bookings: *${metrics.pipeline.bookingRequests}** · Payment records: *${metrics.pipeline.paymentRecords}** · B2B: *${metrics.pipeline.b2bProspects}**`);
const lr = metrics.pipeline.leadResponse;
if (lr) {
  lines.push('');
  lines.push('*Lead response*');
  lines.push(`  Replied to: *${lr.contacted}** · Never replied to: *${lr.neverContacted}**`);
  lines.push(`  Converted to a live listing: *${lr.convertedToListing}**`);
  if (lr.oldestUnansweredHours !== null && lr.oldestUnansweredHours !== undefined) {
    lines.push(`  ⚠️ Oldest unanswered lead: *${Math.round(lr.oldestUnansweredHours / 24)} days*`);
  }
}
lines.push('');
lines.push('*Funnel (30d)*');
lines.push(`  Money-page views: *${f.moneyPageViews}**`);
lines.push(`  Dataset purchase clicks: *${f.datasetPurchaseClicks}**`);
lines.push(`  Advertise / Partner / DB clicks: *${f.advertiseClicks}* / *${f.partnerClicks}* / *${f.hockeyDatabaseClicks}*`);
lines.push(`  Pricing views: *${f.pricingViews}* → card clicks: *${f.pricingCardClicks}*`);
lines.push(`  Checkout started: *${f.checkoutStarted}* → completed: *${f.checkoutCompleted}*`);
lines.push(`  Add-listing views: *${f.addListingViews}* → submissions: *${f.listingSubmissions30d}*`);
lines.push(`  Contact submissions: *${f.contactSubmissions}*`);
if (f.selfTrafficExcluded > 0) {
  lines.push(`  _(${f.selfTrafficExcluded} events excluded as self-traffic)_`);
}
lines.push('');
lines.push(`Dashboard: https://rinkstop.com/admin/revenue`);

const text = lines.join('\n');

// The report IS the output. The cron reads stdout and delivers it.
console.log(text);

