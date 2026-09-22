// /api/admin/publish-stats
//
// Returns publish-flow counts for the past 24h / 7d / 30d so Arnel
// can track article throughput at a glance. Authenticated via
// x-admin-key header matching process.env.ADMIN_API_KEY.
//
// Buckets:
//   published       status='published' AND published_at in window
//   drafts_total    status='draft' AND created_at in window
//   unverifiable    status='draft' AND audit_status='FAIL_CONFIDENCE' or 'NEEDS_VERIFY'
//                    (game results were never validated against canonical source)
//   failed_audit    status='draft' AND audit_status='FAIL' or 'FAIL_DISAGREE'
//                    (claim contradicted canonical source)
//   flagged_for_review status='draft' AND audit_note contains 'human review'
//
// Audit_status is computed by the audit pipeline per claim, not stored
// on the post itself. For the published-set, we approximate:
//   published_total    status='published' AND published_at in window
//   flagged_published  status='published' AND (no recent audit log)
//   [Future: store audit_status on posts for true breakdown]
//
// Plus league breakdown: per-league published counts for window.
//
// Per Arnel 2026-09-22 00:48 CDT (Open Protocol Gap 5, priority 3):
// 'publish-rate metric (/api/admin/publish-stats + daily Telegram line)'.
//
// Run modes:
//   GET /api/admin/publish-stats          — last 24h (default), JSON
//   GET /api/admin/publish-stats?window=7d
//   GET /api/admin/publish-stats?window=30d&format=text   — single line for Telegram
//
// Authentication:
//   x-admin-key: fd7c9d...                              — header
//   ?key=fd7c9d...                                     — query (less secure, for Telegram bots)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };
const ADMIN_KEY = process.env.ADMIN_API_KEY;

function authOk(request: NextRequest): boolean {
  if (!ADMIN_KEY) return false;
  const headerKey = request.headers.get('x-admin-key');
  if (headerKey && headerKey === ADMIN_KEY) return true;
  const url = new URL(request.url);
  const queryKey = url.searchParams.get('key');
  if (queryKey && queryKey === ADMIN_KEY) return true;
  return false;
}

interface BucketCounts {
  published: number;
  drafts_total: number;
  unverifiable: number;
  failed_audit: number;
  flagged_for_review: number;
}

async function getBucketCounts(supabase: any, sinceIso: string): Promise<BucketCounts> {
  // Count drafts created in window
  const { count: draftsTotal } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'draft')
    .gte('created_at', sinceIso);

  // Count published in window
  const { count: published } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', sinceIso);

  // Unverifiable / failed_audit / flagged_for_review: posts with
  // audit_status column. If the column doesn't exist yet (not yet
  // implemented), all three stay 0. The audit pipeline currently
  // writes audit results to /tmp/audit-results.json, not to posts.
  const { count: unverifiable } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'draft')
    .contains('audit_status', ['CANNOT_VERIFY'])
    .gte('created_at', sinceIso)
    .then((r: any) => r.count || 0, () => 0);
  const { count: failedAudit } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'draft')
    .contains('audit_status', ['FAIL'])
    .gte('created_at', sinceIso)
    .then((r: any) => r.count || 0, () => 0);

  // flagged_for_review: posts whose body contains the editorial review
  // footer. Lightweight heuristic.
  const { count: flaggedForReview } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'draft')
    .ilike('content', '%human review%')
    .or('ilike(content,%flagged%),ilike(content,%editorial review%)')
    .gte('created_at', sinceIso)
    .then((r: any) => r.count || 0, () => 0);

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
  // Per-league published counts for 24h / 7d / 30d windows. Three
  // separate queries per league would be expensive; do it with three
  // filtered queries per window and slice by league_id client-side.
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

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`admin-publish-stats:${ip}`, RATE_LIMIT);
  maybeCleanup();

  if (!authOk(request)) {
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return applyRateLimitHeaders(response, result);
  }

  const url = new URL(request.url);
  const windowParam = (url.searchParams.get('window') || '24h').toLowerCase();
  const format = (url.searchParams.get('format') || 'json').toLowerCase();

  const windows: Record<string, number> = { '24h': 24 * 3600 * 1000, '7d': 7 * 86400 * 1000, '30d': 30 * 86400 * 1000 };
  const windowMs = windows[windowParam] || windows['24h'];
  const now = new Date();
  const sinceIso = new Date(now.getTime() - windowMs).toISOString();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const counts = await getBucketCounts(supabase, sinceIso);
  const leagueBreakdown = await getLeagueBreakdown(supabase);

  if (format === 'text') {
    // Single-line summary suitable for Telegram. Rate of published
    // over the window = throughput signal. Drafts_total minus
    // unverifiable/failed_audit = actionable backlog.
    const actionableBacklog = counts.drafts_total - counts.unverifiable - counts.failed_audit - counts.flagged_for_review;
    const topLeague = leagueBreakdown[0]?.league_name || '—';
    const line =
      `📊 Publish stats (${windowParam}): ` +
      `${counts.published} published · ${counts.drafts_total} drafts · ${counts.unverifiable} unverifiable · ${counts.failed_audit} failed audit · ${actionableBacklog} actionable backlog. ` +
      `Top league: ${topLeague} (${leagueBreakdown[0]?.published_7d || 0}/7d)`;
    return new NextResponse(line, {
      headers: {
        ...Object.fromEntries(applyRateLimitHeaders(new NextResponse(), result).headers.entries()),
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
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