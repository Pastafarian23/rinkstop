// src/app/api/coach/verify-row/route.ts
// POST /api/coach/verify-row — coach verifies a self-reported player team-history row.
//
// Phase 4 (2026-07-10).
// Coach must:
//   - have a coach_profiles row with verification_status in ('platform_verified', 'federation_verified')
//     OR 'self_reported' (v1: any registered coach can verify; we'll tighten this later)
//   - be a coach on the same team (current_team_id == row.team_id, OR have coach_team_history entry for that team)
// Row must:
//   - be self-reported (verification_source = 'self_reported')
//   - have a team_id (we don't verify untyped history rows in v1)

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 20, windowMs: 60 * 1000 };

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`coach-verify:${ip}`, RATE_LIMIT);
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

  const { row_id } = body ?? {};
  if (!row_id) return NextResponse.json({ error: 'row_id is required.' }, { status: 400 });

  // Resolve coach
  const { data: coach, error: coachErr } = await supabaseAdmin
    .from('coach_profiles')
    .select('id, current_team_id')
    .eq('profile_id', userId)
    .maybeSingle();
  if (coachErr) {
    console.error('[coach-verify] coach lookup failed', coachErr);
    return NextResponse.json({ error: 'Failed to look up coach profile.' }, { status: 500 });
  }
  if (!coach) {
    return NextResponse.json(
      { error: 'You need to create your coach profile before verifying players. Visit /dashboard/coach/profile.' },
      { status: 403 }
    );
  }

  // Resolve the row + ownership check
  const { data: row, error: rowErr } = await supabaseAdmin
    .from('hockey_player_team_history')
    .select('id, player_id, team_id, verification_source')
    .eq('id', row_id)
    .maybeSingle();
  if (rowErr) {
    console.error('[coach-verify] row lookup failed', rowErr);
    return NextResponse.json({ error: 'Failed to look up row.' }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Row not found.' }, { status: 404 });
  }
  if (row.verification_source !== 'self_reported') {
    return NextResponse.json(
      { error: `Row is not self_reported (it's ${row.verification_source}). Only self-reported rows can be verified.` },
      { status: 400 }
    );
  }
  if (!row.team_id) {
    return NextResponse.json(
      { error: 'This row has no team_id; verification requires a team. Set a team first or use a different endorsement flow.' },
      { status: 400 }
    );
  }

  // Coach must be on the same team (current or past)
  const { data: coachTeamRows, error: cthErr } = await supabaseAdmin
    .from('coach_team_history')
    .select('id')
    .eq('coach_id', coach.id)
    .eq('team_id', row.team_id)
    .limit(1);
  if (cthErr) {
    console.error('[coach-verify] coach_team_history lookup failed', cthErr);
    return NextResponse.json({ error: 'Failed to check coach team membership.' }, { status: 500 });
  }
  const onTeam =
    (coachTeamRows && coachTeamRows.length > 0) ||
    coach.current_team_id === row.team_id;
  if (!onTeam) {
    return NextResponse.json(
      { error: 'You can only verify rows for teams you coach. Add this team to your coach team history first.' },
      { status: 403 }
    );
  }

  // Update
  const { error } = await supabaseAdmin
    .from('hockey_player_team_history')
    .update({
      verification_source: 'coach_verified',
      verified_by: userId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', row_id);

  if (error) {
    console.error('[coach-verify] update failed', error);
    return NextResponse.json({ error: 'Failed to verify row.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}