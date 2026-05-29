import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

// Cache team lookups for performance
const teamCache = new Map<string, { name: string; logo_url: string | null; slug: string }>();

async function getTeamName(teamId: string | null): Promise<{ name: string; logo_url: string | null; slug: string } | null> {
  if (!teamId) return null;
  if (teamCache.has(teamId)) return teamCache.get(teamId)!;

  const { data } = await supabase
    .from('nhl_teams')
    .select('name, logo, short_name')
    .eq('id', teamId)
    .single();

  if (data) {
    const result = {
      name: data.name || data.short_name || 'Unknown',
      logo_url: data.logo || null,
      slug: (data.short_name || data.name || '').toLowerCase().replace(/\s+/g, '-'),
    };
    teamCache.set(teamId, result);
    return result;
  }

  return null;
}

function extractNHLTeam(gd: any) {
  if (!gd) return null;
  const ht = gd.home_team || gd.homeTeam;
  const at = gd.away_team || gd.awayTeam;
  // If we have NHL-structured data, return it
  if (ht || at) {
    return {
      home: ht ? {
        name: ht.placeName?.default || ht.commonName?.default || ht.name?.default || ht.abbrev || 'Home',
        logo_url: ht.logo || null,
        slug: (ht.abbrev || '').toLowerCase(),
      } : null,
      away: at ? {
        name: at.placeName?.default || at.commonName?.default || at.name?.default || at.abbrev || 'Away',
        logo_url: at.logo || null,
        slug: (at.abbrev || '').toLowerCase(),
      } : null,
    };
  }
  return null;
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = checkRateLimit(ip, RATE_LIMIT);
  maybeCleanup();

  if (!result.allowed) {
    const response = new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please slow down.' }),
      { status: 429 }
    );
    applyRateLimitHeaders(response, result);
    response.headers.set('Content-Type', 'application/json');
    return response;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let query = supabase
    .from('fixtures')
    .select('*')
    .order('scheduled_at', { ascending: false })
    .limit(1000);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let games = data || [];

  // Filter
  if (status === 'completed') {
    games = games.filter((g: any) => g.status === 'completed');
  } else if (status === 'scheduled') {
    games = games.filter((g: any) => g.status === 'scheduled');
  }

  // Sort: completed (newest first), then upcoming (soonest first)
  const completed = games
    .filter((g: any) => g.status === 'completed')
    .sort((a: any, b: any) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  const upcoming = games
    .filter((g: any) => g.status === 'scheduled')
    .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const sortedGames = [...completed, ...upcoming].slice(0, limit);

  // Resolve team names for all games in parallel
  const gameResults = await Promise.all(sortedGames.map(async (g: any) => {
    const nhlData = extractNHLTeam(g.game_data);

    // Try NHL API team data first, then fall back to nhl_teams table via UUID
    let homeTeam = nhlData?.home;
    let awayTeam = nhlData?.away;

    if (!homeTeam && g.home_team_id) {
      const t = await getTeamName(g.home_team_id);
      if (t) homeTeam = t;
    }
    if (!awayTeam && g.away_team_id) {
      const t = await getTeamName(g.away_team_id);
      if (t) awayTeam = t;
    }

    // Determine league name
    let leagueName = 'NHL';
    if (g.game_data?.source === 'espn') leagueName = 'College Hockey';
    else if (g.game_data?.source === 'khl') leagueName = 'KHL';
    else if (g.league_id) {
      const { data: league } = await supabase
        .from('leagues')
        .select('name')
        .eq('id', g.league_id)
        .single();
      if (league) leagueName = league.name;
    }

    return {
      id: g.id,
      date: g.scheduled_at,
      status: g.status,
      home_team_id: g.home_team_id,
      away_team_id: g.away_team_id,
      home_score: g.home_score,
      away_score: g.away_score,
      scheduled_at: g.scheduled_at,
      home_team: homeTeam,
      away_team: awayTeam,
      league: { name: leagueName },
      venue_details: g.game_data?.venue ? { name: g.game_data.venue } : null,
      period_scores: null,
      referees: null,
    };
  }));

  const response = NextResponse.json(gameResults, { status: 200 });
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return applyRateLimitHeaders(response, result);
}