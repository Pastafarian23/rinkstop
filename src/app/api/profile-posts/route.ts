import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const ALLOWED_METHODS = ['GET', 'POST'];

// GET /api/profile-posts?user_id=<uuid> — public, returns posts for a user
// POST /api/profile-posts           — auth required, create a post
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id');
  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('profile_posts')
    .select('id, body, media_url, created_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { body?: string; media_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const postBody = (body.body ?? '').trim();
  if (!postBody || postBody.length > 1000) {
    return NextResponse.json(
      { error: 'body must be 1–1000 characters' },
      { status: 400 }
    );
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('profile_posts')
    .insert({ user_id: clerkUserId, body: postBody, media_url: body.media_url?.trim() || null })
    .select('id, body, media_url, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
