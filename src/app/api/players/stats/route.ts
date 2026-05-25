// GET /api/players/stats?playerId=X
// Fetches cached career stats for a player from Supabase
// Requires UUID lookup first to get highlightly_id

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yszheonqyyskkjoxoexk.supabase.co';
const supabaseKey = '***REMOVED***';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const leagueId = searchParams.get('leagueId');

  if (!playerId) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase env vars not set. URL:', !!supabaseUrl, 'Key:', !!supabaseKey);
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Step 1: Look up the player's highlightly_id from the players table
  const { data: playerData, error: playerError } = await supabase
    .from('players')
    .select('id, highlightly_id, first_name, last_name')
    .eq('id', playerId)
    .limit(1);

  if (playerError || !playerData || playerData.length === 0) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  const player = playerData[0];
  const highlightlyId = player.highlightly_id;

  if (!highlightlyId) {
    return NextResponse.json({ stats: [], message: 'Player not linked to highlightly' });
  }

  // Step 2: Fetch career stats using the highlightly numeric ID
  let query = supabase
    .from('highlightly_career_stats')
    .select('*')
    .eq('player_id', highlightlyId)
    .order('season', { ascending: false });

  if (leagueId) {
    query = query.eq('league_id', leagueId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ stats: data || [], highlightly_id: highlightlyId });
}