import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/search/leagues?q=<query>&limit=<n>
 * Search leagues by name. Returns up to `limit` results (default 20, max 50).
 */
export async function GET(req: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50);

  let query = supabaseAdmin
    .from('leagues')
    .select('id, name, slug, country, level')
    .order('name', { ascending: true })
    .limit(limit);

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leagues: data || [] });
}
