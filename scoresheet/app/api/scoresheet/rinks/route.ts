/**
 * GET /api/scoresheet/rinks?q=<query>
 *
 * Rink autocomplete for the game details form. Searches rinkstop
 * `rinks` (name + city) and returns matches as
 *   { id: string; name: string; city: string | null; country: string | null }
 *
 * Sorted by name. Service-role auth (public data).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }
  const sb = getServerSupabase();
  if (!sb) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  const { data, error } = await sb
    .from('rinks')
    .select('id, name, city, country, province_state')
    .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(15);

  if (error) {
    console.error('[rinks-search]', error);
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 });
  }

  const results = (data || []).map((r) => ({
    id: r.id,
    name: r.name,
    city: r.city,
    country: r.country,
    province_state: r.province_state,
  }));
  return NextResponse.json({ results });
}
