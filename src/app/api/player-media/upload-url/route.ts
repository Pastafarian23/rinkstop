/**
 * /api/player-media/upload-url
 *
 * Phase 1b-3 helper. Issues a signed upload URL so the browser can PUT
 * a media file directly to the player-media bucket without going through
 * the Vercel function size limit (100 MB cap, but Vercel has a 4.5 MB
 * body limit on serverless functions).
 *
 * Flow:
 *   1. Client requests a signed upload URL with a target path
 *   2. Server validates the path matches the player_id the parent manages
 *   3. Server issues a Supabase signed upload URL
 *   4. Client PUTs the file to that URL
 *   5. Client submits metadata (caption, dimensions, etc.) to /api/player-media
 *
 * Returns: { ok, upload_url, path, token }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId } from '@/lib/connections';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';
import { isAccountType } from '@/components/dashboard/dashboardTypes';
import {
  checkRateLimit,
  getClientIP,
  applyRateLimitHeaders,
  maybeCleanup,
} from '@/lib/rateLimit';

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

function tierOk(tier: string | null | undefined): boolean {
  return (
    tierAtLeastSameTrack(tier, 'identity_plus') ||
    tierAtLeastSameTrack(tier, 'business_listing')
  );
}

function badRequest(error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status: 400 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`player-media-upload-url:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress || ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    const res = badRequest('invalid_json');
    return applyRateLimitHeaders(res, rl);
  }

  const playerId = body?.player_id;
  const path = body?.path;
  const size = body?.size;
  const mime = body?.mime;

  if (typeof playerId !== 'string' || !playerId) {
    const res = badRequest('player_id_required');
    return applyRateLimitHeaders(res, rl);
  }
  if (typeof path !== 'string' || !path) {
    const res = badRequest('path_required');
    return applyRateLimitHeaders(res, rl);
  }
  if (typeof size !== 'number' || size <= 0 || size > MAX_BYTES) {
    const res = badRequest('invalid_size', { max: MAX_BYTES });
    return applyRateLimitHeaders(res, rl);
  }
  if (typeof mime !== 'string') {
    const res = badRequest('mime_required');
    return applyRateLimitHeaders(res, rl);
  }

  // Path safety: must start with {player_id}/ and must not contain ".."
  if (!path.startsWith(`${playerId}/`)) {
    const res = badRequest('path_must_start_with_player_id', { player_id: playerId });
    return applyRateLimitHeaders(res, rl);
  }
  if (path.includes('..')) {
    const res = badRequest('path_traversal_not_allowed');
    return applyRateLimitHeaders(res, rl);
  }

  // Gates
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();
  if (!tierOk((profile?.tier as string) ?? 'free')) {
    const res = NextResponse.json(
      { error: 'Uploading player media requires Hockey Passport Plus or higher.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  const { data: types } = await supabaseAdmin
    .from('profile_account_types')
    .select('account_type')
    .eq('user_id', userId);
  const isParent = (types || []).some(
    (r: { account_type: string }) => isAccountType(r.account_type) && r.account_type === 'parent'
  );
  if (!isParent) {
    const res = NextResponse.json(
      { error: 'Only parents can upload player media.' },
      { status: 403 }
    );
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

  // Issue a signed upload URL (60s expiry — enough time to PUT the file)
  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from('player-media')
    .createSignedUploadUrl(path);

  if (signErr || !signed) {
    console.error('[player-media upload-url] failed:', signErr);
    const res = NextResponse.json(
      { error: signErr?.message || 'Failed to issue upload URL' },
      { status: 500 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  const res = NextResponse.json({
    ok: true,
    upload_url: signed.signedUrl,
    path: signed.path,
    token: signed.token,
  });
  return applyRateLimitHeaders(res, rl);
}
