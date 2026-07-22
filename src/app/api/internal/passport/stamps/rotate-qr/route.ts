/**
 * POST /api/internal/passport/stamps/rotate-qr
 *
 * WS3 PR4 — Admin-only QR rotation endpoint.
 *
 * Body: {
 *   targetType: 'rink' | 'venue' | 'event',
 *   targetId: string,
 *   reason: string,
 * }
 *
 * Auth: admin or super_admin only. Uses getAdminFromRequest() which checks
 * Clerk publicMetadata.role → Supabase profiles.role → OWNER_EMAILS fallback.
 *
 * Gate: STAMPS_ENABLED must be true (per Workstream 1 Rule 5). The admin
 * feature flag STAMPS_ENABLED is the same gate that the holder-facing stamp
 * endpoints use — keeps the rollout knob single.
 *
 * Behavior (see stampService.rotateQr for details):
 *   - Generates new qr_identifier / public_id
 *   - Updates the target row
 *   - Inserts audit row in public.qr_revocations
 *   - Returns { targetType, oldQr, newQr } so the admin UI can show before/
 *     after identifiers for the operator to update their printed QR signs.
 *
 * Existing stamps stay valid (per WS3 plan: 'don't punish holders for venue
 * compromise'). The QR resolver falls through to the deactivated page for
 * old identifiers automatically.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
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

const RATE_LIMIT = { maxRequests: 30, windowMs: 60 * 1000 };

const VALID_TARGET_TYPES = ['rink', 'venue', 'event'] as const;

interface RotateBody {
  targetType?: string;
  targetId?: string;
  reason?: string;
}

export async function POST(request: NextRequest) {
  if (!isStampsEnabled()) {
    return NextResponse.json(
      { error: 'Stamps are not enabled.' },
      { status: 403 }
    );
  }

  const adminResult = await getAdminFromRequest();
  if ('response' in adminResult) {
    return adminResult.response;
  }
  const admin = adminResult.admin;

  const ip = getClientIP(request);
  const rl = await checkRateLimit(`passport-rotate-qr:${ip}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  let body: RotateBody;
  try {
    body = (await request.json()) as RotateBody;
  } catch {
    const res = NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  if (
    !body.targetType ||
    !(VALID_TARGET_TYPES as readonly string[]).includes(body.targetType)
  ) {
    const res = NextResponse.json(
      {
        error: `targetType must be one of: ${VALID_TARGET_TYPES.join(', ')}.`,
      },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  if (!body.targetId || typeof body.targetId !== 'string') {
    const res = NextResponse.json(
      { error: 'targetId is required.' },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  if (!body.reason || typeof body.reason !== 'string' || body.reason.length < 3) {
    const res = NextResponse.json(
      { error: 'reason is required (min 3 chars).' },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, rl);
  }
  if (body.reason.length > 500) {
    const res = NextResponse.json(
      { error: 'reason must be 500 characters or less.' },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  try {
    const result = await stampService.rotateQr({
      targetType: body.targetType as 'rink' | 'venue' | 'event',
      targetId: body.targetId,
      reason: body.reason,
      revokedByUserId: admin.userId,
    });
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
    console.error('[passport/stamps/rotate-qr] failed:', err);
    const res = NextResponse.json({ error: 'Internal error.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
}
