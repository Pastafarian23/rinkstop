/**
 * src/app/api/admin/funnel-breakdown/route.ts
 *
 * GET /api/admin/funnel-breakdown?days=30&by=listing|country|source|landing
 *
 * Admin-only. Returns funnel events grouped by dimension. Used by
 * /admin/funnel to answer Arnel's Phase 11 question:
 *   "Where are users dropping out?" — broken down by:
 *     - listing (rink/team/player/league slug from pathname)
 *     - country (from props.country on landing_viewed events)
 *     - source (from utm_source)
 *     - landing (landing page = pathname)
 *
 * Auth: Clerk session + admin role via getAdminFromRequest.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_DAYS = new Set([7, 30, 90]);
const EARLIEST_EVENT = '2026-06-16T00:00:00Z';

const VALID_BY = new Set(['listing', 'country', 'source', 'landing']);

interface AnalyticsRow {
  name: string;
  pathname: string | null;
  props: Record<string, unknown> | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

function listingKeyFromPath(pathname: string | null): string {
  if (!pathname) return 'unknown';
  // Match /directory/rinks/[slug], /directory/teams/[slug], /directory/players/[id], /directory/leagues/[slug]
  const m =
    pathname.match(/^\/directory\/(?:rinks|teams|players|leagues)\/([^/?#]+)/) ||
    pathname.match(/^\/directory\/([^/?#]+)\/([^/?#]+)/);
  if (!m) {
    // Top-level surfaces
    if (/^\/(pricing|claim-your-lounge|launch|tools)/.test(pathname)) return pathname;
    return 'other';
  }
  return pathname.replace(/^\//, '').slice(0, 120);
}

function groupKey(by: string, row: AnalyticsRow): string {
  switch (by) {
    case 'listing':
      return listingKeyFromPath(row.pathname);
    case 'country': {
      const c = (row.props && typeof row.props === 'object' && 'country' in row.props
        ? (row.props as Record<string, unknown>).country
        : null) as string | null;
      return (c || 'unknown').toString().slice(0, 80);
    }
    case 'source':
      return (row.utm_source || 'direct').toString().slice(0, 80);
    case 'landing':
      return (row.pathname || 'unknown').toString().slice(0, 200);
    default:
      return 'unknown';
  }
}

export async function GET(req: NextRequest) {
  const authz = await getAdminFromRequest();
  if ('response' in authz) return authz.response as NextResponse;

  const url = new URL(req.url);
  const daysParam = parseInt(url.searchParams.get('days') ?? '30', 10);
  const days = VALID_DAYS.has(daysParam) ? daysParam : 30;
  const by = url.searchParams.get('by') ?? 'landing';
  if (!VALID_BY.has(by)) {
    return NextResponse.json({ ok: false, msg: 'invalid by' }, { status: 400 });
  }
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 500);

  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const earliest = new Date(EARLIEST_EVENT);
  const since = windowStart < earliest ? earliest : windowStart;

  // Fetch a single bounded set of columns for the window. We only need
  // rows that have the dimension column populated, but PostgREST doesn't
  // let us conditionally select — we pull everything in the window and
  // group in app code.
  //
  // Cap with hard limit=20000 rows to avoid OOM on long windows. If we
  // need full fidelity, paginate by ts asc.
  const { data, error } = await supabaseAdmin
    .from('analytics_events')
    .select('name, pathname, props, utm_source, utm_medium, utm_campaign')
    .gte('ts', since.toISOString())
    .order('ts', { ascending: false })
    .limit(20000);

  if (error) {
    return NextResponse.json({ ok: false, msg: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as AnalyticsRow[];

  // group -> { key, events: { [event_name]: count } }
  const groups = new Map<string, { key: string; events: Record<string, number>; total: number }>();

  for (const row of rows) {
    const key = groupKey(by, row);
    let g = groups.get(key);
    if (!g) {
      g = { key, events: {}, total: 0 };
      groups.set(key, g);
    }
    g.events[row.name] = (g.events[row.name] ?? 0) + 1;
    g.total += 1;
  }

  const all = [...groups.values()];
  all.sort((a, b) => b.total - a.total);
  const top = all.slice(0, limit);

  return NextResponse.json({
    ok: true,
    by,
    days,
    since: since.toISOString(),
    total_groups: all.length,
    truncated: all.length > top.length,
    groups: top,
    total_rows_scanned: rows.length,
  });
}