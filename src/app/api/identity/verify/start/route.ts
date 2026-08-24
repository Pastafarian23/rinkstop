/**
 * src/app/api/identity/verify/start/route.ts
 *
 * POST /api/identity/verify/start
 *
 * Creates a Didit.me verification session for the caller and returns the
 * hosted URL. Tier gate: `tierAtLeast(tier, 'identity_plus')` (Hockey Passport Plus required,
 * for Phase 1, per the role-based hub design where 7 of 8 roles require
 * verification and verification itself requires a paid tier).
 *
 * Body: none (we read the clerk userId from auth)
 * Response: { url, session_id, status }
 *
 * PII: didit_sessions.decision is null at this point. Decision lands
 * later via webhook after the user completes the flow on Didit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { isIdentityVerified } from '@/lib/identity-verified';
import { getUserTier } from '@/lib/connections';
import { tierAtLeast } from '@/lib/tier-gate';
import { OWNER_EMAILS } from '@/lib/admin-auth';
import { createSession } from '@/lib/didit';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { trackEvent } from '@/lib/analytics';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 60 * 1000 };   // 10/hr per IP

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 2. Rate limit
  const ip = getClientIP(req);
  const result = await checkRateLimit(`identity-verify-start:${ip}`, RATE_LIMIT);
  maybeCleanup();
  if (!result.allowed) {
    const res = NextResponse.json(
      { error: 'rate_limited', retryAfter: result.retryAfter ?? 60 },
      { status: 429 }
    );
    return applyRateLimitHeaders(res, result);
  }

  try {
    // 3. Tier gate: Hockey Passport+ required for Phase 1
    // (Matches pricing page: verification is a Hockey Passport feature.)
    //
    // Owner-email fallback: if the authed Clerk user_id resolves to a
    // shadow row (e.g. an orphan Clerk user that lazy-create built with
    // tier=free), and the user's email is in OWNER_EMAILS, fall through
    // to the canonical profile row by email so identity verification
    // unlocks. Mirrors the dashboard page pattern.
    let effectiveUserId = userId;
    let tier = await getUserTier(userId);
    try {
      const cu = await currentUser();
      const primaryEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
      if (OWNER_EMAILS.has(primaryEmail)) {
        const { data: byEmail } = await supabaseAdmin
          .from('profiles')
          .select('user_id, tier')
          .ilike('email', primaryEmail)
          .neq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (byEmail) {
          effectiveUserId = byEmail.user_id;
          tier = await getUserTier(byEmail.user_id);
        }
      }
    } catch { /* currentUser() may throw in edge cases — fall through */ }
    if (!tierAtLeast(tier, 'verified_identity')) {
      return NextResponse.json(
        {
          error: 'tier_required',
          message: 'Identity verification requires Hockey Passport tier (Personal) or Business Listing tier.',
          current_tier: tier,
          upgrade_url: '/pricing',
        },
        { status: 403 }
      );
    }

    // 4. Check if user already has an active verification.
    //    Piece C: uses hardened helper (also requires didit_session_id +
    //    matching approved didit_sessions row). Bare flag is no longer trusted.
    const [{ data: profile }, alreadyVerified] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('identity_verified_at, identity_expires_at, identity_verification_method')
        .eq('user_id', effectiveUserId)
        .maybeSingle(),
      isIdentityVerified(effectiveUserId),
    ]);

    if (alreadyVerified) {
      return NextResponse.json(
        {
          error: 'already_verified',
          message: 'You already have an active verification.',
          identity_verified_at: profile?.identity_verified_at ?? null,
          identity_expires_at: profile?.identity_expires_at ?? null,
          method: profile?.identity_verification_method ?? null,
        },
        { status: 409 }
      );
    }

    // 5. Create Didit session
    const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/dashboard/identity?return=1`;
    const diditSession = await createSession('user', {
      vendorData: effectiveUserId,
      callbackUrl,
      metadata: { tier, source: 'web' },
    });

    // 6. Didit is idempotent on (workflow_id, vendor_data) — calling createSession()
    //    twice with the same vendor_data returns the SAME session_id. Without
    //    cleanup, the second call's INSERT fails the UNIQUE(session_id) constraint
    //    and the user gets 'Failed to record session'. Clean up any prior
    //    not_started rows for this user before insert.
    //
    //    Verified 2026-06-30 via direct Didit API test: two POSTs with the
    //    same vendor_data return identical session_id, session_token, and
    //    session_number. Different vendor_data = different session.
    //    The webhook handler reads vendor_data as the canonical user_id, so
    //    we can't change vendor_data to force uniqueness — we have to clean
    //    up stale not_started rows here.
    await supabaseAdmin
      .from('didit_sessions')
      .delete()
      .eq('user_id', effectiveUserId)
      .eq('status', 'not_started');

    // 7. Insert didit_sessions row (no decision yet; status='not_started')
    const { data: sessionRow, error: insertError } = await supabaseAdmin
      .from('didit_sessions')
      .insert({
        user_id: effectiveUserId,
        // Piece D2: Didit v3 returns the session UUID as 'session_id',
        // not 'id'. Was passing undefined before (NOT NULL violation).
        session_id: diditSession.session_id,
        session_kind: 'user',
        workflow_id: diditSession.workflow_id,
        status: 'not_started',
      })
      .select('id, session_id')
      .single();

    if (insertError || !sessionRow) {
      console.error('[identity/start] didit_sessions insert failed:', insertError);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to record session' },
        { status: 500 }
      );
    }

    // 8. Track analytics
    try {
      trackEvent({
        name: 'identity_verify_started',
        userId: effectiveUserId,
        props: {
          session_id: diditSession.session_id,
          tier,
        },
      });
    } catch { /* analytics is best-effort */ }

    const res = NextResponse.json({
      url: diditSession.url,
      session_id: diditSession.session_id,
      status: 'not_started',
    });
    return applyRateLimitHeaders(res, result);
  } catch (err) {
    console.error('[identity/start] error:', err);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to start verification' },
      { status: 500 }
    );
  }
}
