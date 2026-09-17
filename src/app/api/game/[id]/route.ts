import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const sb = getSupabase();
  const { data: f, error } = await sb
    .from('fixtures')
    .select(`
      id, scheduled_at, status, home_score, away_score, league_id,
      home_team_id, away_team_id, season, game_data,
      home_team:teams!fixtures_home_team_id_fkey(id, name, slug, logo_url, city, country),
      away_team:teams!fixtures_away_team_id_fkey(id, name, slug, logo_url, city, country),
      league:leagues!fixtures_league_id_fkey(id, name, slug, level, country)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!f) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: f.id,
    date: f.scheduled_at,
    status: f.status,
    scheduled_at: f.scheduled_at,
    home_score: f.home_score,
    away_score: f.away_score,
    home_team_id: f.home_team_id,
    away_team_id: f.away_team_id,
    home_team: f.home_team,
    away_team: f.away_team,
    league: f.league,
    season: f.season,
    game_data: f.game_data,
  });
}
