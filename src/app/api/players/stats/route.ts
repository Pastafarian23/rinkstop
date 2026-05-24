// GET /api/players/stats?playerId=X&leagueId=Y
// Fetches cached career stats for a player from Supabase

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const leagueId = searchParams.get('leagueId');

  if (!playerId) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  let query = supabase
    .from('highlightly_career_stats')
    .select('*')
    .eq('player_id', playerId)
    .order('season', { ascending: false });

  if (leagueId) {
    query = query.eq('league_id', leagueId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ stats: data || [] });
}