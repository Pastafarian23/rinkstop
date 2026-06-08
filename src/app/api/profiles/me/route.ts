import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId } from '@/lib/connections';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RL = { maxRequests: 60, windowMs: 60 * 1000 };

// GET /api/profiles/me
// Returns the caller's profile (including tier, managed profiles, connections, unread count).
// This is the "current user snapshot" used by the dashboard layout to render tier badges, nav, etc.
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = checkRateLimit(ip, RL);
  maybeCleanup();

  const userId = await requireUserId();
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    // The Clerk webhook is eventually consistent — user signed in but profile row not yet created.
    // Return a synthetic "free" profile so the UI can render.
    return NextResponse.json({
      profile: {
        user_id: userId,
        display_name: null,
        avatar_url: null,
        bio: null,
        tier: 'free',
        tier_expires_at: null,
        subscription_status: null,
      },
      managedProfiles: [],
      pendingConnectionCount: 0,
      unreadMessageCount: 0,
    });
  }

  // Managed profiles.
  const { data: managed } = await supabaseAdmin
    .from('managed_profiles')
    .select('*')
    .eq('manager_user_id', userId);

  // Pending connection requests addressed to me.
  const { count: pendingConnCount } = await supabaseAdmin
    .from('connections')
    .select('id', { count: 'exact', head: true })
    .or(`user_low.eq.${userId},user_high.eq.${userId}`)
    .eq('status', 'pending')
    .neq('initiated_by', userId);

  // Unread messages: threads I participate in, messages not by me, not read.
  const { data: myConns } = await supabaseAdmin
    .from('connections')
    .select('id')
    .or(`user_low.eq.${userId},user_high.eq.${userId}`)
    .eq('status', 'accepted');
  let unreadMessageCount = 0;
  if (myConns && myConns.length > 0) {
    const connIds = myConns.map((c: any) => c.id);
    const { data: myThreads } = await supabaseAdmin
      .from('threads')
      .select('id')
      .in('connection_id', connIds);
    if (myThreads && myThreads.length > 0) {
      const threadIds = myThreads.map((t: any) => t.id);
      const { count } = await supabaseAdmin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('thread_id', threadIds)
        .is('read_at', null)
        .neq('sender_id', userId);
      unreadMessageCount = count || 0;
    }
  }

  return NextResponse.json({
    profile,
    managedProfiles: managed || [],
    pendingConnectionCount: pendingConnCount || 0,
    unreadMessageCount,
  });
}
