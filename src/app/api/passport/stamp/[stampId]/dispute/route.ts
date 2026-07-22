/**
 * POST /api/passport/stamp/[stampId]/dispute
 *
 * WS3 PR4 — Subject-only dispute flow.
 *
 * Per locked rule 2026-07-22: only the SUBJECT of a third-party stamp can
 * dispute. Self-scan disputes are not allowed (you stamped yourself; the
 * 'undo' path would be delete-via-dispute which is silly).
 *
 * Body: { reason?: string }  — optional free-text, stored in scan_events only
 *
 * Auth: caller must be signed in (Clerk). The service enforces subject-only
 * authorization (403 otherwise).
 *
 * Gate: STAMPS_ENABLED must be true (per Workstream 1 Rule 5).
 *
 * Behavior:
 *   - Sets stamps.status = 'disputed'
 *   - Writes audit row to public.scan_events with outcome='flagged_dispute'
 *   - Stays 'disputed' until WS3.5 admin queue lands; the public aggregate
 *     filter (status='confirmed') excludes disputed rows automatically.
 *
 * Idempotent: re-disputing an already-disputed stamp returns 200 with the
 * same status, not an error.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import {
  checkRateLimit,
  getClientIP,
  applyRateLimitHeaders,
  maybeCleanup,
} from '@/lib/rateLimit';
import {
  isStampsEnabled,
  stampService,
  StampNotFoundError,
  StampForbiddenError,
} from '@/lib/passport';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

interface DisputeBody {
  reason?: string;
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ stampId: string }> }
) {
  if (!isStampsEnabled()) {
    return NextResponse.json(
      { error: 'Stamps are not enabled.' },
      { status: 403 }
    );
  }

  const ip = getClientIP(request);
  const rl = await checkRateLimit(`passport-stamp-dispute:${ip}`, RATE_LIMIT);
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

  const userId = await resolveCanonicalUserId(session.userId, '');
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  let body: DisputeBody = {};
  try {
    body = (await request.json().catch(() => ({}))) as DisputeBody;
  } catch {
    // Empty body is fine; reason is optional.
  }

  if (body.reason !== undefined) {
    if (typeof body.reason !== 'string' || body.reason.length > 500) {
      const res = NextResponse.json(
        { error: 'reason must be a string up to 500 characters.' },
        { status: 400 }
      );
      return applyRateLimitHeaders(res, rl);
    }
  }

  const { stampId } = await ctx.params;
  if (!stampId) {
    const res = NextResponse.json({ error: 'stampId is required.' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  try {
    const result = await stampService.disputeStamp(
      userId,
      stampId,
      body.reason
    );
    const res = NextResponse.json(result, { status: 200 });
    return applyRateLimitHeaders(res, rl);
  } catch (err) {
    if (err instanceof StampNotFoundError) {
      const res = NextResponse.json({ error: err.message }, { status: 404 });
      return applyRateLimitHeaders(res, rl);
    }
    if (err instanceof StampForbiddenError) {
      const res = NextResponse.json({ error: err.message }, { status: 403 });
      return applyRateLimitHeaders(res, rl);
    }
    console.error('[passport/stamp/dispute] disputeStamp failed:', err);
    const res = NextResponse.json({ error: 'Internal error.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
}
