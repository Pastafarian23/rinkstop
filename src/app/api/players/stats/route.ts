// GET /api/players/stats?playerId=X
// Fetches cached career stats for a player from Supabase
// Uses direct REST fetch instead of supabase-js to avoid connection issues

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SUPABASE_KEY = '***REMOVED***';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId');
  const leagueId = searchParams.get('leagueId');

  if (!playerId) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
  }

  // Step 1: Look up the player's highlightly_id from the players table
  const playerRes = await fetch(
    `${SUPABASE_URL}/rest/v1/players?id=eq.${playerId}&select=id,highlightly_id,first_name,last_name&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    }
  );

  if (!playerRes.ok) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  const playerData = await playerRes.json();
  if (!playerData || playerData.length === 0) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  const player = playerData[0];
  const highlightlyId = player.highlightly_id;

  if (!highlightlyId) {
    return NextResponse.json({ stats: [], message: 'Player not linked to highlightly' });
  }

  // Step 2: Fetch career stats using the highlightly numeric ID
  let statsUrl = `${SUPABASE_URL}/rest/v1/highlightly_career_stats?player_id=eq.${highlightlyId}&order=season.desc`;
  if (leagueId) {
    statsUrl += `&league_id=eq.${leagueId}`;
  }

  const statsRes = await fetch(statsUrl, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }
  });

  if (!statsRes.ok) {
    const errText = await statsRes.text();
    console.error('Stats fetch error:', errText);
    return NextResponse.json({ error: 'Database error', details: errText }, { status: 500 });
  }

  const stats = await statsRes.json();

  return NextResponse.json({ stats: stats || [], highlightly_id: highlightlyId });
}