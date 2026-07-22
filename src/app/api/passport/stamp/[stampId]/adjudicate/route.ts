/**
 * POST /api/passport/stamp/[stampId]/adjudicate
 *
 * WS3.5 PR2 — Operator or staff adjudication of a disputed stamp.
 *
 * Per Workstream 3.5 spec (2026-07-22):
 *   - Only the operator of the target (via approved claim) OR RinkStop
 *     staff (Clerk role='admin') can adjudicate.
 *   - action='uphold' moves status='disputed' → 'rejected'. The stamp
 *     never counts again. Stamper gets a `dispute_upheld` inbox notification.
 *   - action='overturn' moves status='disputed' → 'confirmed'. The stamp
 *     counts normally. Stamper gets a `dispute_overturned` notification.
 *
 * Auth: caller must be signed in. Service-layer enforces operator-or-staff
 * authorization (throws StampForbiddenError otherwise).
 *
 * Gate: STAMPS_ADMIN_ENABLED must be true (per Workstream 1 Rule 5).
 *
 * Body: { action: 'uphold' | 'overturn', reason?: string }
 *
 * Idempotent: re-adjudicating an already-adjudicated stamp returns 200
 * with current state (no double audit row, no double notification).
 *
 * Rate limit: 60/min (adjudications are operator-only, low-traffic).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import {
  checkRateLimit,
  getClientIP,
  applyRateLimitHeaders,
  maybeCleanup,
} from '@/lib/rateLimit';
import {
  isStampsAdminEnabled,
  stampService,
  StampNotFoundError,
  StampForbiddenError,
} from '@/lib/passport';
import type { AdjudicateStampRequest } from '@/lib/passport/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ stampId: string }> }
) {
  if (!isStampsAdminEnabled()) {
    return NextResponse.json(
      { error: 'Dispute adjudication is not enabled.' },
      { status: 403 }
    );
  }

  const ip = getClientIP(request);
  const rl = await checkRateLimit(`passport-stamp-adjudicate:${ip}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);

  let body: AdjudicateStampRequest;
  try {
    body = await request.json();
  } catch {
    const res = NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  const action = body?.action;
  if (action !== 'uphold' && action !== 'overturn') {
    const res = NextResponse.json(
      { error: 'invalid_action', allowed: ['uphold', 'overturn'] },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  // Validate stampId shape (UUID).
  const { stampId } = await ctx.params;
  if (!UUID_RE.test(stampId)) {
    const res = NextResponse.json({ error: 'invalid_stamp_id' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  // Optional reason — clamp length, strip control chars.
  let reason: string | undefined;
  if (typeof body.reason === 'string') {
    reason = body.reason.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 1000);
    if (reason.length === 0) reason = undefined;
  }

  // Determine staff status. Cheaply check profiles.role. The service
  // layer re-checks authorization, but isStaff tells the service which
  // path to take (rink: claim-or-staff; venue/event: staff-only).
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  const isStaff = profile?.role === 'admin' || profile?.role === 'super_admin';

  try {
    const result = await stampService.adjudicateStamp({
      callerUserId: userId,
      isStaff,
      stampId,
      action,
      reason,
    });
    const res = NextResponse.json(result);
    return applyRateLimitHeaders(res, rl);
  } catch (err: unknown) {
    if (err instanceof StampNotFoundError) {
      const res = NextResponse.json({ error: 'stamp_not_found' }, { status: 404 });
      return applyRateLimitHeaders(res, rl);
    }
    if (err instanceof StampForbiddenError) {
      const res = NextResponse.json(
        { error: 'forbidden', message: err.message },
        { status: 403 }
      );
      return applyRateLimitHeaders(res, rl);
    }
    console.error('[adjudicate] unexpected error:', err);
    const res = NextResponse.json(
      { error: 'server_error', message: 'Failed to adjudicate stamp' },
      { status: 500 }
    );
    return applyRateLimitHeaders(res, rl);
  }
}
