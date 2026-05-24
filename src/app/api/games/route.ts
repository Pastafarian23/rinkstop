import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/games — list matches from highlightly_matches table
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId');
  const teamId = searchParams.get('teamId');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let query = supabase
    .from('highlightly_matches')
    .select('*');

  if (leagueId) query = query.eq('league_id', leagueId);
  if (teamId) query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
  if (status) query = query.eq('status', status);
  
  const { data, error } = await query
    .order('date', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map id fields to expected frontend shape
  const games = (data || []).map(m => ({
    id: m.id,
    date: m.date,
    status: m.status,
    home_team_id: m.home_team_id,
    away_team_id: m.away_team_id,
    home_score: m.home_score,
    away_score: m.away_score,
    scheduled_at: m.date,
    home_team: null,
    away_team: null,
    league: m.league_id ? { name: '' } : null,
    venue_details: m.venue_details || null,
    period_scores: m.period_scores || null,
    referees: m.referees || null,
  }));

  const response = NextResponse.json(games, { status: 200 });
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return response;
}

// POST /api/games
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { data, error } = await supabase.from('highlightly_matches').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

// PUT /api/games
export async function PUT(request: NextRequest) {
  const { id, ...rest } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { data, error } = await supabase.from('highlightly_matches').update(rest).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// DELETE /api/games
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { error } = await supabase.from('highlightly_matches').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}