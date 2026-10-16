import { NextResponse } from 'next/server';

export async function GET() {
  const { supabaseAdmin: sb } = await import('@/lib/supabase');
  
  // NHL team IDs from fixtures
  const nhlTeamIds = [
    'cf05f5b0-6605-465f-86f3-a6f1710afc20',
    'e4977c12-28b3-4756-a788-cf86b40fc237',
    '4b75202e-b11b-4574-8ae6-7447f962cb55',
  ];
  
  const { data: tw, error: twErr } = await sb
    .from('team_workspaces')
    .select('id,name,slug')
    .in('id', nhlTeamIds);

  return NextResponse.json({
    nhlTeamIds,
    team_workspaces: { data: tw, error: twErr, count: tw?.length },
    timestamp: new Date().toISOString(),
  });
}
