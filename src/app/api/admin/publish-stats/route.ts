// /api/admin/publish-stats
//
// Returns publish-flow counts for the past 24h / 7d / 30d so Arnel
// can track article throughput at a glance. Authenticated via
// x-admin-key header matching process.env.ADMIN_API_KEY.
//
// Buckets:
//   published       status='published' AND published_at in window
//   drafts_total    status='draft' AND created_at in window
//   unverifiable    status='draft' AND audit_status='CANNOT_VERIFY'
//                    (game results were never validated against canonical source)
//   failed_audit    status='draft' AND audit_status IN ('FAIL', 'FAIL_DISAGREE', 'FAIL_CONFIDENCE')
//                    (claim contradicted canonical source)
//   flagged_for_review status='draft' AND content ILIKE '%editorial review%'
//                    (held for human review per audit note)
//
// Plus league breakdown: per-league published counts for window.
//
// Per Arnel 2026-09-22 00:48 CDT (Open Protocol Gap 5, priority 3):
// 'publish-rate metric (/api/admin/publish-stats + daily Telegram line)'.
//
// Run modes:
//   GET /api/admin/publish-stats                          — last 24h (default), JSON
//   GET /api/admin/publish-stats?window=7d                — JSON
//   GET /api/admin/publish-stats?window=24h&format=text   — single line for Telegram
//
// Authentication:
//   x-admin-key: ${ADMIN_API_KEY}   — header
//   ?key=${ADMIN_API_KEY}           — query (less secure, for Telegram bots)
//
// Audit 2026-09-22 07:01 CDT — fixes:
//   1. `.contains('audit_status', [...])` → `.eq/.in('audit_status', ...)` because
//      audit_status is a string column, not an array. .contains is for arrays.
//   2. `.contains('audit_status', ['FAIL'])` only matched exact 'FAIL' — now
//      .in includes 'FAIL', 'FAIL_DISAGREE', 'FAIL_CONFIDENCE'.
//   3. `.or('ilike(content,%flagged%),ilike(content,%editorial review%)')`
//      chained after `.ilike('content', '%human review%')` had broken
//      PostgREST syntax. Replaced with a single top-level .or() referencing
//      content for the flag/review keywords.
//   4. text format always showed 'published_7d' regardless of window — now
//      shows the metric for the actual window (24h/7d/30d).
//   5. Awkward `Object.fromEntries(applyRateLimitHeaders(new NextResponse(), ...))`
//      pattern replaced with a clean helper that applies headers directly.
//   6. Local const `auth` shadowed the Clerk `auth` import. Renamed.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth as clerkAuth } from '@clerk/nextjs/server';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { OWNER_EMAILS } from '@/lib/admin-auth';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };
const ADMIN_KEY = process.env.ADMIN_API_KEY;

// Dual auth: Clerk session (for browsers) OR API key (for Telegram bot /
// cron / curl). The API key path lets machine-to-machine callers use this
// without a Clerk session — important for the daily Telegram summary.
async function authOk(request: NextRequest): Promise<{ ok: true; who: string } | { ok: false }> {
  if (ADMIN_KEY) {
    const headerKey = request.headers.get('x-admin-key');
    if (headerKey && headerKey === ADMIN_KEY) return { ok: true, who: 'api-key' };
    const url = new URL(request.url);
    const queryKey = url.searchParams.get('key');
    if (queryKey && queryKey === ADMIN_KEY) return { ok: true, who: 'api-key' };
  }
  const session = await clerkAuth();
  if (session.userId) {
    const userEmail = session.sessionClaims?.email as string | undefined;
    if (userEmail && OWNER_EMAILS.has(userEmail)) {
      return { ok: true, who: `clerk:${userEmail}` };
    }
  }
  return { ok: false };
}

interface BucketCounts {
  published: number;
  drafts_total: number;
  unverifiable: number;
  failed_audit: number;
  flagged_for_review: number;
}

async function getBucketCounts(supabase: any, sinceIso: string): Promise<BucketCounts> {
  const { count: draftsTotal } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'draft')
    .gte('created_at', sinceIso);

  const { count: published } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', sinceIso);

  // 2026-09-22 audit fix: audit_status is a string column, not an array.
  // .contains() is for arrays; use .eq() for scalar values.
  const { count: unverifiable } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'draft')
    .eq('audit_status', 'CANNOT_VERIFY')
    .gte('created_at', sinceIso);

  // 2026-09-22 audit fix: use .in() so FAIL, FAIL_DISAGREE, FAIL_CONFIDENCE all match.
  const { count: failedAudit } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'draft')
    .in('audit_status', ['FAIL', 'FAIL_DISAGREE', 'FAIL_CONFIDENCE'])
    .gte('created_at', sinceIso);

  // 2026-09-22 audit fix: original `.or('ilike(content,%flagged%),...')`
  // was chained after `.ilike('content', '%human review%')` — PostgREST
  // rejects that nesting. Use a single top-level .or() referencing content
  // for the flag/review keywords, then chain the draft + window filters.
  const { count: flaggedForReview } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'draft')
    .or('content.ilike.%editorial review%,content.ilike.%flagged for human review%')
    .gte('created_at', sinceIso);

  return {
    published: published || 0,
    drafts_total: draftsTotal || 0,
    unverifiable: unverifiable || 0,
    failed_audit: failedAudit || 0,
    flagged_for_review: flaggedForReview || 0,
  };
}

interface LeagueBreakdown {
  league_id: string;
  league_name: string;
  published_24h: number;
  published_7d: number;
  published_30d: number;
}

async function getLeagueBreakdown(supabase: any): Promise<LeagueBreakdown[]> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

  const { data: rows } = await supabase
    .from('posts')
    .select('league_id, published_at, leagues:leagues!posts_league_id_fkey(name)')
    .eq('status', 'published')
    .gte('published_at', monthAgo);
  if (!rows || rows.length === 0) return [];

  const byLeague = new Map<string, { name: string; day: number; week: number; month: number }>();
  for (const r of rows) {
    const lid = r.league_id;
    if (!lid) continue;
    const leagueName = (r.leagues as any)?.name || lid;
    let entry = byLeague.get(lid);
    if (!entry) {
      entry = { name: leagueName, day: 0, week: 0, month: 0 };
      byLeague.set(lid, entry);
    }
    if (r.published_at >= dayAgo) entry.day++;
    if (r.published_at >= weekAgo) entry.week++;
    entry.month++;
  }
  return Array.from(byLeague.entries())
    .map(([league_id, v]) => ({
      league_id,
      league_name: v.name,
      published_24h: v.day,
      published_7d: v.week,
      published_30d: v.month,
    }))
    .sort((a, b) => b.published_7d - a.published_7d);
}

function windowToWindowMs(windowParam: string): number {
  const windows: Record<string, number> = {
    '24h': 24 * 3600 * 1000,
    '7d': 7 * 86400 * 1000,
    '30d': 30 * 86400 * 1000,
  };
  return windows[windowParam] || windows['24h'];
}

function publishedForWindow(league: LeagueBreakdown, windowParam: string): number {
  if (windowParam === '24h') return league.published_24h;
  if (windowParam === '7d') return league.published_7d;
  if (windowParam === '30d') return league.published_30d;
  return league.published_7d;
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`admin-publish-stats:${ip}`, RATE_LIMIT);
  maybeCleanup();

  const authResult = await authOk(request);
  if (!authResult.ok) {
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return applyRateLimitHeaders(response, result);
  }

  const url = new URL(request.url);
  const windowParam = (url.searchParams.get('window') || '24h').toLowerCase();
  const format = (url.searchParams.get('format') || 'json').toLowerCase();

  const windowMs = windowToWindowMs(windowParam);
  const now = new Date();
  const sinceIso = new Date(now.getTime() - windowMs).toISOString();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const counts = await getBucketCounts(supabase, sinceIso);
  const leagueBreakdown = await getLeagueBreakdown(supabase);

  if (format === 'text') {
    // 2026-09-22 audit fix: use the metric for the actual window, not always 7d.
    const topLeague = leagueBreakdown[0];
    const topLeagueCount = topLeague ? publishedForWindow(topLeague, windowParam) : 0;
    const actionableBacklog = counts.drafts_total - counts.unverifiable - counts.failed_audit - counts.flagged_for_review;
    const line =
      `📊 Publish stats (${windowParam}): ` +
      `${counts.published} published · ${counts.drafts_total} drafts · ${counts.unverifiable} unverifiable · ${counts.failed_audit} failed audit · ${actionableBacklog} actionable backlog. ` +
      `Top league: ${topLeague?.league_name || '—'} (${topLeagueCount}/${windowParam})`;
    const response = new NextResponse(line, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
    applyRateLimitHeaders(response, result);
    return response;
  }

  const response = NextResponse.json({
    window: windowParam,
    since: sinceIso,
    counts,
    league_breakdown: leagueBreakdown,
    generated_at: now.toISOString(),
  });
  applyRateLimitHeaders(response, result);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
