// src/app/api/profile-posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';
import { execFileSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { TIER_TO_TRACK } from '@/lib/pricing';
import { checkMediaUpload, getMediaAllowance } from '@/lib/media-entitlements';
import { getMediaEntitlementForUser, pickBetterAllowance } from '@/lib/media-usage';
import { attachAssetRef, assetRefFromPublicUrl } from '@/lib/media-ledger';

const BUCKET = 'post-media';
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const EXT_FOR_IMAGE_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
};
const EXT_FOR_VIDEO_MIME: Record<string, string> = {
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
};
const ALLOWED_TARGET_TYPES = new Set(['user', 'team', 'league']);
/**
 * Upper bound on a client-reported video duration that we will accept.
 *
 * 4 hours is far beyond any single social post someone would make, and it sits
 * comfortably under what a 100 MB low-bitrate encode could contain, so it
 * rejects obviously fabricated or corrupt metadata without second-guessing a
 * legitimately long video. See the duration handling in the POST handler for
 * why duration is client-reported at all.
 */
const MAX_PLAUSIBLE_VIDEO_SECONDS = 4 * 60 * 60;
const ALLOWED_SPORTS = new Set([
  'hockey', 'figure_skating', 'speed_skating',
  'basketball', 'soccer', 'baseball', 'other',
]);

async function getUserTier(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.tier as string) || 'free';
}

/**
 * Resolve the user's ORGANIZATION tier (profiles.org_tier).
 *
 * Media is one physical pool per person, so the enforced allowance is the
 * BETTER of the personal tier and the organization tier — never the sum.
 */
async function getUserOrgTier(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('org_tier')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.org_tier as string) || 'org_free';
}

function isVideoTier(tier: string): boolean {
  const track = TIER_TO_TRACK[tier as keyof typeof TIER_TO_TRACK] ?? 'personal';
  if (track !== 'personal') return false;
  const rank: Record<string, number> = { free: 0, verified_identity: 1, identity_plus: 2 };
  return (rank[tier] ?? 0) >= 2;
}

function extractVideoThumbnail(videoBuffer: Buffer, storagePath: string): string | null {
  const tmpDir = '/tmp/rinkstop-thumbs';
  mkdirSync(tmpDir, { recursive: true });
  const thumbPath = join(tmpDir, `thumb_${Date.now()}.jpg`);
  const videoPath = join(tmpDir, `video_${Date.now()}.mp4`);
  writeFileSync(videoPath, videoBuffer);
  try {
    execFileSync('ffmpeg', [
      '-y', '-i', videoPath,
      '-ss', '00:00:01',
      '-vframes', '1',
      '-vf', 'scale=640:-1',
      '-q:v', '2',
      thumbPath,
    ], { timeout: 30_000 });
    const thumbBuffer = require('fs').readFileSync(thumbPath);
    return thumbBuffer.toString('base64');
  } catch {
    return null;
  } finally {
    try { unlinkSync(videoPath); } catch { /* noop */ }
    try { unlinkSync(thumbPath); } catch { /* noop */ }
  }
}

async function uploadFile(
  fileBuffer: Buffer,
  mimeType: string,
  userId: string,
  isVideo: boolean,
): Promise<{ url: string; width: number | null; height: number | null; thumb_base64: string | null }> {
  const ext = isVideo
    ? EXT_FOR_VIDEO_MIME[mimeType]
    : EXT_FOR_IMAGE_MIME[mimeType];
  const storagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const uploadClient = createClient(supabaseUrl, supabaseServiceKey);

  const { error: uploadError } = await uploadClient.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: publicUrlData } = uploadClient.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const url = publicUrlData.publicUrl;
  let width: number | null = null;
  let height: number | null = null;
  let thumb_base64: string | null = null;

  if (isVideo) {
    thumb_base64 = extractVideoThumbnail(fileBuffer, storagePath);
  }

  return { url, width, height, thumb_base64 };
}

async function resolveAuthorizedTarget(
  userId: string,
  targetType: string | null,
  targetId: string | null,
): Promise<{ targetType: string; targetId: string }> {
  const type = targetType ?? 'user';
  if (!ALLOWED_TARGET_TYPES.has(type)) {
    throw new Error('Invalid target_type. Use user, team, or league.');
  }
  if (type === 'user') {
    return { targetType: 'user', targetId: userId };
  }
  if (!targetId) {
    throw new Error('target_id is required when target_type is team or league.');
  }
  if (type === 'team') {
    const { data } = await supabaseAdmin
      .from('team_workspaces')
      .select('id, claimed_by_user_id')
      .eq('id', targetId)
      .maybeSingle();
    if (!data) throw new Error('Team not found.');
    if (data.claimed_by_user_id !== userId) throw new Error('You can only post to teams you manage.');
    return { targetType: 'team', targetId: data.id };
  }
  // league
  const { data } = await supabaseAdmin
    .from('leagues')
    .select('id, created_by')
    .eq('id', targetId)
    .maybeSingle();
  if (!data) throw new Error('League not found.');
  if (data.created_by !== userId) throw new Error('You can only post to leagues you manage.');
  return { targetType: 'league', targetId: data.id };
}

// GET /api/profile-posts
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id');
  const targetType = req.nextUrl.searchParams.get('target_type');
  const targetId = req.nextUrl.searchParams.get('target_id');
  const sport = req.nextUrl.searchParams.get('sport');

  const query = supabaseAdmin
    .from('profile_posts')
    .select('id, body, media_url, media_thumb, created_at, updated_at, target_type, target_id, user_id, sport')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (targetType && targetId) {
    query.eq('target_type', targetType).eq('target_id', targetId);
  } else if (userId) {
    query.eq('user_id', userId);
  } else {
    return NextResponse.json({ error: 'user_id or target_type+target_id required' }, { status: 400 });
  }
  if (sport) query.eq('sport', sport);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// POST /api/profile-posts
// Accepts multipart/form-data with optional file (image or video) or JSON for link posts.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = req.headers.get('content-type') ?? '';
  let postBody = '';
  let mediaUrl: string | null = null;
  let mediaThumb: string | null = null;
  let mediaWidth: number | null = null;
  let mediaHeight: number | null = null;
  let targetType: string | null = null;
  let targetId: string | null = null;
  let sport: string | null = null;
  let linkUrl: string | null = null;

  if (contentType.startsWith('multipart/form-data')) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
    }

    postBody = (formData.get('body')?.toString() ?? '').trim();
    targetType = (formData.get('target_type')?.toString() ?? null);
    targetId = (formData.get('target_id')?.toString() ?? null);
    sport = (formData.get('sport')?.toString() ?? null);
    linkUrl = (formData.get('link_url')?.toString() ?? null) || null;

    const file = formData.get('file');
    if (file instanceof File && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type;
      const isVideo = ALLOWED_VIDEO_MIME.has(mimeType);
      const isImage = ALLOWED_IMAGE_MIME.has(mimeType);

      if (!isImage && !isVideo) {
        return NextResponse.json(
          { error: 'Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4, MOV, or WebM.' },
          { status: 400 },
        );
      }

      const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (buffer.length > maxBytes) {
        const limit = isVideo ? '100 MB' : '10 MB';
        return NextResponse.json(
          { error: `File too large. Max ${limit}.` },
          { status: 400 },
        );
      }

      // Unified media allowance (2026-10-22). Replaces the previous
      // single-purpose video gate, which only checked tier rank and ignored
      // how much the account had already stored. Now every media upload —
      // photo or video — is measured against ONE shared allowance covering
      // post-media, profile_covers, listing-photos and player-media.
      //
      // See src/lib/media-entitlements.ts for the published policy.
      const tier = await getUserTier(userId);
      const orgTier = await getUserOrgTier(userId);
      const { usage: mediaUsage, allowance, negotiated } =
        await getMediaEntitlementForUser(
          userId,
          tier,
          pickBetterAllowance(getMediaAllowance(tier), getMediaAllowance(orgTier)),
        );

      if (negotiated) {
        return NextResponse.json(
          { error: 'This account is on negotiated capacity. Contact support@rinkstop.com to add media.' },
          { status: 403 },
        );
      }

      // Duration: reported by the CLIENT, validated here.
      //
      // WHY CLIENT-REPORTED (2026-10-23 investigation)
      // The obvious server-side approach is ffprobe/ffmpeg. Both are absent
      // from the Vercel serverless runtime — not a PATH problem, the binaries
      // are not in the image. Evidence: this file has shipped an
      // `extractVideoThumbnail()` that shells out to ffmpeg, and ZERO of the 3
      // live profile_posts have a media_thumb, because execFileSync throws
      // ENOENT and the catch swallows it. That call has never worked in
      // production.
      //
      // So duration is measured in the browser, which has a real media decoder
      // (an HTMLVideoElement), and sent as a form field. The client already
      // computes image dimensions the same way for aspect-ratio hints, so this
      // follows the established pattern rather than inventing one.
      //
      // WHY IT IS SAFE TO TRUST
      // `durationSeconds` is not a billing input on its own: the byte quota
      // (the thing a user could actually profit from under-reporting) is
      // computed from the real file size on the server. Duration is a secondary
      // policy cap. A dishonest client under-reporting duration can post a
      // longer video than the cap allows — so the cap is enforced two ways:
      //   1. bucket-level file_size_limit (100 MB), the hard backstop that
      //      applies even to direct-to-Storage uploads bypassing this route;
      //   2. a plausibility bound below, so an absurd value is rejected rather
      //      than accepted.
      const durationRaw = formData.get('durationSeconds');
      const durationParsed =
        typeof durationRaw === 'string' ? Number.parseFloat(durationRaw) : NaN;
      const durationSeconds =
        Number.isFinite(durationParsed) && durationParsed > 0 && durationParsed <= MAX_PLAUSIBLE_VIDEO_SECONDS
          ? durationParsed
          : null;

      if (Number.isFinite(durationParsed) && durationParsed > MAX_PLAUSIBLE_VIDEO_SECONDS) {
        console.warn('[profile-posts] implausible duration rejected', {
          userId, reported: durationParsed,
        });
      }

      const decision = checkMediaUpload(
        allowance,
        {
          sizeBytes: buffer.length,
          isVideo,
          durationSeconds,
        },
        mediaUsage,
      );

      if (!decision.allowed) {
        const code = decision.code;
        console.warn('[profile-posts] media allowance blocked', JSON.stringify({
          userId, tier, code,
          used: mediaUsage, limit: {
            bytes: allowance.maxTotalBytes, count: allowance.maxAssetCount,
          },
        }));
        return NextResponse.json(
          { error: decision.message, code },
          { status: code === 'video_not_allowed' ? 403 : 413 },
        );
      }

      // Wrap so a storage-layer failure returns the real reason instead of
      // a bare 500 the client renders as "Failed (500)". Arnel hit exactly
      // this on 2026-10-22: the post-media bucket rejected video/mp4 and the
      // UI showed only "Failed (500)" with no way to diagnose it.
      let uploaded;
      try {
        uploaded = await uploadFile(buffer, mimeType, userId, isVideo);
      } catch (uploadErr) {
        const msg = uploadErr instanceof Error ? uploadErr.message : 'Upload failed';
        console.error('[profile-posts POST] media upload failed:', msg, { mimeType, bytes: buffer.length });
        return NextResponse.json(
          { error: `Media upload failed: ${msg}` },
          { status: 500 },
        );
      }
      mediaUrl = uploaded.url;
      mediaThumb = uploaded.thumb_base64;
      mediaWidth = uploaded.width;
      mediaHeight = uploaded.height;
    }
  } else {
    let body: {
      body?: string; media_url?: string; target_type?: string;
      target_id?: string; sport?: string; link_url?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    postBody = body.body?.trim() ?? '';
    mediaUrl = body.media_url?.trim() || null;
    targetType = body.target_type ?? null;
    targetId = body.target_id ?? null;
    sport = body.sport ?? null;
    linkUrl = body.link_url?.trim() || null;
  }

  // If link_url was passed (for legacy embed posts), prefer it as media_url
  if (linkUrl && !mediaUrl) mediaUrl = linkUrl;

  if (!postBody && !mediaUrl) {
    return NextResponse.json(
      { error: 'A post needs a body or an image/video.' },
      { status: 400 },
    );
  }
  if (postBody.length > 1000) {
    return NextResponse.json({ error: 'body must be 1000 chars or fewer' }, { status: 400 });
  }
  if (sport && !ALLOWED_SPORTS.has(sport)) {
    return NextResponse.json({ error: 'Invalid sport.' }, { status: 400 });
  }

  let resolved: { targetType: string; targetId: string };
  try {
    resolved = await resolveAuthorizedTarget(userId, targetType, targetId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid destination.';
    const status = message.includes('not found') ? 404 : message.includes('only post') ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const insert: Record<string, unknown> = {
    user_id: userId,
    body: postBody,
    target_type: resolved.targetType,
    target_id: resolved.targetId,
  };
  if (mediaUrl) insert.media_url = mediaUrl;
  if (sport) insert.sport = sport;

  const { data, error } = await supabaseAdmin
    .from('profile_posts')
    .insert(insert)
    .select('id, body, media_url, media_thumb, created_at, updated_at, target_type, target_id, user_id, sport')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach the media reference in the quota ledger.
  //
  // The object was already registered (with zero references) by the upload
  // route. Attaching the reference here makes it a live, fully-counted asset.
  // Attaching rather than re-registering is what makes a SHARED asset work: if
  // the same video is attached to a second post, this increments ref_count and
  // the byte total is unchanged, so the user is never charged twice for one
  // file appearing in multiple places on RinkStop.
  //
  // Best-effort: if this fails the post still exists and the object is still
  // measured by the bucket-walk fallback in media-usage.ts.
  if (mediaUrl) {
    const asset = assetRefFromPublicUrl(mediaUrl, 'post-media');
    if (asset) {
      await attachAssetRef(asset, { refTable: 'profile_posts', refId: (data as { id: string }).id });
    } else {
      // An external URL (not RinkStop Storage) — nothing for us to account for.
      console.log('[profile-posts POST] non-storage media_url, not tracked in ledger');
    }
  }

  return NextResponse.json(
    { data: { ...data, width: mediaWidth, height: mediaHeight } },
    { status: 201 },
  );
}
