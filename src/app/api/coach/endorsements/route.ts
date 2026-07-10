// src/app/api/coach/endorsements/route.ts
// POST /api/coach/endorsements — coach creates an endorsement for a player.
//
// Phase 4 (2026-07-10). Player must exist. Coach must have a coach_profile.
// Content moderation: text length 10-1000 chars per the DB CHECK constraint.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

const VALID_TYPES = ['skills', 'character', 'leadership', 'eligible_for_next_level', 'rec_ready', 'other'];
const VALID_VISIBILITY = ['sport_scoped', 'cross_sport', 'private'];

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`coach-endorse:${ip}`, RATE_LIMIT);
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

  const { player_id, endorsement_type, text, visibility } = body ?? {};

  if (!player_id) return NextResponse.json({ error: 'player_id is required.' }, { status: 400 });
  if (!endorsement_type || !VALID_TYPES.includes(endorsement_type)) {
    return NextResponse.json({ error: `endorsement_type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }
  if (!text || typeof text !== 'string' || text.trim().length < 10 || text.length > 1000) {
    return NextResponse.json({ error: 'text is required (10-1000 chars).' }, { status: 400 });
  }
  if (visibility && !VALID_VISIBILITY.includes(visibility)) {
    return NextResponse.json({ error: `visibility must be one of: ${VALID_VISIBILITY.join(', ')}` }, { status: 400 });
  }

  // Resolve coach_profile
  const { data: coach, error: coachErr } = await supabaseAdmin
    .from('coach_profiles')
    .select('id, verification_status')
    .eq('profile_id', userId)
    .maybeSingle();
  if (coachErr) {
    console.error('[coach-endorse] coach lookup failed', coachErr);
    return NextResponse.json({ error: 'Failed to look up coach profile.' }, { status: 500 });
  }
  if (!coach) {
    return NextResponse.json(
      { error: 'You need to create your coach profile before endorsing players. Visit /dashboard/coach/profile.' },
      { status: 403 }
    );
  }

  // Verify player exists
  const { data: player, error: playerErr } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name')
    .eq('id', player_id)
    .maybeSingle();
  if (playerErr) {
    console.error('[coach-endorse] player lookup failed', playerErr);
    return NextResponse.json({ error: 'Failed to look up player.' }, { status: 500 });
  }
  if (!player) {
    return NextResponse.json({ error: 'Player not found.' }, { status: 404 });
  }

  // Soft check: warn if coach has no team history with this player
  // (optional v1 enhancement; not blocking). For now, allow any endorsement
  // from any verified coach to any player.

  const { data: row, error } = await supabaseAdmin
    .from('coach_endorsements')
    .insert({
      coach_id: coach.id,
      player_id,
      endorsement_type,
      text: text.trim(),
      visibility: visibility || 'sport_scoped',
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[coach-endorse] insert failed', error);
    return NextResponse.json({ error: 'Failed to save endorsement.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: row.id });
}