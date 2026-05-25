// GET /api/players/stats?playerId=X
// Fetches cached career stats for a player from Supabase

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const leagueId = searchParams.get('leagueId');

  if (!playerId) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
  }

  // Step 1: Look up highlightly_id from players table
  const { data: playerData, error: playerError } = await supabase
    .from('players')
    .select('highlightly_id, first_name, last_name')
    .eq('id', playerId)
    .limit(1);

  if (playerError) {
    return NextResponse.json({ error: 'Player lookup failed', details: playerError.message }, { status: 500 });
  }

  if (!playerData || playerData.length === 0) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  const highlightlyId = playerData[0].highlightly_id;

  if (!highlightlyId) {
    return NextResponse.json({ stats: [], message: 'No highlightly link' });
  }

  // Step 2: Fetch career stats
  let query = supabase
    .from('highlightly_career_stats')
    .select('season,season_type,games_played,goals,assists,points,penalty_minutes,plus_minus,wins,losses,save_percentage,goals_against_average,shutouts')
    .eq('player_id', highlightlyId)
    .order('season', { ascending: false });

  if (leagueId) {
    query = query.eq('league_id', leagueId);
  }

  const { data: stats, error: statsError } = await query;

  if (statsError) {
    return NextResponse.json({ error: 'Stats fetch failed', details: statsError.message }, { status: 500 });
  }

  return NextResponse.json({ stats: stats || [], highlightly_id: highlightlyId });
}