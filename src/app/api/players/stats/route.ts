import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Simple test endpoint to debug Supabase connection
export async function GET() {
  // Test 1: Simple players query
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, first_name')
    .limit(1);

  // Test 2: highlightly_career_stats query  
  const { data: stats, error: statsError } = await supabase
    .from('highlightly_career_stats')
    .select('id, season')
    .limit(1);

  return NextResponse.json({
    test1_players: {
      data: players,
      error: playersError?.message || null
    },
    test2_stats: {
      data: stats?.length ? `${stats.length} rows` : 'empty',
      error: statsError?.message || null
    }
  });
}