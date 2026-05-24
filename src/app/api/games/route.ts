import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId');
  const teamId = searchParams.get('teamId');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  // Try highlightly_matches first, fall back to fixtures
  let query = supabase.from('highlightly_matches').select('*');
  if (leagueId) query = query.eq('league_id', leagueId);
  if (teamId) query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
  if (status) query = query.eq('status', status);
  let { data, error } = await query.order('date', { ascending: false }).limit(limit);
  
  if (error) {
    // Fall back to fixtures table
    let fq = supabase.from('fixtures').select('*, home_team:teams(name), away_team:teams(name), venue:rinks(name), league:leagues(name)');
    if (leagueId) fq = fq.eq('league_id', leagueId);
    if (teamId) fq = fq.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
    if (status) fq = fq.eq('status', status);
    const result = await fq.order('scheduled_at', { ascending: false }).limit(limit);
    data = result.data;
    error = result.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const response = NextResponse.json(data || [], { status: 200 });
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return response;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { data, error } = await supabase.from('highlightly_matches').insert(body).select('*').single();
  if (error) {
    const fallback = await supabase.from('fixtures').insert(body).select('*').single();
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
    return NextResponse.json(fallback.data, { status: 201 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { id, ...rest } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { data, error } = await supabase.from('highlightly_matches').update(rest).eq('id', id).select('*').single();
  if (error) {
    const fallback = await supabase.from('fixtures').update(rest).eq('id', id).select('*').single();
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
    return NextResponse.json(fallback.data);
  }
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { error } = await supabase.from('highlightly_matches').delete().eq('id', id);
  if (error) {
    const fallback = await supabase.from('fixtures').delete().eq('id', id);
    if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: true });
}
