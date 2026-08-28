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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET = 'post-media';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXT_FOR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

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
      { error: 'Unsupported image type. Use JPEG, PNG, WebP, or GIF.' },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Image too large. Max 10 MB.' },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Empty file.' }, { status: 400 });
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

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return NextResponse.json({
    url: publicUrlData.publicUrl,
    width: Number.isFinite(width) ? width : null,
    height: Number.isFinite(height) ? height : null,
  });
}
