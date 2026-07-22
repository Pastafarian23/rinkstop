/**
 * PATCH /api/passport/stamp/[stampId]
 *
 * WS3 PR3 — Stamp visibility toggle.
 *
 * Body: { visibility: 'private' | 'public' }
 *
 * Auth: caller must be signed in (Clerk).
 * Gate: STAMPS_ENABLED must be true (per Workstream 1 Rule 5).
 *
 * Authorization (locked with Arnel 2026-07-22):
 *   - Self-scan stamps: holder (actor_user_id) may toggle
 *   - Coach→player stamps: subject_user_id may toggle; the coach who
 *     authored the stamp cannot toggle their own authored stamp
 *   - Anyone else: 403
 *
 * Implementation lives in stampService.updateStampVisibility. RLS is not
 * the trust boundary here — service-role writes are used so the service
 * can enforce the rule consistently across all stamp types. A future
 * hardening pass could move the rule to RLS, but v1 keeps it in app
 * logic for clarity.
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

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

interface PatchBody {
  visibility?: 'private' | 'public';
}

export async function PATCH(
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
  const rl = await checkRateLimit(`passport-stamp-vis:${ip}`, RATE_LIMIT);
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

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    const res = NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  if (body.visibility !== 'private' && body.visibility !== 'public') {
    const res = NextResponse.json(
      { error: 'visibility must be "private" or "public".' },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  const { stampId } = await ctx.params;
  if (!stampId) {
    const res = NextResponse.json({ error: 'stampId is required.' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  try {
    const visibility = await stampService.updateStampVisibility(
      userId,
      stampId,
      body.visibility
    );
    const res = NextResponse.json({ stampId, visibility }, { status: 200 });
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
    console.error('[passport/stamp PATCH] updateVisibility failed:', err);
    const res = NextResponse.json({ error: 'Internal error.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
}
