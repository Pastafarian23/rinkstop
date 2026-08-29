// src/app/api/profile-posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/profile-posts?user_id=xxx&target_type=team&target_id=yyy&sport=zzz
// Public read is allowed; membership-aware feeds should be protected
// separately in the page/route layer if needed.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id');
  const targetType = req.nextUrl.searchParams.get('target_type');
  const targetId = req.nextUrl.searchParams.get('target_id');
  const sport = req.nextUrl.searchParams.get('sport');

  const query = supabaseAdmin
    .from('profile_posts')
    .select('id, body, media_url, created_at, updated_at, target_type, target_id, user_id, sport')
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

  if (sport) {
    query.eq('sport', sport);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

// POST /api/profile-posts
//
// Single-shot post creation. Accepts EITHER:
//
//   1. application/json with { body, media_url?, target_type?, target_id?, sport? }
//      — use when the client already has a media_url.
//   2. multipart/form-data with fields { body?, file?, target_type?, target_id?, sport? }
//      — use when uploading an image directly. The server uploads to
//      Supabase Storage and inserts the post in one round-trip.

const BUCKET = 'post-media';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXT_FOR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const ALLOWED_TARGET_TYPES = new Set(['user', 'team', 'league']);
const ALLOWED_SPORTS = new Set(['hockey', 'figure_skating', 'speed_skating', 'basketball', 'soccer', 'baseball', 'other']);

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
    const { data, error } = await supabaseAdmin
      .from('team_workspaces')
      .select('id, claimed_by_user_id, visibility')
      .eq('id', targetId)
      .maybeSingle();

    if (error || !data) {
      throw new Error('Team not found.');
    }

    const isOwner = data.claimed_by_user_id === userId;
    if (!isOwner) {
      throw new Error('You can only post to teams you manage.');
    }

    return { targetType: 'team', targetId: data.id };
  }

  if (type === 'league') {
    const { data, error } = await supabaseAdmin
      .from('leagues')
      .select('id, created_by')
      .eq('id', targetId)
      .maybeSingle();

    if (error || !data) {
      throw new Error('League not found.');
    }

    const isOwner = data.created_by === userId;
    if (!isOwner) {
      throw new Error('You can only post to leagues you manage.');
    }

    return { targetType: 'league', targetId: data.id };
  }

  throw new Error('Unsupported target_type.');
}

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
  let targetType: string | null = null;
  let targetId: string | null = null;
  let sport: string | null = null;

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
    let body: { body?: string; media_url?: string; target_type?: string; target_id?: string; sport?: string };
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
  }

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
  if (sport && !ALLOWED_SPORTS.has(sport)) {
    return NextResponse.json(
      { error: 'Invalid sport.' },
      { status: 400 },
    );
  }

  let resolved: { targetType: string; targetId: string };
  try {
    resolved = await resolveAuthorizedTarget(userId, targetType, targetId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid destination.';
    const status = message.includes('not found') ? 404 : message.includes('only post') ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const { data, error } = await supabaseAdmin
    .from('profile_posts')
    .insert({
      user_id: userId,
      body: postBody,
      media_url: mediaUrl,
      target_type: resolved.targetType,
      target_id: resolved.targetId,
      sport: sport,
    })
    .select('id, body, media_url, created_at, updated_at, target_type, target_id, user_id, sport')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { data: { ...data, width: mediaWidth, height: mediaHeight } },
    { status: 201 },
  );
}
