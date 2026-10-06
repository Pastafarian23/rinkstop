/**
 * GET /api/scoresheet/fixture-prefill?fixture=<id>
 *
 * Reads a rinkstop.com fixture and returns a pre-fill object for the
 * game creation wizard. Used by the deep-link landing page at /new
 * when the user scans a QR from rinkstop.com.
 *
 * Also checks if the current Clerk user already has a scoresheet game
 * linked to this fixture; if so, returns `linkedGameId` so the page
 * can redirect to the existing game instead of creating a duplicate.
 *
 * Public-read on `fixtures` (RinkStop's directory is open to
 * unauthenticated viewers for browsing); the linked-game check requires
 * a Clerk session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const fixtureId = req.nextUrl.searchParams.get('fixture');
  if (!fixtureId || !/^[0-9a-f-]{36}$/i.test(fixtureId)) {
    return NextResponse.json({ error: 'Invalid fixture id' }, { status: 400 });
  }

  const sb = getServerSupabase();
  if (!sb) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  // Load the fixture + its team names + venue name.
  const { data: fixture, error } = await sb
    .from('fixtures')
    .select(`
      id, scheduled_at, status, home_team_id, away_team_id, league_id, venue_id,
      home_team:team_workspaces!fixtures_home_team_id_fkey(id, name, short_name, colors),
      away_team:team_workspaces!fixtures_away_team_id_fkey(id, name, short_name, colors),
      league:leagues(id, name, slug),
      rink:rinks!fixtures_venue_id_fkey(id, name, city, province_state, country)
    `)
    .eq('id', fixtureId)
    .maybeSingle();
  if (error || !fixture) {
    return NextResponse.json({ error: 'Fixture not found.' }, { status: 404 });
  }

  // If signed in, check for an existing scoresheet game linked to this fixture.
  let linkedGameId: string | null = null;
  const { userId } = await auth();
  if (userId) {
    const { data: existing } = await sb
      .from('games')
      .select('id, status')
      .eq('rinkstop_fixture_id', fixtureId)
      .eq('owner_user_id', userId)
      .neq('status', 'draft')  // ignore abandoned draft games
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) linkedGameId = (existing as any).id;
  }

  return NextResponse.json({
    fixture: {
      id: (fixture as any).id,
      scheduled_at: (fixture as any).scheduled_at,
      status: (fixture as any).status,
      home_team: (fixture as any).home_team,
      away_team: (fixture as any).away_team,
      league: (fixture as any).league,
      rink: (fixture as any).rink,
    },
    prefill: {
      home_team_name: (fixture as any).home_team?.name || '',
      home_team_rinkstop_id: (fixture as any).home_team_id,
      home_team_color: extractColor((fixture as any).home_team?.colors),
      away_team_name: (fixture as any).away_team?.name || '',
      away_team_rinkstop_id: (fixture as any).away_team_id,
      away_team_color: extractColor((fixture as any).away_team?.colors),
      venue_name: (fixture as any).rink ? `${(fixture as any).rink.name}${((fixture as any).rink as any).city ? `, ${(fixture as any).rink.city}` : ''}` : null,
      rink_id: (fixture as any).venue_id,
      scheduled_at: (fixture as any).scheduled_at,
      game_type: 'regular',
    },
    linkedGameId,
  });
}

function extractColor(colors: any): string | null {
  if (!colors) return null;
  if (typeof colors === 'string') return colors;
  if (typeof colors === 'object') {
    // Common patterns: { primary: '#xxx' }, { main: '#xxx' }, ['#xxx', '#yyy']
    if (Array.isArray(colors)) return colors[0] || null;
    return colors.primary || colors.main || colors.color || null;
  }
  return null;
}
