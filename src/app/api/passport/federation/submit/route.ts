// src/app/api/passport/federation/submit/route.ts
// POST /api/passport/federation/submit
//
// Owner submits a DRAFT federation_registrations row for admin verification.
// Transitions status draft → pending. Locks the row from owner edits until
// admin approves, rejects, or owner withdraws.
//
// Body: { registration_id: UUID }
//
// Tier 2 workflow (2026-07-23).

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`passport-fed-submit:${ip}`, RATE_LIMIT);
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

  // Tier gate — federation verification requires Hockey Passport ($24.99/yr) and above.
  // Opened 2026-08-25 per Arnel: federation info should be viewable/displayable on entry-level paid plans. The federation form page
  // renders an upgrade CTA for non-paid users; this API mirrors that.
  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();
  if (!callerProfile?.tier || !['verified_identity', 'identity_plus', 'club_starter', 'club_pro', 'club_elite', 'league', 'federation', 'business_listing', 'business_plus'].includes(callerProfile.tier)) {
    return NextResponse.json(
      {
        error:
          'Federation verification is available on Hockey Passport ($24.99/yr) and above.',
        upgrade_url: '/pricing',
        required_tier: 'verified_identity',
      },
      { status: 402 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const { registration_id } = body ?? {};
  if (!registration_id || typeof registration_id !== 'string') {
    return NextResponse.json({ error: 'registration_id (UUID) is required.' }, { status: 400 });
  }

  // Fetch the row + verify the caller owns it (via player.user_id).
  const { data: row, error: rowErr } = await supabaseAdmin
    .from('federation_registrations')
    .select('id, submission_status, player_id, coach_id, referee_user_id')
    .eq('id', registration_id)
    .maybeSingle();
  if (rowErr) {
    console.error('[passport-fed-submit] row lookup failed', rowErr);
    return NextResponse.json({ error: 'Failed to look up registration.' }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
  }

  // Owner check: player branch only here. Coach/referee branches get their
  // own submit routes in PR2.
  if (!row.player_id) {
    return NextResponse.json(
      { error: 'Submit for non-player registrations is not implemented in PR1 (coach + referee in PR2).' },
      { status: 501 }
    );
  }
  const { data: player, error: playerErr } = await supabaseAdmin
    .from('players')
    .select('id, user_id')
    .eq('id', row.player_id)
    .maybeSingle();
  if (playerErr || !player) {
    console.error('[passport-fed-submit] player lookup failed', playerErr);
    return NextResponse.json({ error: 'Failed to verify ownership.' }, { status: 500 });
  }
  if (player.user_id !== userId) {
    return NextResponse.json({ error: 'Not your registration.' }, { status: 403 });
  }

  if (row.submission_status !== 'draft') {
    return NextResponse.json(
      { error: `Cannot submit — status is "${row.submission_status}".` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabaseAdmin
    .from('federation_registrations')
    .update({
      submission_status: 'pending',
      submitted_at: now,
      submitted_by: userId,
      // Clear stale rejection state on resubmit.
      rejection_reason: null,
      verified_at: null,
      verified_by: null,
      updated_at: now,
    })
    .eq('id', registration_id);
  if (updErr) {
    console.error('[passport-fed-submit] update failed', updErr);
    return NextResponse.json({ error: 'Failed to submit.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, submission_status: 'pending' });
}
