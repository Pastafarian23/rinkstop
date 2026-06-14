import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RL = { maxRequests: 60, windowMs: 60 * 1000 };  // 60 follows/min (user can unfollow rapidly)

const VALID_TYPES = ['player', 'team', 'rink', 'league', 'user'] as const;
type FolloweeType = (typeof VALID_TYPES)[number];

function isValidType(s: unknown): s is FolloweeType {
  return typeof s === 'string' && (VALID_TYPES as readonly string[]).includes(s);
}

// GET /api/follow?type=...&id=...
// Returns: { isFollowing: boolean, followersCount: number, followingCount?: number }
//
// The "followingCount" is included only when querying as a logged-in user
// against a `user` target — it counts what the *target user* follows. For
// the public web, we usually only need the followersCount + isFollowing.
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`follow-read:${ip}`, { maxRequests: 120, windowMs: 60 * 1000 });
  maybeCleanup();

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');
  if (!isValidType(type) || !id) {
    const res = NextResponse.json({ error: 'invalid_query', message: 'type and id required' }, { status: 400 });
    return applyRateLimitHeaders(res, result);
  }

  const { userId } = await auth();

  // Followers count for this target
  const { count: followersCount } = await supabaseAdmin
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('followee_type', type)
    .eq('followee_id', id);

  // Is the caller following this target?
  let isFollowing = false;
  if (userId) {
    const { data } = await supabaseAdmin
      .from('follows')
      .select('id')
      .eq('follower_user_id', userId)
      .eq('followee_type', type)
      .eq('followee_id', id)
      .maybeSingle();
    isFollowing = !!data;
  }

  const res = NextResponse.json({
    isFollowing,
    followersCount: followersCount ?? 0,
  });
  return applyRateLimitHeaders(res, result);
}

// POST /api/follow  { followee_type, followee_id }
// Idempotent: re-following just returns the existing row.
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`follow-write:${ip}`, RL);
  maybeCleanup();

  const { userId } = await auth();
  if (!userId) {
    const res = NextResponse.json({ error: 'unauthorized', message: 'Sign in to follow.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  let body: { followee_type?: string; followee_id?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  if (!isValidType(body.followee_type) || !body.followee_id) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (body.followee_type === 'user' && body.followee_id === userId) {
    return NextResponse.json({ error: 'cannot_follow_self' }, { status: 400 });
  }

  // Upsert (no unique conflict because of (follower_user_id, followee_type, followee_id) unique).
  // If the row already exists, the insert returns it; if it doesn't, it creates.
  const { data, error } = await supabaseAdmin
    .from('follows')
    .upsert(
      { follower_user_id: userId, followee_type: body.followee_type, followee_id: body.followee_id },
      { onConflict: 'follower_user_id,followee_type,followee_id', ignoreDuplicates: true }
    )
    .select('id')
    .maybeSingle();
  if (error) {
    // FK violation means the target doesn't exist (e.g. fake user_id)
    console.error('[follow POST] failed', error);
    return NextResponse.json({ error: 'follow_failed', message: error.message }, { status: 500 });
  }

  // Recompute count for the client
  const { count: followersCount } = await supabaseAdmin
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('followee_type', body.followee_type)
    .eq('followee_id', body.followee_id);

  return NextResponse.json({ ok: true, followId: data?.id ?? null, followersCount: followersCount ?? 0 });
}

// DELETE /api/follow?type=...&id=...   OR   body: { followee_type, followee_id }
export async function DELETE(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`follow-write:${ip}`, RL);
  maybeCleanup();

  const { userId } = await auth();
  if (!userId) {
    const res = NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  let followeeType: string | null = null;
  let followeeId: string | null = null;
  const url = new URL(request.url);
  followeeType = url.searchParams.get('type');
  followeeId = url.searchParams.get('id');
  if (!followeeType || !followeeId) {
    try {
      const body = await request.json();
      followeeType = body.followee_type ?? null;
      followeeId = body.followee_id ?? null;
    } catch {/* no body, that's fine */}
  }
  if (!isValidType(followeeType) || !followeeId) {
    return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('follows')
    .delete()
    .eq('follower_user_id', userId)
    .eq('followee_type', followeeType)
    .eq('followee_id', followeeId);
  if (error) {
    console.error('[follow DELETE] failed', error);
    return NextResponse.json({ error: 'unfollow_failed' }, { status: 500 });
  }

  const { count: followersCount } = await supabaseAdmin
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('followee_type', followeeType)
    .eq('followee_id', followeeId);

  return NextResponse.json({ ok: true, followersCount: followersCount ?? 0 });
}
