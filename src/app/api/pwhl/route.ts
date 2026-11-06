import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  // Fetch PWHL league
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('*')
    .eq('slug', 'pwhl')
    .single();

  if (leagueError || !league) {
    return NextResponse.json({ error: 'PWHL league not found' }, { status: 404 });
  }

  // Fetch all PWHL teams
  // Explicit column list, not select('*') — the contact-details hardening
  // revoked table-level SELECT from anon on team_workspaces, so a star select
  // is now a permission error. See /api/teams for the full note.
  const { data: teams, error: teamsError } = await supabase
    .from('team_workspaces')
    .select(
      'id, name, slug, short_name, home_rink_id, home_city, home_country, ' +
        'country_code, age_category, age_label, level, description, visibility, ' +
        'is_active, created_at, updated_at, avatar_url, federation_id, league_id, ' +
        'website_url, division, home_state, leagues(name)',
    )
    .eq('league_id', league.id)
    .order('name', { ascending: true });

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 });
  }

  const r = NextResponse.json({ league, teams });
  r.headers.set('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=3600');
  return r;
}
