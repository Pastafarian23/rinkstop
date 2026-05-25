import { NextRequest, NextResponse } from 'next/server';

// Direct REST fetch to Supabase - bypassing supabase-js
const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yLLbqXl_CFS174sL6TRqjg_nej93X4g';

async function supabaseQuery(table: string, params: string) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
  });
  return response.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const leagueId = searchParams.get('leagueId');

  if (!playerId) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
  }

  try {
    // Step 1: Look up highlightly_id from players table
    const playerData = await supabaseQuery(
      'players',
      `id=eq.${playerId}&select=highlightly_id,first_name,last_name&limit=1`
    );

    if (!playerData || playerData.length === 0) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const highlightlyId = playerData[0].highlightly_id;
    const playerName = `${playerData[0].first_name} ${playerData[0].last_name}`;

    if (!highlightlyId) {
      return NextResponse.json({ stats: [], message: 'No highlightly link', playerName });
    }

    // Step 2: Fetch career stats using highlightly numeric ID
    let statsParams = `player_id=eq.${highlightlyId}&order=season.desc`;
    if (leagueId) {
      statsParams += `&league_id=eq.${leagueId}`;
    }

    const stats = await supabaseQuery('highlightly_career_stats', statsParams);

    return NextResponse.json({
      stats: stats || [],
      highlightly_id: highlightlyId,
      playerName
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'Server error', details: err.message }, { status: 500 });
  }
}