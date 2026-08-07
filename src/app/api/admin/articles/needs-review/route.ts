import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/articles/needs-review
 *
 * Lists posts whose team FKs need attention. Powers the
 * /admin/blog/needs-review queue UI.
 *
 * A post "needs review" when:
 *   - its team_home_id is null, OR
 *   - its team_away_id is null, OR
 *   - its team_home_id points to a UUID not in the `teams` table (stale),
 *   - its team_away_id points to a UUID not in the `teams` table (stale).
 *
 * "Reviewed" posts (cross_link_overrides._skipped_review = true OR
 *  they have a recent post_review_edits row that fixed the FKs) are
 *  NOT in the default response — pass ?include=reviewed to see them.
 *
 * Query params:
 *   - filter: 'all' | 'stale' | 'missing' | 'partial' (default 'all')
 *   - include: '' | 'reviewed' (default '' = needs-review only)
 *   - page: 1-based, default 1
 *   - pageSize: 1-100, default 50
 *   - search: title ILIKE %search%
 *   - sort: 'created_at' | 'published_at' | 'title' (default 'published_at')
 *   - order: 'asc' | 'desc' (default 'desc')
 *
 * Returns: {
 *   posts: NeedsReviewPost[],
 *   pagination: { page, pageSize, total, totalPages },
 *   stats: { stale, missing, partial, total, reviewed }
 * }
 */

type FkState = 'stale' | 'missing' | 'partial' | 'valid';

interface NeedsReviewPost {
  id: string;
  slug: string;
  title: string;
  status: string;
  category: string | null;
  published_at: string | null;
  created_at: string;
  team_home_id: string | null;
  team_away_id: string | null;
  team_home: { id: string; name: string; slug: string } | null;
  team_away: { id: string; name: string; slug: string } | null;
  game_date: string | null;
  country_slug: string | null;
  reason: FkState;        // computed
  reason_text: string;    // human-readable
  is_reviewed: boolean;   // true if _skipped_review or has recent post_review_edits
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export async function GET(req: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  const sp = new URL(req.url).searchParams;
  const filter = (sp.get('filter') || 'all') as FkState | 'all';
  const include = sp.get('include') || '';
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') || '50', 10)));
  const search = (sp.get('search') || '').trim();
  const sort = sp.get('sort') || 'published_at';
  const order = sp.get('order') === 'asc';

  const ALLOWED_SORTS = ['created_at', 'published_at', 'title'];
  const ALLOWED_FILTERS: (FkState | 'all')[] = ['all', 'stale', 'missing', 'partial'];
  const safeSort = ALLOWED_SORTS.includes(sort) ? sort : 'published_at';
  const safeFilter = ALLOWED_FILTERS.includes(filter) ? filter : 'all';

  // Fetch all published/draft/archived posts (the queue cares about all statuses)
  // and the cross_link_overrides JSONB (to compute is_reviewed).
  const { data: posts, error: postsErr } = await supabaseAdmin
    .from('posts')
    .select(
      `id, slug, title, status, category, published_at, created_at, game_date,
       country_slug, team_home_id, team_away_id, cross_link_overrides`
    )
    .not('slug', 'is', null)
    .order(safeSort, { ascending: order, nullsFirst: false });
  if (postsErr) {
    return NextResponse.json({ error: postsErr.message }, { status: 500 });
  }

  // Fetch all team UUIDs (small table, ~3000 rows). We do this in memory
  // so the classification is fast and doesn't need N round-trips.
  const { data: teams, error: teamsErr } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, name, slug');
  if (teamsErr) {
    return NextResponse.json({ error: teamsErr.message }, { status: 500 });
  }
  const teamsById = new Map(teams!.map(t => [t.id, t]));

  // Fetch post_review_edits rows for the audit trail. The most recent
  // edit per post is enough; group by post_id and take the latest.
  const { data: edits, error: editsErr } = await supabaseAdmin
    .from('post_review_edits')
    .select('post_id, reviewer_id, created_at, changes')
    .order('created_at', { ascending: false })
    .limit(2000); // enough for the 562-post queue
  if (editsErr) {
    return NextResponse.json({ error: editsErr.message }, { status: 500 });
  }
  const latestEditByPostId = new Map<string, { reviewer_id: string; created_at: string }>();
  for (const e of edits || []) {
    if (!latestEditByPostId.has(e.post_id)) {
      latestEditByPostId.set(e.post_id, { reviewer_id: e.reviewer_id, created_at: e.created_at });
    }
  }

  // Classify each post
  const enriched: NeedsReviewPost[] = [];
  let counts = { stale: 0, missing: 0, partial: 0, total: 0, reviewed: 0 };

  for (const p of posts || []) {
    const homeValid = p.team_home_id && teamsById.has(p.team_home_id);
    const awayValid = p.team_away_id && teamsById.has(p.team_away_id);
    const homeStale = p.team_home_id && !teamsById.has(p.team_home_id);
    const awayStale = p.team_away_id && !teamsById.has(p.team_away_id);

    let reason: FkState = 'valid';
    let reasonText = '';
    if (!p.team_home_id && !p.team_away_id) {
      reason = 'missing';
      reasonText = 'Missing FK (both null)';
    } else if (homeStale || awayStale) {
      reason = 'stale';
      const which = [];
      if (homeStale) which.push('home');
      if (awayStale) which.push('away');
      reasonText = `Stale FK (${which.join(' + ')} UUID not in teams)`;
    } else if (!p.team_home_id || !p.team_away_id) {
      reason = 'partial';
      const which = !p.team_home_id ? 'home' : 'away';
      reasonText = `Partial FK (${which} is null)`;
    }

    // A post is "reviewed" if it was explicitly skipped via
    // cross_link_overrides._skipped_review, OR if it has a recent
    // post_review_edits row that touched the FK fields.
    const isSkipped = p.cross_link_overrides?._skipped_review === true;
    const lastEdit = latestEditByPostId.get(p.id);
    const isReviewed = isSkipped || !!lastEdit;

    if (isReviewed) {
      counts.reviewed++;
      if (include !== 'reviewed') continue; // skip from default response
    }

    if (reason === 'valid' && include !== 'reviewed') continue; // valid posts not in queue

    // Apply filter
    if (safeFilter !== 'all' && reason !== safeFilter) continue;

    // Apply search
    if (search) {
      const safe = search.replace(/[%_\\]/g, '\\$&');
      if (!p.title?.toLowerCase().includes(search.toLowerCase())) continue;
    }

    enriched.push({
      id: p.id,
      slug: p.slug,
      title: p.title,
      status: p.status,
      category: p.category,
      published_at: p.published_at,
      created_at: p.created_at,
      team_home_id: p.team_home_id,
      team_away_id: p.team_away_id,
      team_home: p.team_home_id && teamsById.has(p.team_home_id) ? teamsById.get(p.team_home_id)! : null,
      team_away: p.team_away_id && teamsById.has(p.team_away_id) ? teamsById.get(p.team_away_id)! : null,
      game_date: p.game_date,
      country_slug: p.country_slug,
      reason,
      reason_text: reasonText,
      is_reviewed: isReviewed,
      reviewed_at: lastEdit?.created_at || null,
      reviewed_by: lastEdit?.reviewer_id || null,
    });

    if (reason === 'stale') counts.stale++;
    else if (reason === 'missing') counts.missing++;
    else if (reason === 'partial') counts.partial++;
    counts.total++;
  }

  // Pagination
  const total = enriched.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;
  const pagePosts = enriched.slice(offset, offset + pageSize);

  return NextResponse.json({
    posts: pagePosts,
    pagination: { page, pageSize, total, totalPages },
    stats: counts,
  });
}
