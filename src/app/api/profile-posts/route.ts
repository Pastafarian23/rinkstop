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

  const postBody = body.body?.trim();
  if (!postBody || postBody.length > 1000) {
    return NextResponse.json({ error: 'body must be 1–1000 chars' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('profile_posts')
    .insert({ user_id: userId, body: postBody, media_url: body.media_url ?? null })
    .select('id, body, media_url, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
