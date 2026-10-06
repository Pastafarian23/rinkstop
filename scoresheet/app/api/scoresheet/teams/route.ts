/**
 * GET /api/scoresheet/teams?q=<query>
 *
 * Team autocomplete. Searches rinkstop `team_workspaces` (name +
 * short_name + city) so the scorekeeper can link a scoresheet team
 * to a real rinkstop team. Linking is what enables Submit-to-RinkStop
 * to find a matching fixture.
 *
 * Returns active teams only.
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
    .from('team_workspaces')
    .select('id, name, short_name, home_city, home_country, age_label, level')
    .or(`name.ilike.%${q}%,short_name.ilike.%${q}%,home_city.ilike.%${q}%`)
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(15);

  if (error) {
    console.error('[teams-search]', error);
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 });
  }

  const results = (data || []).map((t) => ({
    id: t.id,
    name: t.name,
    short_name: t.short_name,
    home_city: t.home_city,
    home_country: t.home_country,
    age_label: t.age_label,
    level: t.level,
  }));
  return NextResponse.json({ results });
}
