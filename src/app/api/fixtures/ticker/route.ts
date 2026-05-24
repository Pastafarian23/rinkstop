import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );

    const { data, error } = await supabase
      .from('fixtures')
      .select(`
        id,
        scheduled_at,
        home_score,
        away_score,
        status,
        home_team:teams!home_team_id(id, name, city),
        away_team:teams!away_team_id(id, name, city),
        league:leagues!league_id(id, name)
      `)
      .eq('league_id', '2b5f2b9d-84b9-4edb-8373-a732b72f4e40')
      .in('status', ['completed', 'scheduled'])
      .order('scheduled_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    const games = (data || []).map((f: any) => {
      const home = f.home_team;
      const away = f.away_team;
      const league = f.league;

      const homeCode = home?.city
        ? home.city.substring(0, 3).toUpperCase()
        : (home?.name || 'TBD').substring(0, 3).toUpperCase();
      const awayCode = away?.city
        ? away.city.substring(0, 3).toUpperCase()
        : (away?.name || 'TBD').substring(0, 3).toUpperCase();

      return {
        id: f.id,
        homeCode,
        homeName: home?.name || 'TBD',
        awayCode,
        awayName: away?.name || 'TBD',
        homeScore: f.home_score ?? null,
        awayScore: f.away_score ?? null,
        status: f.status,
        scheduledAt: f.scheduled_at,
        seriesInfo: null,
        leagueName: league?.name || 'Hockey',
        isFinal: f.status === 'completed',
        isLive: f.status === 'in_progress',
      };
    });

    return NextResponse.json(games);
  } catch (e) {
    const msg = e instanceof Error ? e.message : (typeof e === 'object' ? JSON.stringify(e) : String(e));
    console.error('fixtures ticker error', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}