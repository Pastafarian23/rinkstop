import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/rinks
 * List all rinks, paginated, with optional search + state filter.
 */
export async function GET(req: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50', 10), 200);
  const search = searchParams.get('search')?.trim() || '';
  const state = searchParams.get('state') || '';

  let query = supabaseAdmin
    .from('rinks')
    .select('id, name, city, state, country, slug, latitude, longitude, created_at, updated_at', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`);
  }
  if (state) {
    query = query.eq('state', state);
  }

  query = query.order('name', { ascending: true });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Distinct states for the filter dropdown
  const { data: stateRows } = await supabaseAdmin
    .from('rinks')
    .select('state')
    .not('state', 'is', null)
    .neq('state', '');
  const stateSet = new Set<string>((stateRows || []).map((r: any) => r.state).filter(Boolean));
  const states = Array.from(stateSet).sort();

  return NextResponse.json({
    rinks: data || [],
    pagination: { page, pageSize, total: count || 0 },
    states,
  });
}
