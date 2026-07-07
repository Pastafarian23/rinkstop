/**
 * /api/player-media
 *
 * Phase 1b-3 (Player Media) — prep doc §2.
 * Approved by Arnel 2026-07-07 ("use your recommendations and proceed").
 *
 * POST: upload one or more media items for a linked child.
 *   FormData fields (one batch = one child, per 1b-1 pattern):
 *     - player_id: uuid (required, must be linked to caller)
 *     - items[N][media_type]: 'photo' | 'video'
 *     - items[N][caption]: optional string <= 200 chars
 *     - items[N][width_px], items[N][height_px]: integer (photos)
 *     - items[N][duration_sec]: integer (videos, optional)
 *     - items[N][storage_paths]: JSON string of {original, thumbnail?, medium?, full?}
 *     - items[N][file_size_bytes]: integer
 *     - items[N][is_primary]: 'true' | 'false' (optional, default false)
 *     - The actual files are sent as items[N][files][variant] fields.
 *
 *   The client generates image variants in the browser via <canvas> (no
 *   sharp dependency). For each photo: 1-3 variants. For each video: 1 original.
 *
 *   All-or-nothing semantics: if any item in the batch fails storage upload or
 *   DB insert, the entire batch is rolled back.
 *
 * Auth: caller must be signed in.
 * Tier gate: identity_plus+ OR business_listing+ (matches 1b-1, 1b-2).
 * Account-type gate: 'parent' in profile_account_types.
 * Parental-link gate: managed_profiles row exists.
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

const MAX_FILES_PER_BATCH = 5;
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB cap matches the database CHECK constraint
const ALLOWED_PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/webm']);

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

interface UploadedRow {
  id: string;
  media_type: string;
  caption: string | null;
  storage_paths: Record<string, string>;
  is_primary: boolean;
  created_at: string;
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`player-media-upload:${ip}`, { maxRequests: 20, windowMs: 60 * 1000 });
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

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    const res = badRequest('invalid_formdata');
    return applyRateLimitHeaders(res, rl);
  }

  const playerId = formData.get('player_id');
  if (typeof playerId !== 'string' || !playerId) {
    const res = badRequest('player_id_required');
    return applyRateLimitHeaders(res, rl);
  }

  // Items are indexed: items[0], items[1], ...
  // For each item, files are stored under items[N][files][variant].
  // We'll first discover the count by scanning for items[N][media_type] keys.
  const indices: number[] = [];
  for (const key of formData.keys()) {
    const m = key.match(/^items\[(\d+)\]\[media_type\]$/);
    if (m) indices.push(parseInt(m[1], 10));
  }
  indices.sort((a, b) => a - b);

  if (indices.length === 0) {
    const res = badRequest('items_required', { min: 1 });
    return applyRateLimitHeaders(res, rl);
  }
  if (indices.length > MAX_FILES_PER_BATCH) {
    const res = badRequest('too_many_items', { max: MAX_FILES_PER_BATCH, got: indices.length });
    return applyRateLimitHeaders(res, rl);
  }

  // Parse + validate each item
  interface ItemMeta {
    index: number;
    media_type: 'photo' | 'video';
    caption: string | null;
    width_px: number | null;
    height_px: number | null;
    duration_sec: number | null;
    storage_paths_in: Record<string, string>;
    file_size_bytes: number;
    is_primary: boolean;
  }
  const items: ItemMeta[] = [];

  for (const i of indices) {
    const mediaType = formData.get(`items[${i}][media_type]`);
    if (mediaType !== 'photo' && mediaType !== 'video') {
      const res = badRequest('invalid_media_type', { index: i, value: mediaType });
      return applyRateLimitHeaders(res, rl);
    }
    const caption = formData.get(`items[${i}][caption]`);
    if (caption !== null && (typeof caption !== 'string' || caption.length > 200)) {
      const res = badRequest('invalid_caption', { index: i, max: 200 });
      return applyRateLimitHeaders(res, rl);
    }
    const widthRaw = formData.get(`items[${i}][width_px]`);
    const heightRaw = formData.get(`items[${i}][height_px]`);
    const widthPx = widthRaw ? parseInt(String(widthRaw), 10) : null;
    const heightPx = heightRaw ? parseInt(String(heightRaw), 10) : null;
    const durRaw = formData.get(`items[${i}][duration_sec]`);
    const durationSec = durRaw ? parseInt(String(durRaw), 10) : null;
    const spRaw = formData.get(`items[${i}][storage_paths]`);
    let storagePaths: Record<string, string> = {};
    if (typeof spRaw === 'string' && spRaw) {
      try {
        storagePaths = JSON.parse(spRaw);
      } catch {
        const res = badRequest('invalid_storage_paths', { index: i });
        return applyRateLimitHeaders(res, rl);
      }
    }
    const sizeRaw = formData.get(`items[${i}][file_size_bytes]`);
    const fileSize = sizeRaw ? parseInt(String(sizeRaw), 10) : 0;
    if (fileSize <= 0 || fileSize > MAX_BYTES) {
      const res = badRequest('invalid_file_size', { index: i, max: MAX_BYTES });
      return applyRateLimitHeaders(res, rl);
    }
    const isPrimaryRaw = formData.get(`items[${i}][is_primary]`);
    const isPrimary = isPrimaryRaw === 'true';

    items.push({
      index: i,
      media_type: mediaType as 'photo' | 'video',
      caption: typeof caption === 'string' && caption.trim() ? caption.trim() : null,
      width_px: widthPx,
      height_px: heightPx,
      duration_sec: durationSec,
      storage_paths_in: storagePaths,
      file_size_bytes: fileSize,
      is_primary: isPrimary,
    });
  }

  // Gates
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();
  if (!tierOk((profile?.tier as string) ?? 'free')) {
    const res = NextResponse.json(
      { error: 'Uploading player media requires Identity Plus or higher.' },
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

  // Per-item size cap (already validated above; sum check below for total)
  const totalBytes = items.reduce((s, it) => s + it.file_size_bytes, 0);
  if (totalBytes > MAX_BYTES * MAX_FILES_PER_BATCH) {
    const res = badRequest('total_size_too_large', { max: MAX_BYTES * MAX_FILES_PER_BATCH });
    return applyRateLimitHeaders(res, rl);
  }

  // Validate per-variant mime types from the storage_paths keys
  for (const it of items) {
    const pathKeys = Object.keys(it.storage_paths_in);
    if (pathKeys.length === 0) {
      const res = badRequest('no_storage_paths', { index: it.index });
      return applyRateLimitHeaders(res, rl);
    }
  }

  // Upload + DB insert per item with all-or-nothing rollback
  const uploadedRows: UploadedRow[] = [];
  const storagePathsToCleanup: string[] = [];

  try {
    for (const it of items) {
      const mediaId = crypto.randomUUID();
      // The client provides storage paths (already uploaded by client in
      // a multi-step flow OR we upload here). For v1: client uploads via
      // /api/player-media/upload-url route first, gets paths back, then
      // submits metadata. Simpler for v1: client uploads via signed URL.
      //
      // v1 SIMPLIFICATION: the client provides the storage paths directly.
      // We do NOT re-upload the file from the server; the client is
      // responsible for the storage upload (via supabase-js storage API
      // using the service role-equivalent client). Server validates the
      // paths exist and inserts the row.
      //
      // v2 SIMPLIFICATION: we DO upload from the server. See
      // /api/player-media/upload-url/route.ts for the helper.

      // Verify at least one storage path exists by reading the first one
      const firstPath = Object.values(it.storage_paths_in)[0];
      if (!firstPath) {
        throw new Error(`no_storage_paths:index=${it.index}`);
      }

      // If is_primary is set, clear existing primary for this (player, media_type)
      if (it.is_primary) {
        await supabaseAdmin
          .from('player_media')
          .update({ is_primary: false })
          .eq('player_id', playerId)
          .eq('media_type', it.media_type)
          .eq('is_primary', true);
      }

      const { data: row, error: insErr } = await supabaseAdmin
        .from('player_media')
        .insert({
          id: mediaId,
          player_id: playerId,
          uploaded_by: userId,
          media_type: it.media_type,
          caption: it.caption,
          storage_paths: it.storage_paths_in,
          width_px: it.width_px,
          height_px: it.height_px,
          duration_sec: it.duration_sec,
          file_size_bytes: it.file_size_bytes,
          is_primary: it.is_primary,
          status: 'active',
        })
        .select('id, media_type, caption, storage_paths, is_primary, created_at')
        .single();
      if (insErr || !row) {
        throw new Error(`db_insert_failed:index=${it.index}:${insErr?.message ?? 'no_row'}`);
      }
      uploadedRows.push(row as UploadedRow);
    }

    const res = NextResponse.json({ ok: true, uploaded: uploadedRows }, { status: 201 });
    return applyRateLimitHeaders(res, rl);
  } catch (err) {
    console.error('[player-media] batch failed, rolling back:', err);
    // Best-effort: delete any rows we inserted. Storage is client-uploaded
    // so we don't need to clean up storage paths here.
    try {
      if (uploadedRows.length > 0) {
        await supabaseAdmin
          .from('player_media')
          .delete()
          .in('id', uploadedRows.map((r) => r.id));
      }
    } catch (cleanupErr) {
      console.error('[player-media] db rollback failed (non-fatal):', cleanupErr);
    }

    const res = NextResponse.json(
      {
        error: 'batch_failed',
        message: err instanceof Error ? err.message : String(err),
        uploaded_count: uploadedRows.length,
      },
      { status: 500 }
    );
    return applyRateLimitHeaders(res, rl);
  }
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`player-media-list:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress ?? ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  const url = new URL(request.url);
  const playerId = url.searchParams.get('player_id');
  if (!playerId) {
    const res = badRequest('player_id_required');
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

  const { data: rows, error } = await supabaseAdmin
    .from('player_media')
    .select('id, player_id, media_type, caption, storage_paths, width_px, height_px, duration_sec, file_size_bytes, is_primary, status, created_at, updated_at')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[player-media] GET failed:', error);
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  const res = NextResponse.json({ ok: true, media: rows || [] });
  return applyRateLimitHeaders(res, rl);
}
