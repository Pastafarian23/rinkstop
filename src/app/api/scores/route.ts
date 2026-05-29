import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

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
  const status = searchParams.get('status'); // 'completed' | 'scheduled' | 'all'
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let query = supabase
    .from('fixtures')
    .select('*')
    .order('scheduled_at', { ascending: false })
    .limit(1000);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let games = data || [];

  // Filter by status
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

  // Map fixtures to the Game interface the frontend expects
  const mapped = sortedGames.map((g: any) => {
    const home = g.game_data?.home_team;
    const away = g.game_data?.away_team;
    return {
      id: g.id,
      date: g.scheduled_at,
      status: g.status,
      home_team_id: home?.id?.toString() ?? null,
      away_team_id: away?.id?.toString() ?? null,
      home_score: g.home_score,
      away_score: g.away_score,
      scheduled_at: g.scheduled_at,
      home_team: home ? {
        name: home.placeName?.default || home.commonName?.default || home.abbrev || 'Home',
        logo_url: home.logo || null,
        slug: home.abbrev?.toLowerCase() || null,
      } : null,
      away_team: away ? {
        name: away.placeName?.default || away.commonName?.default || away.abbrev || 'Away',
        logo_url: away.logo || null,
        slug: away.abbrev?.toLowerCase() || null,
      } : null,
      league: { name: 'NHL' },
      venue_details: g.game_data?.venue ? { name: g.game_data.venue } : null,
      period_scores: null,
      referees: null,
    };
  });

  const response = NextResponse.json(mapped, { status: 200 });
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return applyRateLimitHeaders(response, result);
}