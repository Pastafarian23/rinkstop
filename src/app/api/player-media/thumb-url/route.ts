/**
 * /api/player-media/thumb-url
 *
 * Phase 1b-3 helper. Issues a 60-second signed URL for a single storage path
 * (used by the gallery thumbnail fetcher to avoid GET-ing the whole media row).
 *
 * Auth + parental-link gate via the path's first segment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { requireUserId } from '@/lib/connections';
import {
  checkRateLimit,
  getClientIP,
  applyRateLimitHeaders,
  maybeCleanup,
} from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SIGNED_URL_TTL_SECONDS = 60;

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`player-media-thumb:${ip}`, { maxRequests: 120, windowMs: 60 * 1000 });
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  if (!path) {
    const res = NextResponse.json({ error: 'path_required' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }
  if (path.includes('..')) {
    const res = NextResponse.json({ error: 'path_traversal_not_allowed' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  const playerId = path.split('/')[0];
  if (!playerId) {
    const res = NextResponse.json({ error: 'invalid_path' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  const { data: link } = await supabaseAdmin
    .from('managed_profiles')
    .select('id')
    .eq('manager_user_id', userId)
    .eq('profile_id', playerId)
    .eq('profile_type', 'player')
    .maybeSingle();
  if (!link) {
    const res = NextResponse.json(
      { error: 'You do not manage this player.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  const { data: signed, error } = await supabaseAdmin.storage
    .from('player-media')
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !signed) {
    const isMissing = (error?.message || '').toLowerCase().includes('not found');
    const res = NextResponse.json(
      { error: isMissing ? 'file_missing' : 'sign_failed', message: error?.message },
      { status: isMissing ? 410 : 500 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  const res = NextResponse.json({ ok: true, url: signed.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS });
  return applyRateLimitHeaders(res, rl);
}
