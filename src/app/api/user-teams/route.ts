import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/user-teams — all user-created teams (team_workspaces with source = 'user')
// Returns the fields needed by the directory listing card.
// No auth required — team_workspaces data is public-profile fields only.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const country = searchParams.get('country');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

  let q = supabaseAdmin
    .from('team_workspaces')
    .select(
      'id, slug, name, country_code, home_city, home_country, age_category, age_label, level, season_label, description, parent_org, organization_id, league_id, federation_id'
    )
    .eq('is_active', true)
    .limit(limit);

  if (country) {
    q = q.or(`country_code.ilike.%${country}%,home_country.ilike.%${country}%`);
  }

  if (search) {
    q = q.or(
      `name.ilike.%${search}%,home_city.ilike.%${search}%,parent_org.ilike.%${search}%`
    );
  }

  q = q.order('created_at', { ascending: false });

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const teams = (data || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    city: t.home_city || null,
    country: t.home_country || null,
    country_code: t.country_code || null,
    source: 'user' as const,
    // directory card fields
    league_or_org: t.parent_org || null,
    level: t.level || null,
    age_label: t.age_label || null,
    age_category: t.age_category || null,
    description: t.description || null,
    season_label: t.season_label || null,
    claimed_by_tier: null, // enriched separately below if needed
  }));

  return NextResponse.json({ data: teams, count: teams.length });
}
