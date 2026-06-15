import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/search/players?q=<query>&limit=<n>
 * Search players by first/last name. Returns up to `limit` results.
 */
export async function GET(req: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50);

  // Search across first_name + last_name with a single OR filter.
  // Supabase PostgREST or() supports .or('first_name.ilike.%q%,last_name.ilike.%q%')
  let query = supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, slug, position')
    .order('last_name', { ascending: true })
    .limit(limit);

  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&');
    query = query.or(`first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ players: data || [] });
}
