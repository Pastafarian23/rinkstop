import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
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
// Creates a new profile post. Requires auth.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { body?: string; media_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const postBody = body.body?.trim() ?? '';
  const mediaUrl = body.media_url?.trim() || null;

  // Posts can be text-only, image-only, or both. Reject only if both
  // are missing, or if text exceeds the 1000-char cap.
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

  // DB schema still has NOT NULL on body — pass empty string when image-only
  // so the existing constraint holds. The CHECK constraint now allows empty
  // body when media_url is set (see migration 2026-08-28_image_only_posts.sql).
  const { data, error } = await supabaseAdmin
    .from('profile_posts')
    .insert({ user_id: userId, body: postBody, media_url: mediaUrl })
    .select('id, body, media_url, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
