/**
 * src/app/api/admin/funnel/events/route.ts
 *
 * GET /api/admin/funnel/events?days=30&name=claim_search_viewed&limit=50
 *
 * Admin-only. Returns the recent raw events for a single event name in a
 * given window. Used by the funnel-page drill-down: clicking a step box
 * loads the most recent N events with their timestamp, user, pathname,
 * and props (so admins can see WHO triggered and WHAT context).
 *
 * Query params:
 *   days:  7 | 30 | 90 (default 30)
 *   name:  analytics event name (required). Allowlisted to the funnel event
 *          set + a few operational events so admins can spot ad-hoc events.
 *   limit: 1-200 (default 50)
 *
 * Response: { window_days, since, name, generated_at, events: [...] }
 *
 * Failure modes:
 *   - 401/403 from auth gate
 *   - 400 if name is missing or not in the allowlist
 *   - 200 with empty list if the event has no records in the window
 *
 * Performance: hits the (name, ts DESC) index; for 30 days at low volume
 * this is <100ms. At very high volume we'd add keyset pagination on ts
 * (left as a future iteration; 200-row cap is enough for triage).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_DAYS = new Set([7, 30, 90]);
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const EARLIEST_EVENT = '2026-06-16T00:00:00Z';

// Allowlist of event names admins can drill into. Mirrors the funnel event
// set (BUSINESS + PERSONAL) plus the high-signal operational events that
// could explain a drop. Adding new events here is a deliberate change.
const ALLOWED_EVENT_NAMES = new Set<string>([
  // Funnel events (business + personal)
  'claim_search_viewed',
  'claim_search_abandoned',
  'claim_button_clicked',
  'claim_started',
  'claim_submitted',
  'claim_approved',
  'checkout_started',
  'checkout_completed',
  'checkout_abandoned',
  'pricing_card_clicked',
  'pricing_viewed',
  'tool_viewed',
  'calculator_used',
  // Operational (helps diagnose)
  'identity_verify_started',
  'lead_form_submitted',
  'homepage_cta_clicked',
  'affiliate_clicked',
  'outbound_share_clicked',
  'founding_urgency_viewed',
]);

export async function GET(req: NextRequest) {
  const authz = await getAdminFromRequest();
  if ('response' in authz) return authz.response as NextResponse;

  const url = new URL(req.url);
  const name = url.searchParams.get('name') || '';
  if (!ALLOWED_EVENT_NAMES.has(name)) {
    return NextResponse.json(
      { error: 'name must be one of the allowlisted funnel events.', allowed: Array.from(ALLOWED_EVENT_NAMES).sort() },
      { status: 400 }
    );
  }

  const daysParam = parseInt(url.searchParams.get('days') ?? '30', 10);
  const days = VALID_DAYS.has(daysParam) ? daysParam : 30;

  const limitParam = parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
  const limit = Math.max(1, Math.min(MAX_LIMIT, Number.isFinite(limitParam) ? limitParam : DEFAULT_LIMIT));

  // Time window
  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const earliest = new Date(EARLIEST_EVENT);
  const since = windowStart < earliest ? earliest : windowStart;
  const sinceIso = since.toISOString();

  // Pull from Supabase. Order by ts DESC for "most recent first"; limit caps payload.
  let events: Array<{
    ts: string;
    user_id: string | null;
    pathname: string | null;
    referrer: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    props: Record<string, unknown> | null;
  }> = [];
  let degraded = false;
  let note: string | undefined;

  try {
    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .select('ts, user_id, pathname, referrer, utm_source, utm_medium, utm_campaign, props')
      .eq('name', name)
      .gte('ts', sinceIso)
      .order('ts', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[admin/funnel/events] supabase error:', error.message);
      degraded = true;
      note = `query failed: ${error.message}`;
    } else {
      events = (data ?? []) as any;
    }
  } catch (e: any) {
    console.error('[admin/funnel/events] unexpected error:', e?.message ?? e);
    degraded = true;
    note = `unexpected: ${e?.message ?? 'unknown'}`;
  }

  return NextResponse.json({
    window_days: days,
    since: sinceIso,
    name,
    generated_at: now.toISOString(),
    events,
    degraded,
    note,
  });
}
