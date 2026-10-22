// src/app/api/profile-posts/media/route.ts
// Image upload endpoint for profile posts.
//
// Pattern mirrors /api/profile/cover-image/route.ts:
//   - multipart/form-data with a `file` field
//   - validate MIME (jpeg/png/webp/gif), size (10 MB cap)
//   - upload to Supabase Storage under posts/{user_id}/{timestamp}.{ext}
//   - return { url, width, height } so the client can attach to a post
//
// Bucket: post-media (must exist in Supabase Storage with public-read).
// Width/height come from the uploaded image's natural dimensions via
// the browser (sent as form fields after the client computes them).
// Server doesn't decode the image — we trust the client's reported
// dimensions for the metadata. Width/height are advisory for the
// feed rendering hint (aspect-ratio CSS).
//
// 2026-08-28: shipped with the image-upload feature. Video deferred
// to a follow-up phase (see LEDGER.md).

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { registerAsset } from '@/lib/media-ledger';
import { checkMediaUpload, getMediaAllowance } from '@/lib/media-entitlements';
import { getMediaEntitlementForUser, pickBetterAllowance } from '@/lib/media-usage';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl || 'https://placeholder.invalid', supabaseServiceKey || 'placeholder');

const BUCKET = 'post-media';
// Bucket-level hard cap for a single social-post asset (matches the Supabase
// bucket's own file_size_limit, which remains the authoritative backstop for
// direct-to-Storage uploads that bypass this route).
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB — video is allowed here

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
]);
const EXT_FOR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/**
 * Upper bound on a client-reported video duration we accept.
 *
 * Matches the bound in /api/profile-posts. There is no ffprobe in the Vercel
 * runtime, so duration is measured in the browser and validated here.
 */
const MAX_PLAUSIBLE_VIDEO_SECONDS = 4 * 60 * 60;

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to upload an image.' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported media type. Use JPEG, PNG, WebP, GIF, MP4, WebM, or MOV.' },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${Math.round(MAX_BYTES / 1024 / 1024)} MB.` },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Empty file.' }, { status: 400 });
  }

  // UNIFIED MEDIA ALLOWANCE CHECK
  //
  // This endpoint was missing it entirely. It validates MIME type and per-file
  // size, uploads, registers the asset in the ledger — but never consulted the
  // shared allowance, so it was an unmetered path into a quota-governed bucket.
  // A user could fill their whole pool (and beyond, by extension) through this
  // route while the settings screen showed a compliant figure.
  //
  // This is the same class of gap just closed for player-media, profile_covers
  // and listing-photos. It is the FOURTH, which is why it is worth stating
  // plainly: `post-media` appeared covered because /api/profile-posts enforces
  // the quota, but this sibling endpoint writes to the SAME bucket and did not.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier, org_tier')
    .eq('user_id', userId)
    .maybeSingle();
  const tier = (profile?.tier as string) ?? 'free';
  const orgTier = (profile?.org_tier as string) ?? 'org_free';
  const { usage: mediaUsage, allowance: mediaAllowance, negotiated } =
    await getMediaEntitlementForUser(
      userId,
      tier,
      pickBetterAllowance(getMediaAllowance(tier), getMediaAllowance(orgTier)),
    );

  if (negotiated) {
    return NextResponse.json(
      { error: 'This account is on negotiated capacity. Contact support@rinkstop.com to add media.', code: 'negotiated_review' },
      { status: 403 },
    );
  }

  const isVideo = file.type.startsWith('video/');
  const durationRaw = formData.get('durationSeconds');
  const durationParsed = typeof durationRaw === 'string' ? Number.parseFloat(durationRaw) : NaN;
  const decision = checkMediaUpload(
    mediaAllowance,
    {
      sizeBytes: file.size,
      isVideo,
      durationSeconds:
        Number.isFinite(durationParsed) && durationParsed > 0 && durationParsed <= MAX_PLAUSIBLE_VIDEO_SECONDS
          ? durationParsed
          : null,
    },
    mediaUsage,
  );
  if (!decision.allowed) {
    console.warn('[profile-posts/media] allowance blocked', JSON.stringify({
      userId, tier, orgTier, code: decision.code, used: mediaUsage,
    }));
    return NextResponse.json(
      { error: decision.message, code: decision.code },
      { status: decision.code === 'video_not_allowed' ? 403 : 413 },
    );
  }

  // Width/height are advisory. The client computes them with a hidden
  // <img> before upload and sends them as form fields. We don't trust
  // them for storage policy — just store them in the response so the
  // feed renderer can pick an aspect-ratio CSS without a reflow.
  const widthRaw = formData.get('width');
  const heightRaw = formData.get('height');
  const width = typeof widthRaw === 'string' ? Number.parseInt(widthRaw, 10) : NaN;
  const height = typeof heightRaw === 'string' ? Number.parseInt(heightRaw, 10) : NaN;

  const ext = EXT_FOR_MIME[file.type];
  const storagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '31536000', // 1 year — images are immutable once uploaded
      upsert: false,
    });

  if (uploadError) {
    console.error('[profile-posts/media POST] storage upload failed:', uploadError.message);
    // Surface the actual Supabase error so the client can debug.
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadError.message}` },
      { status: 500 },
    );
  }

  // Register the object in the quota ledger BEFORE returning the URL.
  //
  // This row starts with zero references (no post points at it yet). The post
  // creation route attaches the reference. An upload that is never attached —
  // user abandons the composer — therefore becomes reapable after the grace
  // window instead of silently consuming quota forever. That was the original
  // leak: the bucket walk counted abandoned uploads and there was no way to
  // tell them apart from live ones.
  //
  // Fails soft inside registerAsset: if the ledger write fails, the upload still
  // succeeds and the bucket-walk fallback in media-usage.ts still measures it.
  await registerAsset({
    bucket: BUCKET,
    objectPath: `${BUCKET}/${storagePath}`,
    ownerUserId: userId,
    bytes: file.size,
    mimeType: file.type,
  });

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return NextResponse.json({
    url: publicUrlData.publicUrl,
    width: Number.isFinite(width) ? width : null,
    height: Number.isFinite(height) ? height : null,
  });
}
