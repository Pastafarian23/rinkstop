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
  const { data: teams, error: teamsError } = await supabase
    .from('team_workspaces')
    .select('*, leagues(name)')
    .eq('league_id', league.id)
    .order('name', { ascending: true });

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 });
  }

  const r = NextResponse.json({ league, teams });
  r.headers.set('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=3600');
  return r;
}
