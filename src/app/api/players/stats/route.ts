import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const leagueId = searchParams.get('leagueId');

  if (!playerId) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
  }

  // Test connection first
  const { data: testData, error: testError } = await supabaseAdmin
    .from('players')
    .select('id')
    .limit(1);

  if (testError) {
    return NextResponse.json({ 
      error: 'Supabase connection failed', 
      details: testError.message,
      hint: 'Check Supabase credentials in lib/supabase.ts'
    }, { status: 500 });
  }

  // Step 1: Look up highlightly_id from players table
  const { data: playerData, error: playerError } = await supabaseAdmin
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
  const playerName = `${playerData[0].first_name} ${playerData[0].last_name}`;

  if (!highlightlyId) {
    return NextResponse.json({ stats: [], message: 'No highlightly link', playerName });
  }

  // Step 2: Fetch career stats
  let query = supabaseAdmin
    .from('highlightly_career_stats')
    .select('*')
    .eq('player_id', highlightlyId)
    .order('season', { ascending: false });

  if (leagueId) {
    query = query.eq('league_id', leagueId);
  }

  const { data: stats, error: statsError } = await query;

  if (statsError) {
    return NextResponse.json({ 
      error: 'Stats fetch failed', 
      details: statsError.message,
      playerName,
      highlightlyId
    }, { status: 500 });
  }

  return NextResponse.json({ 
    stats: stats || [], 
    highlightly_id: highlightlyId,
    playerName
  });
}