// GET /api/players/stats?playerId=X
// Fetches cached career stats for a player from Supabase

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yLLbqXl_CFS174sL6TRqjg_nej93X4g';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const leagueId = searchParams.get('leagueId');

  if (!playerId) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
  }

  try {
    // Step 1: Look up the player's highlightly_id
    const playerRes = await fetch(
      `${SUPABASE_URL}/rest/v1/players?id=eq.${playerId}&select=highlightly_id,first_name,last_name&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        next: { revalidate: 0 }
      }
    );

    if (!playerRes.ok) {
      return NextResponse.json({ error: 'Player lookup failed' }, { status: 500 });
    }

    const playerData = await playerRes.json();
    if (!playerData || playerData.length === 0) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const { highlightly_id: highlightlyId } = playerData[0];

    if (!highlightlyId) {
      return NextResponse.json({ stats: [], message: 'No highlightly link' });
    }

    // Step 2: Fetch career stats using highlightly_id
    let statsUrl = `${SUPABASE_URL}/rest/v1/highlightly_career_stats?player_id=eq.${highlightlyId}&select=season,season_type,games_played,goals,assists,points,penalty_minutes,plus_minus,wins,losses,save_percentage,goals_against_average,shutouts&order=season.desc`;
    if (leagueId) statsUrl += `&league_id=eq.${leagueId}`;

    const statsRes = await fetch(statsUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      next: { revalidate: 0 }
    });

    if (!statsRes.ok) {
      return NextResponse.json({ error: 'Stats fetch failed' }, { status: 500 });
    }

    const stats = await statsRes.json();

    return NextResponse.json({ stats: stats || [], highlightly_id: highlightlyId });

  } catch (err: any) {
    return NextResponse.json({ error: 'Server error', details: err.message }, { status: 500 });
  }
}