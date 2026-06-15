import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/search/teams?q=<query>&limit=<n>
 * Search teams by name. Returns up to `limit` results (default 20, max 50).
 * Used by the article reviewer's cross-link override dropdown.
 */
export async function GET(req: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50);

  let query = supabaseAdmin
    .from('teams')
    .select('id, name, slug, city, country')
    .order('name', { ascending: true })
    .limit(limit);

  if (q) {
    // ilike on name — case-insensitive substring
    query = query.ilike('name', `%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ teams: data || [] });
}
