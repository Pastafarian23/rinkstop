// src/app/api/passport/team-history/route.ts
// POST /api/passport/team-history — owner adds a new team affiliation.
//
// Phase 3 (2026-07-10). Mirrors the existing /api/claims POST pattern:
//   - Clerk auth via resolveCanonicalUserId
//   - Rate-limited (10 req/min per IP — same as claims)
//   - All validation server-side
//   - Self-reported by default (no coach/league verification at insert time)
//   - 403 if user has no player record (means user hasn't claimed a player profile yet)

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

const VALID_LEVELS = [
  'youth', 'house', 'travel', 'aaa', 'aa', 'a',
  'high_school', 'junior', 'college', 'pro', 'recreational', 'other',
];
const VALID_POSITIONS = ['forward', 'defense', 'goalie'];
const VALID_ROLES = ['player', 'captain', 'alternate_captain', 'goalie', 'other'];

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`passport-th:${ip}`, RATE_LIMIT);
  maybeCleanup();

  if (!result.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests. Please slow down.' }), { status: 429 });
    applyRateLimitHeaders(res, result);
    return res;
  }

  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const {
    team_id,
    team_name,
    season_id,
    level,
    jersey_number,
    position,
    role,
    start_date,
    end_date,
  } = body ?? {};

  // Required fields
  if (!team_id && !team_name) {
    return NextResponse.json({ error: 'Either team_id or team_name is required.' }, { status: 400 });
  }
  if (!season_id) {
    return NextResponse.json({ error: 'season_id is required.' }, { status: 400 });
  }

  // Optional enums
  if (level && !VALID_LEVELS.includes(level)) {
    return NextResponse.json({ error: `level must be one of: ${VALID_LEVELS.join(', ')}` }, { status: 400 });
  }
  if (position && !VALID_POSITIONS.includes(position)) {
    return NextResponse.json({ error: `position must be one of: ${VALID_POSITIONS.join(', ')}` }, { status: 400 });
  }
  if (role && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  // Jersey number range
  if (jersey_number != null) {
    const jn = Number(jersey_number);
    if (!Number.isInteger(jn) || jn < 0 || jn > 99) {
      return NextResponse.json({ error: 'jersey_number must be an integer 0-99.' }, { status: 400 });
    }
  }

  // Date validation
  if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
    return NextResponse.json({ error: 'end_date cannot be before start_date.' }, { status: 400 });
  }

  // Resolve player_id for the authenticated user
  const { data: player, error: playerErr } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (playerErr) {
    console.error('[passport-th] player lookup failed', playerErr);
    return NextResponse.json({ error: 'Failed to look up player record.' }, { status: 500 });
  }
  if (!player) {
    return NextResponse.json(
      { error: 'You need to claim a player profile before adding career history. Claim your profile at /claim-your-listing.' },
      { status: 403 }
    );
  }

  // Resolve team_name_snapshot if team_id given
  let teamNameSnapshot = team_name?.trim() || '';
  let leagueId: string | null = null;
  let leagueNameSnapshot: string | null = null;
  if (team_id) {
    const { data: team, error: teamErr } = await supabaseAdmin
      .from('team_workspaces')
      .select('id, name, league_id')
      .eq('id', team_id)
      .maybeSingle();
    if (teamErr) {
      console.error('[passport-th] team lookup failed', teamErr);
      return NextResponse.json({ error: 'Failed to look up team.' }, { status: 500 });
    }
    if (!team) {
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }
    teamNameSnapshot = team.name;
    leagueId = team.league_id;
    if (leagueId) {
      const { data: league } = await supabaseAdmin
        .from('leagues')
        .select('name')
        .eq('id', leagueId)
        .maybeSingle();
      leagueNameSnapshot = league?.name ?? null;
    }
  }
  if (!teamNameSnapshot) {
    return NextResponse.json({ error: 'team_name could not be resolved.' }, { status: 400 });
  }

  // Insert
  const { data: row, error } = await supabaseAdmin
    .from('hockey_player_team_history')
    .insert({
      player_id: player.id,
      team_id: team_id || null,
      team_name_snapshot: teamNameSnapshot,
      league_id: leagueId,
      league_name_snapshot: leagueNameSnapshot,
      season_id,
      level: level || null,
      jersey_number: jersey_number != null ? Number(jersey_number) : null,
      position: position || null,
      role: role || 'player',
      start_date: start_date || null,
      end_date: end_date || null,
      verification_source: 'self_reported',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[passport-th] insert failed', error);
    return NextResponse.json({ error: 'Failed to save team affiliation.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: row.id });
}