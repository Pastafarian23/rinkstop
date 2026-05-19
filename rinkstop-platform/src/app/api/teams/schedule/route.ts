// API: /api/teams/schedule?teamId=UUID
// Returns upcoming + recent matches for a team
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!teamId) {
    return NextResponse.json({ error: 'teamId required' }, { status: 400 });
  }

  // Get team name
  const { data: team } = await supabase
    .from('teams')
    .select('id, name, slug')
    .eq('id', teamId)
    .single();

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  // Find matches where team name appears in home or away
  // highlightly_matches uses team names, not IDs
  const { data: homeMatches } = await supabase
    .from('highlightly_matches')
    .select('*')
    .eq('home_team_name', team.name)
    .gte('date', '2025-01-01')
    .order('date', { ascending: false })
    .limit(limit);

  const { data: awayMatches } = await supabase
    .from('highlightly_matches')
    .select('*')
    .eq('away_team_name', team.name)
    .gte('date', '2025-01-01')
    .order('date', { ascending: false })
    .limit(limit);

  // Merge and dedupe
  const all = [...(homeMatches || []), ...(awayMatches || [])];
  const unique = Array.from(new Map(all.map(m => m.id)).values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);

  const now = new Date();
  const upcoming = unique.filter(m => new Date(m.date) >= now && m.status !== 'Finished');
  const recent = unique.filter(m => m.status === 'Finished' || new Date(m.date) < now).slice(0, 5);

  return NextResponse.json({
    team: { id: team.id, name: team.name, slug: team.slug },
    upcoming,
    recent,
  });
}
