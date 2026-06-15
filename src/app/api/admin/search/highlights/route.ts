import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/search/highlights?q=<query>&team=<id>&limit=<n>
 * Search highlight_backups by title. Optional team filter scopes to a
 * single team (home or away). Returns up to `limit` results.
 *
 * Used by the article reviewer's highlight-override dropdown to swap
 * a misattributed highlight for the correct one.
 */
export async function GET(req: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const teamId = url.searchParams.get('team');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50);

  let query = supabaseAdmin
    .from('highlight_backups')
    .select('id, title, home_team_name, away_team_name, match_date, league_name')
    .order('match_date', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (q) {
    query = query.ilike('title', `%${q}%`);
  }

  if (teamId) {
    // Supabase bigint team_id needs casting — PostgREST infers from column type
    const teamIdNum = parseInt(teamId, 10);
    if (!isNaN(teamIdNum)) {
      query = query.or(`home_team_id.eq.${teamIdNum},away_team_id.eq.${teamIdNum}`);
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ highlights: data || [] });
}
