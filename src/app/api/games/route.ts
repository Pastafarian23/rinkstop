import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const API_SECRET = process.env.API_SECRET;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function requireAuth(request: NextRequest) {
  const key = request.headers.get('x-api-secret');
  return key === API_SECRET || key === ADMIN_SECRET;
}

// Rate limit: 60 requests per minute per IP
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
  const leagueId = searchParams.get('leagueId');
  const teamId = searchParams.get('teamId');
  const venueId = searchParams.get('venueId');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let query = supabase
    .from('highlightly_matches')
    .select('*');

  if (leagueId) query = query.eq('league_id', leagueId);
  if (teamId) query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
  if (venueId) {
    // venueId is the rink slug — look up rink id first, then filter by venue
    const { data: rinkData } = await supabase
      .from('rinks')
      .select('id')
      .eq('slug', venueId)
      .limit(1);
    const rinkId = rinkData?.[0]?.id;
    if (rinkId) {
      query = query.eq('venue', rinkId);
    }
    // If rink not found or no venue set, return empty
    if (!rinkId) {
      return NextResponse.json([], { status: 200 });
    }
  }
  if (status) query = query.eq('status', status);

  // Fetch more than limit to allow proper in-memory sorting
  const { data, error } = await query
    .order('date', { ascending: false })
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sort: completed games (newest first), then upcoming (soonest first), then other
  const allGames = data || [];
  const completed = allGames
    .filter((g: any) => g.status === 'completed')
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const upcoming = allGames
    .filter((g: any) => g.status === 'scheduled' || g.status === 'in_progress' || g.status === 'inProgress')
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const other = allGames.filter((g: any) => !['completed', 'scheduled', 'in_progress', 'inProgress'].includes(g.status));
  const sortedGames = [...completed, ...upcoming, ...other].slice(0, limit);

  // Map id fields to expected frontend shape
  const games = sortedGames.map(m => ({
    id: m.id,
    date: m.date,
    status: m.status,
    home_team_id: m.home_team_id,
    away_team_id: m.away_team_id,
    home_score: m.home_score,
    away_score: m.away_score,
    scheduled_at: m.date,
    home_team: null,
    away_team: null,
    league: m.league_id ? { name: '' } : null,
    venue_details: m.venue_details || null,
    period_scores: m.period_scores || null,
    referees: m.referees || null,
  }));

  const response = NextResponse.json(games, { status: 200 });
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return applyRateLimitHeaders(response, result);
}

// POST /api/games
export async function POST(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const { data, error } = await supabaseAdmin.from('highlightly_matches').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

// PUT /api/games
export async function PUT(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, ...rest } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { data, error } = await supabaseAdmin.from('highlightly_matches').update(rest).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// DELETE /api/games
export async function DELETE(request: NextRequest) {
  if (!requireAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { error } = await supabaseAdmin.from('highlightly_matches').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}