import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Simple test endpoint to debug Supabase connection - NO playerId required
export async function GET() {
  // Test 1: Simple players query
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, first_name, last_name')
    .limit(3);

  // Test 2: highlightly_career_stats query  
  const { data: stats, error: statsError } = await supabase
    .from('highlightly_career_stats')
    .select('id, season, player_id')
    .limit(3);

  // Test 3: Try to join players with stats
  const { data: linkedData, error: linkedError } = await supabase
    .from('players')
    .select('id, first_name, last_name, highlightly_id')
    .not('highlightly_id', 'is', null)
    .limit(3);

  return NextResponse.json({
    test1_players: {
      count: players?.length || 0,
      first: players?.[0] || null,
      error: playersError?.message || null
    },
    test2_stats: {
      count: stats?.length || 0,
      first: stats?.[0] || null,
      error: statsError?.message || null
    },
    test3_linked: {
      count: linkedData?.length || 0,
      first: linkedData?.[0] || null,
      error: linkedError?.message || null
    }
  });
}