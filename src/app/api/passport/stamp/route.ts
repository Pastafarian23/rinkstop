/**
 * POST /api/passport/stamp
 *
 * WS3 PR2 — Stamp creation endpoint.
 *
 * Body: CreateStampRequest (see src/lib/passport/types.ts)
 *   - qrIdentifier (required, opaque UUID)
 *   - subjectUserId (optional, only for third-party scans)
 *   - context (optional, only for third-party scans)
 *   - visibility (optional, defaults to 'private')
 *   - geoLat / geoLng (optional, only stored if the holder opted in on the
 *     confirmation page)
 *
 * Auth: caller must be signed in (Clerk).
 * Gate: STAMPS_ENABLED must be true (per Workstream 1 Rule 5).
 *
 * Responses:
 *   - 200: { stampId, targetType, targetName, visibility, alreadyStampedToday? }
 *   - 400: invalid request body
 *   - 401: not signed in
 *   - 403: feature flag off OR coach→player not linked OR forbidden actor type
 *   - 404: QR identifier doesn't resolve to an active target
 *   - 429: rate-limited (per IP)
 *
 * All scan attempts (success + failure) write a row to public.scan_events
 * for fraud analysis. Idempotent via partial unique index — same
 * (target, actor, day) is a no-op, surfaced as alreadyStampedToday=true.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { isStampsEnabled, stampService, StampNotFoundError, StampForbiddenError } from '@/lib/passport';
import type { CreateStampRequest, StampContext } from '@/lib/passport';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RATE_LIMIT = { maxRequests: 30, windowMs: 60 * 1000 };

const VALID_CONTEXTS: StampContext[] = ['practice', 'game', 'check-in', 'registration'];
const VALID_VISIBILITY = ['private', 'public'] as const;

function isValidContext(s: unknown): s is StampContext {
  return typeof s === 'string' && VALID_CONTEXTS.includes(s as StampContext);
}

function isValidVisibility(s: unknown): s is 'private' | 'public' {
  return typeof s === 'string' && (VALID_VISIBILITY as readonly string[]).includes(s);
}

function isValidCoord(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= -180 && n <= 180;
}

export async function POST(request: NextRequest) {
  if (!isStampsEnabled()) {
    return NextResponse.json(
      { error: 'Stamps are not enabled.' },
      { status: 403 }
    );
  }

  const ip = getClientIP(request);
  const rl = await checkRateLimit(`passport-stamp:${ip}`, RATE_LIMIT);
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

  let body: CreateStampRequest;
  try {
    body = (await request.json()) as CreateStampRequest;
  } catch {
    const res = NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  if (!body.qrIdentifier || typeof body.qrIdentifier !== 'string') {
    const res = NextResponse.json(
      { error: 'qrIdentifier is required.' },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  if (body.context !== undefined && !isValidContext(body.context)) {
    const res = NextResponse.json(
      { error: `Invalid context. Must be one of: ${VALID_CONTEXTS.join(', ')}.` },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  if (body.visibility !== undefined && !isValidVisibility(body.visibility)) {
    const res = NextResponse.json(
      { error: 'Invalid visibility. Must be "private" or "public".' },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  if (
    (body.geoLat !== undefined && !isValidCoord(body.geoLat)) ||
    (body.geoLng !== undefined && !isValidCoord(body.geoLng))
  ) {
    const res = NextResponse.json(
      { error: 'geoLat / geoLng must be numbers between -180 and 180.' },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  const userId = await resolveCanonicalUserId(session.userId, '');
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  try {
    const result = await stampService.createStamp(userId, body);
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
    console.error('[passport/stamp] createStamp failed:', err);
    const res = NextResponse.json(
      { error: 'Internal error.' },
      { status: 500 }
    );
    return applyRateLimitHeaders(res, rl);
  }
}
