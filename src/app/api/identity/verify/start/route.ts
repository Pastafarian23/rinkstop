/**
 * src/app/api/identity/verify/start/route.ts
 *
 * POST /api/identity/verify/start
 *
 * Creates a Didit.me verification session for the caller and returns the
 * hosted URL. Tier gate: `tierAtLeast(tier, 'starter')` (Starter+ required
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
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isIdentityVerified } from '@/lib/identity-verified';
import { getUserTier, tierAtLeast } from '@/lib/connections';
import { createSession } from '@/lib/didit';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { trackEvent } from '@/lib/analytics';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 60 * 1000 };   // 10/hr per IP

export async function POST(req: NextRequest) {
  // 1. Auth
  const { userId } = await auth();
  if (!userId) {
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
    // 3. Tier gate: Starter+ required for Phase 1
    // (Was Pro+ in earlier design; downgraded 2026-06-17 because
    //  verification-required roles (coach, manager, etc.) are
    //  available from Starter. Only free users are blocked.)
    const tier = await getUserTier(userId);
    if (!tierAtLeast(tier, 'starter')) {
      return NextResponse.json(
        {
          error: 'tier_required',
          message: 'Identity verification requires a paid tier (Starter or above).',
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
        .eq('user_id', userId)
        .maybeSingle(),
      isIdentityVerified(userId),
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
      vendorData: userId,
      callbackUrl,
      metadata: { tier, source: 'web' },
    });

    // 6. Insert didit_sessions row (no decision yet; status='not_started')
    const { data: sessionRow, error: insertError } = await supabaseAdmin
      .from('didit_sessions')
      .insert({
        user_id: userId,
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

    // 7. Track analytics
    try {
      trackEvent({
        name: 'identity_verify_started',
        userId: userId,
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
