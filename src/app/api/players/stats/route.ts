import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yszheonqyyskkjoxoexk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_yLLbqXl_CFS174sL6TRqjg_nej93X4g';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const leagueId = searchParams.get('leagueId');

  const debug = {
    supabaseUrlConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKeyConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseUrl,
    supabaseAnonKey: supabaseAnonKey ? '[SET]' : '[NOT SET]',
    playerId,
    leagueId
  };

  if (!playerId) {
    return NextResponse.json({ error: 'playerId is required', debug }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Test connection first
  const { data: testData, error: testError } = await supabase
    .from('players')
    .select('id')
    .limit(1);

  if (testError) {
    return NextResponse.json({ error: 'Supabase connection failed', debug, testError: testError.message }, { status: 500 });
  }

  // Step 1: Look up highlightly_id from players table
  const { data: playerData, error: playerError } = await supabase
    .from('players')
    .select('highlightly_id, first_name, last_name')
    .eq('id', playerId)
    .limit(1);

  if (playerError) {
    return NextResponse.json({ error: 'Player lookup failed', debug, playerError: playerError.message }, { status: 500 });
  }

  if (!playerData || playerData.length === 0) {
    return NextResponse.json({ error: 'Player not found', debug }, { status: 404 });
  }

  const highlightlyId = playerData[0].highlightly_id;
  const playerName = `${playerData[0].first_name} ${playerData[0].last_name}`;

  if (!highlightlyId) {
    return NextResponse.json({ stats: [], message: 'No highlightly link', debug, playerName });
  }

  // Step 2: Fetch career stats
  let query = supabase
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
      debug: { ...debug, playerName, highlightlyId },
      statsError: statsError.message 
    }, { status: 500 });
  }

  return NextResponse.json({ 
    stats: stats || [], 
    highlightly_id: highlightlyId,
    playerName,
    debug
  });
}
