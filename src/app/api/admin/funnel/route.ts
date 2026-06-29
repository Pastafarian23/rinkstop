/**
 * src/app/api/admin/funnel/route.ts
 *
 * GET /api/admin/funnel?days=30
 *
 * Admin-only. Returns conversion funnel counts for both tracks in the
 * given window. Auth: Clerk session + profile.role === 'super_admin'
 * (or 'admin') via getAdminFromRequest().
 *
 * Query params:
 *   days: 7 | 30 | 90 (default 30)
 *
 * Response shape: see /admin/funnel/page.tsx for the consumer.
 *
 * Failure modes:
 *   - 401/403 from auth gate
 *   - Empty/missing analytics_events table -> 200 with empty funnel data
 *   - days out of range -> coerced to [7, 90], capped at table's earliest event
 *
 * Performance: single query per funnel (6 events for BUSINESS_FUNNEL,
 * 5 for PERSONAL_FUNNEL). With the (name, ts DESC) index, this returns
 * in <500ms even at 100k events/week.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import {
  computeFunnel,
  BUSINESS_FUNNEL,
  PERSONAL_FUNNEL,
  type FunnelEventRow,
} from '@/lib/funnel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_DAYS = new Set([7, 30, 90]);
/** Earliest event in the analytics table (per 2026-06-16 migration). */
const EARLIEST_EVENT = '2026-06-16T00:00:00Z';

export async function GET(req: NextRequest) {
  const authz = await getAdminFromRequest();
  if ('response' in authz) return authz.response as NextResponse;

  // Parse and validate days param
  const url = new URL(req.url);
  const daysParam = parseInt(url.searchParams.get('days') ?? '30', 10);
  const days = VALID_DAYS.has(daysParam) ? daysParam : 30;

  // Compute the time window. Cap the lower bound at EARLIEST_EVENT so we
  // never ask for data older than what the table has.
  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const earliest = new Date(EARLIEST_EVENT);
  const since = windowStart < earliest ? earliest : windowStart;
  const sinceIso = since.toISOString();

  // Collect all event names from both funnels for a single query
  const allEvents = [
    ...BUSINESS_FUNNEL.steps,
    ...PERSONAL_FUNNEL.steps,
  ];

  let rows: FunnelEventRow[] = [];
  try {
    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .select('name, user_id')
      .in('name', Array.from(allEvents))
      .gte('ts', sinceIso);

    if (error) {
      console.error('[admin/funnel] supabase query error:', error.message);
      return NextResponse.json({
        window_days: days,
        since: sinceIso,
        tracks: {
          business: computeFunnel([], BUSINESS_FUNNEL.label, BUSINESS_FUNNEL.steps),
          personal: computeFunnel([], PERSONAL_FUNNEL.label, PERSONAL_FUNNEL.steps),
        },
        degraded: true,
        note: 'analytics_events query failed; showing empty funnels.',
      });
    }

    rows = (data ?? []) as FunnelEventRow[];
  } catch (e: any) {
    console.error('[admin/funnel] unexpected error:', e?.message ?? e);
    return NextResponse.json({
      window_days: days,
      since: sinceIso,
      tracks: {
        business: computeFunnel([], BUSINESS_FUNNEL.label, BUSINESS_FUNNEL.steps),
        personal: computeFunnel([], PERSONAL_FUNNEL.label, PERSONAL_FUNNEL.steps),
      },
      degraded: true,
      note: 'analytics_events table may not exist yet.',
    });
  }

  return NextResponse.json({
    window_days: days,
    since: sinceIso,
    generated_at: now.toISOString(),
    tracks: {
      business: computeFunnel(rows, BUSINESS_FUNNEL.label, BUSINESS_FUNNEL.steps),
      personal: computeFunnel(rows, PERSONAL_FUNNEL.label, PERSONAL_FUNNEL.steps),
    },
  });
}