import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, first_name, last_name')
    .limit(3);

  const { data: stats, error: statsError } = await supabase
    .from('highlightly_career_stats')
    .select('id, season, player_id')
    .limit(3);

  return NextResponse.json({
    players: { count: players?.length || 0, error: playersError?.message },
    stats: { count: stats?.length || 0, error: statsError?.message }
  });
}
