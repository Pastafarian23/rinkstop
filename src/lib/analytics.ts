/**
 * Lightweight server-side analytics.
 *
 * The Day-1 funnel we care about:
 *   pricing_viewed → checkout_started → checkout_completed → subscription_active
 *
 * Why we built our own instead of using PostHog/GA/GTM:
 * - PostHog/GA require an account + project key we don't have set up yet
 * - Vercel Web Analytics only does page views, not event funnels
 * - Adding a third-party script is extra JS weight, GDPR/cookie-banner surface,
 *   and one more thing that can break in a serverless deploy
 * - We already have Supabase + a service role key. One table, one server-side
 *   log call. No client-side script to ship. Privacy-by-default (no IPs, no
 *   cookies, no third-party fingerprinting). GDPR-friendly.
 *
 * What this does:
 * - trackEvent(name, props): logs to console (always) and inserts to
 *   analytics_events in Supabase (best-effort, never throws)
 * - trackPageView(req, pathname): for use in pages/layouts
 * - Everything server-side. Use a server action or pass from a Client
 *   Component to a /api/track endpoint to capture client events.
 *
 * When the table doesn't exist yet (migration not applied), all calls
 * silently fall back to console.error only. No 500s, no broken dashboards.
 *
 * Console format is structured JSON so it's grep-able in Vercel logs:
 *   vercel logs <url> --json --no-follow | jq 'select(.message|startswith("[analytics]"))'
 *
 * Migration: supabase/migrations/2026-06-16-analytics.sql
 *   CREATE TABLE analytics_events (
 *     id BIGSERIAL PRIMARY KEY,
 *     ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     name TEXT NOT NULL,
 *     user_id TEXT,
 *     session_id TEXT,
 *     pathname TEXT,
 *     referrer TEXT,
 *     utm_source TEXT,
 *     utm_medium TEXT,
 *     utm_campaign TEXT,
 *     props JSONB
 *   );
 *   CREATE INDEX analytics_events_name_ts_idx ON analytics_events (name, ts DESC);
 *   CREATE INDEX analytics_events_user_ts_idx ON analytics_events (user_id, ts DESC);
 *   CREATE INDEX analytics_events_pathname_ts_idx ON analytics_events (pathname, ts DESC);
 */

import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED !== 'false';

export interface AnalyticsEvent {
  name: string;
  userId?: string | null;
  pathname?: string | null;
  referrer?: string | null;
  utm?: { source?: string; medium?: string; campaign?: string };
  props?: Record<string, unknown>;
}

/**
 * Track a single event. Best-effort: always logs to console, attempts a
 * Supabase insert that swallows all errors. Never throws.
 */
export async function trackEvent(evt: AnalyticsEvent): Promise<void> {
  if (!ANALYTICS_ENABLED) return;

  const log = {
    name: evt.name,
    userId: evt.userId ?? null,
    pathname: evt.pathname ?? null,
    referrer: evt.referrer ?? null,
    utm: evt.utm ?? null,
    props: evt.props ?? null,
    ts: new Date().toISOString(),
  };

  // Always log to console — works without Supabase, queryable in Vercel logs.
  console.log('[analytics]', JSON.stringify(log));

  // Best-effort insert. Swallow all errors so a missing table or transient
  // Supabase hiccup never 500s a page.
  try {
    await supabaseAdmin.from('analytics_events').insert({
      name: log.name,
      user_id: log.userId,
      pathname: log.pathname,
      referrer: log.referrer,
      utm_source: log.utm?.source ?? null,
      utm_medium: log.utm?.medium ?? null,
      utm_campaign: log.utm?.campaign ?? null,
      props: log.props,
    });
  } catch (e: any) {
    console.error('[analytics] supabase insert failed (table may not exist yet):', e?.message ?? e);
  }
}

/**
 * Read UTM params + referrer from incoming request headers and
 * pair them with a pathname. Use this in server pages.
 */
export async function extractRequestContext(pathname: string): Promise<{
  referrer: string | null;
  utm: AnalyticsEvent['utm'];
}> {
  let referrer: string | null = null;
  let utm: AnalyticsEvent['utm'] = undefined;

  try {
    const h = await headers();
    referrer = h.get('referer') || h.get('referrer') || null;
    const url = h.get('x-url') || null;
    // If we have a referrer that includes UTM params, extract them
    const refUrl = url || referrer;
    if (refUrl) {
      try {
        const u = new URL(refUrl);
        const source = u.searchParams.get('utm_source');
        const medium = u.searchParams.get('utm_medium');
        const campaign = u.searchParams.get('utm_campaign');
        if (source || medium || campaign) {
          utm = { source: source || undefined, medium: medium || undefined, campaign: campaign || undefined };
        }
      } catch {
        // not a valid URL — skip
      }
    }
  } catch {
    // headers() may not be available in all contexts (e.g. middleware)
  }

  return { referrer, utm };
}

/**
 * Convenience: track a page view from a server component.
 * Reads pathname + referrer + UTMs from the current request.
 */
export async function trackPageView(args: {
  name?: string; // default 'page_view'
  userId?: string | null;
  pathname: string;
  props?: Record<string, unknown>;
}): Promise<void> {
  const { referrer, utm } = await extractRequestContext(args.pathname);
  await trackEvent({
    name: args.name ?? 'page_view',
    userId: args.userId ?? null,
    pathname: args.pathname,
    referrer,
    utm,
    props: args.props,
  });
}
