import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const VALID_TYPES = ['player', 'team', 'league'] as const;
type SearchType = (typeof VALID_TYPES)[number];

// Stricter than managed-profiles because this is name-based and exposes PII
// (positions, jersey numbers, etc). 60/min is plenty for a search-as-you-type UI.
const RL = { maxRequests: 60, windowMs: 60 * 1000 };

/**
 * GET /api/search/[type]?q=<query>&limit=<n>
 *
 * Signed-in-only. Used by the dashboard's LinkedRecordsManager as a
 * search-as-you-type picker when adding a player/team/league to the
 * user's managed_profiles list.
 *
 * Returns up to `limit` rows (default 10, max 25). Matches by name with
 * a case-insensitive `ilike`. Empty query returns the first page of the
 * table so the picker can show "popular" rows on first open.
 *
 * Response shape:
 *   { results: Array<{ id, name, ... }> }
 *
 * Note: this is separate from the admin search endpoints at
 * /api/admin/search/{players,teams,leagues} which require admin auth
 * and expose more fields. The dashboard picker only needs what the
 * LinkedRecordsManager needs to render a row.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`search:${ip}`, RL);
  maybeCleanup();

  const session = await auth();
  if (!session.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  const { type } = await params;
  if (!VALID_TYPES.includes(type as SearchType)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 25);

  if (type === 'player') {
    let query = supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position, jersey_number, headshot_url, team_id, teams(name)')
      .eq('is_active', true)
      .order('last_name', { ascending: true })
      .limit(limit);
    if (q) {
      const escaped = q.replace(/[%_]/g, '\\$&');
      query = query.or(`first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`);
    }
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const res = NextResponse.json({
      results: (data || []).map((p: any) => ({
        id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unnamed',
        meta: [p.position, p.jersey_number != null ? `#${p.jersey_number}` : null, p.teams?.name].filter(Boolean).join(' · ') || null,
        headshot_url: p.headshot_url || null,
      })),
    });
    return applyRateLimitHeaders(res, result);
  }

  if (type === 'team') {
    let query = supabaseAdmin
      .from('team_workspaces')
      .select('id, name, logo_url, leagues(name)')
      .order('name', { ascending: true })
      .limit(limit);
    if (q) {
      const escaped = q.replace(/[%_]/g, '\\$&');
      query = query.ilike('name', `%${escaped}%`);
    }
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const res = NextResponse.json({
      results: (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        meta: t.leagues?.name || null,
        logo_url: t.logo_url || null,
      })),
    });
    return applyRateLimitHeaders(res, result);
  }

  // league
  let query = supabaseAdmin
    .from('leagues')
    .select('id, name, logo_url')
    .order('name', { ascending: true })
    .limit(limit);
  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&');
    query = query.ilike('name', `%${escaped}%`);
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const res = NextResponse.json({
    results: (data || []).map((l: any): Record<string, any> => ({
      id: l.id,
      name: l.name,
      meta: null,
      logo_url: l.logo_url || null,
    })),
  });
  return applyRateLimitHeaders(res, result);
}