// Cached data retrieval endpoints
// GET /api/highlightly/[type]/[id]?type=standings|matches|teams&leagueId=X

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    let data;
    let count = 0;

    if (type === 'standings') {
      const result = await supabase
        .from('highlightly_standings')
        .select('*', { count: 'exact' })
        .eq('league_id', id)
        .order('rank');
      data = result.data;
      count = result.count || 0;
    } else if (type === 'teams') {
      const result = await supabase
        .from('highlightly_teams')
        .select('*', { count: 'exact' })
        .eq('league_id', id)
        .order('name');
      data = result.data;
      count = result.count || 0;
    } else if (type === 'matches') {
      const limit = parseInt(new URL(request.url).searchParams.get('limit') || '10');
      const result = await supabase
        .from('highlightly_matches')
        .select('*', { count: 'exact' })
        .eq('league_id', id)
        .order('date', { ascending: false })
        .limit(limit);
      data = result.data;
      count = result.count || 0;
    } else {
      return NextResponse.json({ error: 'Invalid type. Use: standings, teams, matches' }, { status: 400 });
    }

    return NextResponse.json({
      source: 'cache',
      type,
      leagueId: id,
      count,
      data,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}