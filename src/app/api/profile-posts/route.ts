// src/app/api/profile-posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/profile-posts?user_id=xxx
// Anyone can read public profile posts
export async function GET(req: NextRequest) {
  const { userId: callerId } = await auth();
  const userId = req.nextUrl.searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('profile_posts')
    .select('id, body, media_url, created_at, updated_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

// POST /api/profile-posts
//
// Single-shot post creation. Accepts EITHER:
//
//   1. application/json with { body, media_url? }
//      — use when the client already has a media_url (e.g. legacy
//      flow that uploaded via /api/profile-posts/media first)
//   2. multipart/form-data with fields { body?, file? }
//      — use when uploading an image directly. The server uploads to
//      Supabase Storage and inserts the post in one round-trip —
//      significantly faster than the old two-POST flow.
//
// On 2026-08-28 we collapsed the two-step flow into one because users
// were seeing 5-10s of perceived latency between tapping Post and the
// new post appearing on their profile. The slowness was the second
// network round-trip + a full window.location.reload() on the profile
// page. Both fixed: single request, and ProfileFeed listens for the
// 'rinkstop:post-created' event to re-fetch without a reload.

const BUCKET = 'post-media';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXT_FOR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  let postBody = '';
  let mediaUrl: string | null = null;
  let mediaWidth: number | null = null;
  let mediaHeight: number | null = null;

  if (contentType.startsWith('multipart/form-data')) {
    // Single-shot: client uploaded the file directly with the post body.
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
    }

    postBody = (formData.get('body')?.toString() ?? '').trim();

    const file = formData.get('file');
    if (file instanceof File) {
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

      const widthRaw = formData.get('width');
      const heightRaw = formData.get('height');
      mediaWidth = typeof widthRaw === 'string' ? Number.parseInt(widthRaw, 10) || null : null;
      mediaHeight = typeof heightRaw === 'string' ? Number.parseInt(heightRaw, 10) || null : null;

      const ext = EXT_FOR_MIME[file.type];
      const storagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const uploadClient = createClient(supabaseUrl, supabaseServiceKey);

      const { error: uploadError } = await uploadClient.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          contentType: file.type,
          cacheControl: '31536000',
          upsert: false,
        });

      if (uploadError) {
        console.error('[profile-posts POST] storage upload failed:', uploadError.message);
        return NextResponse.json(
          { error: `Storage upload failed: ${uploadError.message}` },
          { status: 500 },
        );
      }

      const { data: publicUrlData } = uploadClient.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      mediaUrl = publicUrlData.publicUrl;
    }
  } else {
    // JSON: client already uploaded the image via the legacy
    // /api/profile-posts/media endpoint (kept for back-compat).
    let body: { body?: string; media_url?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    postBody = body.body?.trim() ?? '';
    mediaUrl = body.media_url?.trim() || null;
  }

  // Posts can be text-only, image-only, or both.
  if (!postBody && !mediaUrl) {
    return NextResponse.json(
      { error: 'A post needs a body or an image.' },
      { status: 400 },
    );
  }
  if (postBody.length > 1000) {
    return NextResponse.json(
      { error: 'body must be 1000 chars or fewer' },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from('profile_posts')
    .insert({ user_id: userId, body: postBody, media_url: mediaUrl })
    .select('id, body, media_url, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { data: { ...data, width: mediaWidth, height: mediaHeight } },
    { status: 201 },
  );
}
