import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Fetch team names from ESPN for a batch of game IDs
async function enrichFromESPN(games: any[]): Promise<any[]> {
  const toEnrich = games.filter(f => {
    const gameData = tryParseGameData(f.game_data);
    const needsEnrich = !f.home_team && !f.away_team && gameData?.espn_game_id;
    return needsEnrich;
  });

  if (toEnrich.length === 0) return games;

  // Collect unique ESPN game IDs
  const espnIds = toEnrich
    .map(f => tryParseGameData(f.game_data)?.espn_game_id)
    .filter(Boolean) as string[];

  if (espnIds.length === 0) return games;

  // Determine date range to fetch (cover all games)
  const dates = new Set<string>();
  toEnrich.forEach(f => {
    try {
      const d = new Date(f.scheduled_at);
      dates.add(d.toISOString().split('T')[0].replace(/-/g, ''));
    } catch {}
  });
  // Also add yesterday/today/tomorrow to catch any nearby games
  const today = new Date();
  for (let i = -1; i <= 1; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.add(d.toISOString().split('T')[0].replace(/-/g, ''));
  }

  // Fetch ESPN scoreboards for each date
  const dateList = Array.from(dates);
  const scoreboardMap: Record<string, any> = {};

  await Promise.all(dateList.map(async (dateStr) => {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=${dateStr}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return;
      const data = await res.json();
      for (const event of data.events || []) {
        const espnId = String(event.id);
        const comp = event.competitions?.[0];
        const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
        const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');
        scoreboardMap[espnId] = {
          homeTeam: home ? { name: home.team?.name, abbr: home.team?.abbreviation, logo: `https://a.espncdn.com/i/teamlogos/nhl/500/${(home.team?.abbreviation || '').toLowerCase()}.png` } : null,
          awayTeam: away ? { name: away.team?.name, abbr: away.team?.abbreviation, logo: `https://a.espncdn.com/i/teamlogos/nhl/500/${(away.team?.abbreviation || '').toLowerCase()}.png` } : null,
        };
      }
    } catch {}
  }));

  // Merge enriched data back
  return games.map(f => {
    const gameData = tryParseGameData(f.game_data);
    const espnId = gameData?.espn_game_id;
    if (espnId && scoreboardMap[espnId]) {
      const enriched = scoreboardMap[espnId];
      return {
        ...f,
        home_team: f.home_team || enriched.homeTeam || null,
        away_team: f.away_team || enriched.awayTeam || null,
      };
    }
    return f;
  });
}

function tryParseGameData(raw?: string | Record<string, any> | null): Record<string, any> | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw as Record<string, any>;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId');
  const teamId = searchParams.get('teamId');
  const venueId = searchParams.get('venueId');
  const rinkId = searchParams.get('rinkId');
  const status = searchParams.get('status');
  const season = searchParams.get('season');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  let query = supabase.from('games').select('*, home_team:teams!home_team_id(name,logo_url), away_team:teams!away_team_id(name,logo_url), venue:rinks(name), league:leagues(name)');

  if (leagueId) query = query.eq('league_id', leagueId);
  if (teamId) query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
  if (venueId) query = query.eq('venue_id', venueId);
  if (status) query = query.eq('status', status);
  if (season) query = query.eq('season', season);

  const { data, error } = await query.order('scheduled_at', { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter by rink — look up rink by id, then match on venue_city in game_data
  let filtered = data || [];
  if (rinkId) {
    const rinkIdStr = decodeURIComponent(rinkId);
    const { data: rinkData } = await supabase
      .from('rinks')
      .select('id, name, city')
      .eq('id', rinkIdStr)
      .single();

    if (rinkData?.city) {
      const cityLower = rinkData.city.toLowerCase().trim();
      filtered = filtered.filter(f => {
        const gameData = tryParseGameData(f.game_data);
        const matchCity = gameData?.venue_city?.toLowerCase().trim();
        const matchHome = gameData?.home_city?.toLowerCase().trim();
        const matchAway = gameData?.away_city?.toLowerCase().trim();
        // Match by venue_city (NHL) OR by home/away team city (AHL)
        // For shared venues like Scotiabank Arena (NHL Maple Leafs + AHL Marlies),
        // match by exact venue_city first, then by any team city match
        return matchCity === cityLower || matchHome === cityLower || matchAway === cityLower;
      });
    } else {
      filtered = [];
    }
  }

  // Enrich null team records from ESPN
  const enriched = await enrichFromESPN(filtered);

  const response = NextResponse.json(enriched);
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return response;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { data, error } = await supabase.from('games').insert(body).select('*, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { id, ...rest } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { data, error } = await supabase.from('games').update(rest).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}