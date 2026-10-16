import { NextResponse } from 'next/server';

export async function GET() {
  const { supabaseAdmin: sb } = await import('@/lib/supabase');
  
  // NHL team IDs from fixtures
  const nhlTeamIds = [
    'cf05f5b0-6605-465f-86f3-a6f1710afc20',
    'e4977c12-28b3-4756-a788-cf86b40fc237',
    '4b75202e-b11b-4574-8ae6-7447f962cb55',
  ];
  
  // Check team_workspaces
  const { data: tw, error: twErr } = await sb
    .from('team_workspaces')
    .select('id,name,slug')
    .in('id', nhlTeamIds);

  // Check teams table
  const { data: t, error: tErr } = await sb
    .from('teams')
    .select('id,name')
    .in('id', nhlTeamIds);
    
  // Check fixtures to see what table the IDs come from
  const { data: fix, error: fixErr } = await sb
    .from('fixtures')
    .select('home_team_id,away_team_id')
    .eq('league_id', '2b5f2b9d-84b9-4edb-8373-a732b72f4e40')
    .eq('status', 'completed')
    .eq('season', '2026-27')
    .limit(3);

  return NextResponse.json({
    nhlTeamIds,
    team_workspaces: { data: tw, error: twErr, count: tw?.length },
    teams: { data: t, error: tErr, count: t?.length },
    fixtures_sample: fix,
    timestamp: new Date().toISOString(),
  });
}
