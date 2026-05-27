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
  
  const { data, error } = await query
    .order('date', { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map id fields to expected frontend shape
  const games = (data || []).map(m => ({
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
  const body = await request.json();
  const { data, error } = await supabase.from('highlightly_matches').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

// PUT /api/games
export async function PUT(request: NextRequest) {
  const { id, ...rest } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { data, error } = await supabase.from('highlightly_matches').update(rest).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// DELETE /api/games
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  const { error } = await supabase.from('highlightly_matches').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}