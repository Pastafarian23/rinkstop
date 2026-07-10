// src/app/api/passport/stats/route.ts
// POST /api/passport/stats — owner adds per-season stats.
//
// Phase 3 (2026-07-10). Mirrors /api/passport/team-history POST pattern.
// Skater stats (GP/G/A/+/-/PIM) and goalie stats (W/L/GAA/SV%/SO) are mutually
// optional fields; client decides which to send based on position_category.

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

function intField(value: any, fieldName: string, min = 0): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min) {
    throw new Error(`${fieldName} must be an integer >= ${min}.`);
  }
  return n;
}

function numericField(value: any, fieldName: string, min: number, max: number): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}.`);
  }
  return n;
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`passport-st:${ip}`, RATE_LIMIT);
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

  const { season_id, level, team_history_id, league_id } = body ?? {};

  if (!season_id) {
    return NextResponse.json({ error: 'season_id is required.' }, { status: 400 });
  }
  if (level && !VALID_LEVELS.includes(level)) {
    return NextResponse.json({ error: `level must be one of: ${VALID_LEVELS.join(', ')}` }, { status: 400 });
  }

  // Resolve player
  const { data: player, error: playerErr } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (playerErr) {
    console.error('[passport-st] player lookup failed', playerErr);
    return NextResponse.json({ error: 'Failed to look up player record.' }, { status: 500 });
  }
  if (!player) {
    return NextResponse.json(
      { error: 'You need to claim a player profile before adding stats. Claim your profile at /claim-your-listing.' },
      { status: 403 }
    );
  }

  // Validate numeric fields. Catch field-level errors and return 400.
  let parsed: any = {};
  try {
    // Skater
    parsed.games_played       = intField(body.games_played,       'games_played')       ?? 0;
    parsed.goals              = intField(body.goals,              'goals')              ?? 0;
    parsed.assists            = intField(body.assists,            'assists')            ?? 0;
    parsed.plus_minus         = intField(body.plus_minus,         'plus_minus')         ?? 0;
    parsed.penalty_minutes    = intField(body.penalty_minutes,    'penalty_minutes')    ?? 0;

    // Goalie (nullable)
    parsed.goalie_games_played = intField(body.goalie_games_played, 'goalie_games_played');
    parsed.wins                = intField(body.wins,                'wins');
    parsed.losses              = intField(body.losses,              'losses');
    parsed.goals_against       = intField(body.goals_against,       'goals_against');
    parsed.saves               = intField(body.saves,               'saves');
    parsed.shutouts            = intField(body.shutouts,            'shutouts');
    parsed.save_percentage     = numericField(body.save_percentage, 'save_percentage', 0, 1);
    parsed.gaa                 = numericField(body.gaa,              'gaa', 0, 100);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  // Insert (UNIQUE on player_id, season_id, team_history_id prevents duplicates)
  const { data: row, error } = await supabaseAdmin
    .from('hockey_player_stats_season')
    .insert({
      player_id: player.id,
      season_id,
      level: level || null,
      team_history_id: team_history_id || null,
      league_id: league_id || null,
      ...parsed,
      verification_source: 'self_reported',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'You already have stats recorded for this player + season + team. Edit the existing entry instead.' },
        { status: 409 }
      );
    }
    console.error('[passport-st] insert failed', error);
    return NextResponse.json({ error: 'Failed to save stats.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: row.id });
}