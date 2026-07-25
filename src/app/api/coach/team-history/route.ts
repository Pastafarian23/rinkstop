// src/app/api/coach/team-history/route.ts
// POST /api/coach/team-history — coach adds a row to their own coach_team_history.
//
// Phase 4 (2026-07-10). Mirrors /api/passport/team-history POST pattern.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

const VALID_ROLES = ['head_coach', 'assistant_coach', 'skills_coach', 'goalie_coach', 'manager', 'other'];

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`coach-th:${ip}`, RATE_LIMIT);
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

  const { team_id, role, season_id, start_date, end_date } = body ?? {};

  if (!team_id) return NextResponse.json({ error: 'team_id is required.' }, { status: 400 });
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }
  if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
    return NextResponse.json({ error: 'end_date cannot be before start_date.' }, { status: 400 });
  }

  // Resolve coach_profile
  const { data: coach, error: coachErr } = await supabaseAdmin
    .from('coach_profiles')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();
  if (coachErr) {
    console.error('[coach-th] coach lookup failed', coachErr);
    return NextResponse.json({ error: 'Failed to look up coach profile.' }, { status: 500 });
  }
  if (!coach) {
    return NextResponse.json(
      { error: 'You need to create your coach profile before adding team history. Visit /dashboard/coach/profile.' },
      { status: 403 }
    );
  }

  // Verify team exists
  const { data: team, error: teamErr } = await supabaseAdmin
    .from('team_workspaces')
    .select('id')
    .eq('id', team_id)
    .maybeSingle();
  if (teamErr) {
    console.error('[coach-th] team lookup failed', teamErr);
    return NextResponse.json({ error: 'Failed to look up team.' }, { status: 500 });
  }
  if (!team) {
    return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
  }

  const { data: row, error } = await supabaseAdmin
    .from('coach_team_history')
    .insert({
      coach_id: coach.id,
      team_id,
      role,
      season_id: season_id || null,
      start_date: start_date || null,
      end_date: end_date || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[coach-th] insert failed', error);
    return NextResponse.json({ error: 'Failed to save coach team affiliation.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: row.id });
}