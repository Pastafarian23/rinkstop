/**
 * /api/player-media/[id]
 *
 * Phase 1b-3.
 *
 * GET: mint 60-second signed URLs for all storage paths in the media row.
 *
 * PATCH: edit a single media item (caption, is_primary, archive status).
 *
 * No DELETE in v1 (matches 1b-1, 1b-2 destructive-action protocol).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId } from '@/lib/connections';
import {
  checkRateLimit,
  getClientIP,
  applyRateLimitHeaders,
  maybeCleanup,
} from '@/lib/rateLimit';

const SIGNED_URL_TTL_SECONDS = 60;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function badRequest(error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status: 400 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`player-media-get:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
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

  const { id: mediaId } = await params;
  if (!mediaId) {
    const res = badRequest('id_required');
    return applyRateLimitHeaders(res, rl);
  }

  const { data: media, error: mediaErr } = await supabaseAdmin
    .from('player_media')
    .select('id, player_id, storage_paths, status')
    .eq('id', mediaId)
    .maybeSingle();
  if (mediaErr) {
    const res = NextResponse.json({ error: 'Could not load media.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
  if (!media) {
    const res = NextResponse.json({ error: 'Media not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }
  if (media.status === 'archived') {
    const res = NextResponse.json({ error: 'Media is archived.' }, { status: 410 });
    return applyRateLimitHeaders(res, rl);
  }

  const { data: link } = await supabaseAdmin
    .from('managed_profiles')
    .select('id')
    .eq('manager_user_id', userId)
    .eq('profile_id', media.player_id)
    .eq('profile_type', 'player')
    .maybeSingle();
  if (!link) {
    const res = NextResponse.json(
      { error: 'You do not manage this player.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  // Mint signed URLs for each variant path
  const paths = (media.storage_paths || {}) as Record<string, string>;
  const urls: Record<string, string> = {};
  for (const [variant, path] of Object.entries(paths)) {
    if (!path) continue;
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from('player-media')
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signErr || !signed) {
      console.error('[player-media GET] signed URL failed for variant', variant, signErr);
      continue;
    }
    urls[variant] = signed.signedUrl;
  }

  const res = NextResponse.json({
    ok: true,
    id: media.id,
    urls,
    expires_in: SIGNED_URL_TTL_SECONDS,
  });
  return applyRateLimitHeaders(res, rl);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`player-media-edit:${ip}`, { maxRequests: 30, windowMs: 60 * 1000 });
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

  const { id: mediaId } = await params;
  if (!mediaId) {
    const res = badRequest('id_required');
    return applyRateLimitHeaders(res, rl);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    const res = badRequest('invalid_json');
    return applyRateLimitHeaders(res, rl);
  }

  const { data: media, error: mediaErr } = await supabaseAdmin
    .from('player_media')
    .select('id, player_id, media_type, status')
    .eq('id', mediaId)
    .maybeSingle();
  if (mediaErr) {
    const res = NextResponse.json({ error: 'Could not load media.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
  if (!media) {
    const res = NextResponse.json({ error: 'Media not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }

  const { data: link } = await supabaseAdmin
    .from('managed_profiles')
    .select('id')
    .eq('manager_user_id', userId)
    .eq('profile_id', media.player_id)
    .eq('profile_type', 'player')
    .maybeSingle();
  if (!link) {
    const res = NextResponse.json(
      { error: 'You do not manage this player.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body?.caption !== undefined) {
    if (body.caption !== null && (typeof body.caption !== 'string' || body.caption.length > 200)) {
      const res = badRequest('invalid_caption', { max: 200 });
      return applyRateLimitHeaders(res, rl);
    }
    update.caption = typeof body.caption === 'string' && body.caption.trim() ? body.caption.trim() : null;
  }
  if (body?.is_primary === true) {
    // Clear existing primary for this (player, media_type), then set this one
    await supabaseAdmin
      .from('player_media')
      .update({ is_primary: false })
      .eq('player_id', media.player_id)
      .eq('media_type', media.media_type)
      .eq('is_primary', true);
    update.is_primary = true;
  } else if (body?.is_primary === false) {
    update.is_primary = false;
  }
  if (body?.archive === true) {
    update.status = 'archived';
    update.archived_at = new Date().toISOString();
  } else if (body?.archive === false) {
    update.status = 'active';
    update.archived_at = null;
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from('player_media')
    .update(update)
    .eq('id', mediaId)
    .select('id, caption, is_primary, status, updated_at')
    .single();
  if (updErr || !updated) {
    console.error('[player-media PATCH] failed:', updErr);
    const res = NextResponse.json({ error: updErr?.message || 'Update failed' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  const res = NextResponse.json({ ok: true, media: updated });
  return applyRateLimitHeaders(res, rl);
}
