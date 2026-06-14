import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/articles
 *
 * Admin-only list of articles with status filter, pagination, and search.
 * Powers the /admin/blog queue UI.
 *
 * Query params:
 *   - status: 'all' | 'published' | 'draft' | 'archived' (default 'all')
 *   - page: 1-based, default 1
 *   - pageSize: 1-100, default 25
 *   - search: title/subtitle ILIKE %search%
 *   - crossLink: 'team' | 'league' | 'player' | 'country' — only posts that have that link
 *   - sort: 'created_at' | 'published_at' | 'view_count' | 'title' (default 'created_at')
 *   - order: 'asc' | 'desc' (default 'desc')
 *
 * Returns: { posts: Post[], pagination: { page, pageSize, total, totalPages } }
 */
export async function GET(req: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  const sp = new URL(req.url).searchParams;
  const status = sp.get('status') || 'all';
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') || '25', 10)));
  const search = (sp.get('search') || '').trim();
  const crossLink = sp.get('crossLink') || '';
  const sort = sp.get('sort') || 'created_at';
  const order = sp.get('order') === 'asc';

  // Validate inputs to prevent injection or bad queries
  const ALLOWED_SORTS = ['created_at', 'published_at', 'view_count', 'title'];
  const ALLOWED_STATUSES = ['all', 'published', 'draft', 'archived'];
  const safeSort = ALLOWED_SORTS.includes(sort) ? sort : 'created_at';
  const safeStatus = ALLOWED_STATUSES.includes(status) ? status : 'all';

  // Build base select. Join teams + leagues + players + countries so the
  // admin can see cross-link context (e.g. "Team A vs Team B", "NHL", "Connor McDavid").
  let query = supabaseAdmin
    .from('posts')
    .select(
      `id, slug, title, subtitle, status, category, tags, view_count,
       created_at, published_at, updated_at, is_featured, highlight_id,
       reading_time_minutes, seo_title, seo_description, author_name,
       team_home_id, team_away_id, league_id, player_id, country_slug,
       team_home:teams!posts_team_home_id_fkey(id, name, slug),
       team_away:teams!posts_team_away_id_fkey(id, name, slug),
       league:leagues!posts_league_id_fkey(id, name, slug),
       player:players!posts_player_id_fkey(id, first_name, last_name, slug)`,
      { count: 'exact' },
    );

  if (safeStatus !== 'all') {
    query = query.eq('status', safeStatus);
  }

  if (search) {
    // Escape % and _ so they're treated as literals, not LIKE wildcards
    const safe = search.replace(/[%_\\]/g, '\\$&');
    query = query.or(`title.ilike.%${safe}%,subtitle.ilike.%${safe}%`);
  }

  if (crossLink === 'team') {
    query = query.or('team_home_id.not.is.null,team_away_id.not.is.null');
  } else if (crossLink === 'league') {
    query = query.not('league_id', 'is', null);
  } else if (crossLink === 'player') {
    query = query.not('player_id', 'is', null);
  } else if (crossLink === 'country') {
    query = query.not('country_slug', 'is', null);
  }

  // Order + range
  const offset = (page - 1) * pageSize;
  query = query.order(safeSort, { ascending: order, nullsFirst: false }).range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    posts: data || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
    },
  });
}
