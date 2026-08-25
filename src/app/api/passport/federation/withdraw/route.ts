// src/app/api/passport/federation/withdraw/route.ts
// POST /api/passport/federation/withdraw
//
// Owner withdraws a federation_registrations submission to edit and resubmit.
// Allowed from 'pending' or 'rejected' status (NOT 'approved' — admin approval
// is final until admin explicitly rejects or the user files an appeal).
//
// Transitions:
//   pending → draft (clears submitted_at, submitted_by)
//   rejected → draft (clears submitted_at, submitted_by, rejection_reason)
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
  const result = await checkRateLimit(`passport-fed-withdraw:${ip}`, RATE_LIMIT);
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
  // Opened 2026-08-25 per Arnel: federation info should be viewable/displayable on entry-level paid plans.
  const { data: callerProfileWithdraw } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();
  if (!callerProfileWithdraw?.tier || !['verified_identity', 'identity_plus', 'club_starter', 'club_pro', 'club_elite', 'league', 'federation', 'business_listing', 'business_plus'].includes(callerProfileWithdraw.tier)) {
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

  const { data: row, error: rowErr } = await supabaseAdmin
    .from('federation_registrations')
    .select('id, submission_status, player_id, coach_id, referee_user_id')
    .eq('id', registration_id)
    .maybeSingle();
  if (rowErr) {
    console.error('[passport-fed-withdraw] row lookup failed', rowErr);
    return NextResponse.json({ error: 'Failed to look up registration.' }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
  }

  if (!row.player_id) {
    return NextResponse.json(
      { error: 'Withdraw for non-player registrations is not implemented in PR1.' },
      { status: 501 }
    );
  }
  const { data: player, error: playerErr } = await supabaseAdmin
    .from('players')
    .select('id, user_id')
    .eq('id', row.player_id)
    .maybeSingle();
  if (playerErr || !player) {
    console.error('[passport-fed-withdraw] player lookup failed', playerErr);
    return NextResponse.json({ error: 'Failed to verify ownership.' }, { status: 500 });
  }
  if (player.user_id !== userId) {
    return NextResponse.json({ error: 'Not your registration.' }, { status: 403 });
  }

  if (!['pending', 'rejected'].includes(row.submission_status)) {
    return NextResponse.json(
      { error: `Cannot withdraw — status is "${row.submission_status}". Only pending or rejected rows can be withdrawn.` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabaseAdmin
    .from('federation_registrations')
    .update({
      submission_status: 'draft',
      submitted_at: null,
      submitted_by: null,
      verified_at: null,
      verified_by: null,
      rejection_reason: null,
      updated_at: now,
    })
    .eq('id', registration_id);
  if (updErr) {
    console.error('[passport-fed-withdraw] update failed', updErr);
    return NextResponse.json({ error: 'Failed to withdraw.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, submission_status: 'draft' });
}
