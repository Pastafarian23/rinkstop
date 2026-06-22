import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId, getUserTier, tierAtLeast, normalizePair, getConnectionBetween } from '@/lib/connections';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RL = { maxRequests: 30, windowMs: 60 * 1000 };

// GET /api/threads
// Lists the caller's DM threads, sorted by last_message_at DESC.
// Returns the other party's profile, context profile (if any), and unread count.
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`threads:${ip}`, RL);
  maybeCleanup();

  const userId = await requireUserId();
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in to view messages.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  // Step 1: get all of the caller's accepted connections.
  const { data: connections, error: connErr } = await supabaseAdmin
    .from('connections')
    .select('id, user_low, user_high')
    .or(`user_low.eq.${userId},user_high.eq.${userId}`)
    .eq('status', 'accepted');

  if (connErr) {
    console.error('[threads GET] connections query failed', connErr);
    return NextResponse.json({ error: 'Failed to load threads.' }, { status: 500 });
  }

  if (!connections || connections.length === 0) {
    const res = NextResponse.json({ threads: [] });
    return applyRateLimitHeaders(res, result);
  }

  const connectionIds = connections.map((c: any) => c.id);

  // Step 2: get all threads for those connections.
  const { data: threads, error: thErr } = await supabaseAdmin
    .from('threads')
    .select('*')
    .in('connection_id', connectionIds)
    .order('last_message_at', { ascending: false });

  if (thErr) {
    console.error('[threads GET] threads query failed', thErr);
    return NextResponse.json({ error: 'Failed to load threads.' }, { status: 500 });
  }

  if (!threads || threads.length === 0) {
    const res = NextResponse.json({ threads: [] });
    return applyRateLimitHeaders(res, result);
  }

  // Step 3: hydrate with the other party's profile and unread counts.
  const otherUserIds = connections
    .filter((c: any) => true)
    .map((c: any) => (c.user_low === userId ? c.user_high : c.user_low));
  const { data: profileRows } = await supabaseAdmin
    .from('profiles')
    .select('user_id, display_name, avatar_url, tier')
    .in('user_id', otherUserIds);
  const profileMap: Record<string, any> = {};
  for (const p of profileRows || []) profileMap[p.user_id] = p;

  // Unread count per thread: messages where read_at IS NULL and sender_id != caller.
  const threadIds = threads.map((t: any) => t.id);
  const { data: unreadRows } = await supabaseAdmin
    .from('messages')
    .select('thread_id')
    .in('thread_id', threadIds)
    .is('read_at', null)
    .neq('sender_id', userId);
  const unreadByThread: Record<string, number> = {};
  for (const r of unreadRows || []) {
    unreadByThread[r.thread_id] = (unreadByThread[r.thread_id] || 0) + 1;
  }

  const connById: Record<string, any> = {};
  for (const c of connections) connById[c.id] = c;

  const enriched = (threads as any[]).map((t) => {
    const conn = connById[t.connection_id];
    const otherId = conn.user_low === userId ? conn.user_high : conn.user_low;
    return {
      ...t,
      otherUser: profileMap[otherId] || { user_id: otherId, display_name: null, avatar_url: null, tier: 'free' },
      unreadCount: unreadByThread[t.id] || 0,
    };
  });

  const res = NextResponse.json({ threads: enriched });
  return applyRateLimitHeaders(res, result);
}

// POST /api/threads
// Body: { recipientId, contextProfileType?, contextProfileId? }
// Creates a thread (or returns the existing one for the same connection + context).
// Sender must be Roster+ (starter/family_plus). For Roster, recipient must be a coach/manager
// of a team the sender's claimed kid is rostered on. Pro+ can DM anyone (operator use case).
// Recipient must be in an accepted connection.
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`threads:${ip}`, RL);
  maybeCleanup();

  const userId = await requireUserId();
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in to start a conversation.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  let body: { recipientId?: string; contextProfileType?: string; contextProfileId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!body.recipientId || typeof body.recipientId !== 'string') {
    return NextResponse.json({ error: 'recipientId required.' }, { status: 400 });
  }
  if (body.recipientId === userId) {
    return NextResponse.json({ error: 'Cannot message yourself.' }, { status: 400 });
  }

  // Tier check: Roster+ allowed (parent path). Pro+ can DM anyone. Roster can only DM coaches
  // of teams their claimed kid is on (checked below after we have recipientId).
  const tier = await getUserTier(userId);
  const tierRank: Record<string, number> = { free: 0, starter: 1, family_plus: 1, pro: 2, premium: 3, enterprise: 4 };
  const isRosterOnly = (tierRank[tier] ?? 0) === 1; // starter or family_plus, NOT pro+

  if (!tierAtLeast(tier, 'starter')) {
    return NextResponse.json(
      { error: 'Roster membership required to send messages.', currentTier: tier },
      { status: 403 }
    );
  }

  // Verify an accepted connection exists.
  const conn = await getConnectionBetween(userId, body.recipientId);
  if (!conn || conn.status !== 'accepted') {
    return NextResponse.json({ error: 'You must be connected with this user to message them.' }, { status: 403 });
  }
  const connection = conn;

  // For Roster users: verify the recipient is a coach/team_manager of a team that
  // one of the sender's claimed kids is rostered on. Pro+ users skip this check.
  if (isRosterOnly) {
    const { data: senderKids } = await supabaseAdmin
      .from('managed_profiles')
      .select('profile_id')
      .eq('manager_user_id', userId)
      .eq('profile_type', 'player');

    const senderKidIds = (senderKids || []).map((k: any) => k.profile_id);

    if (senderKidIds.length === 0) {
      return NextResponse.json(
        { error: 'You must claim at least one kid\'s player profile before messaging coaches.', currentTier: tier },
        { status: 403 }
      );
    }

    // Find teams where any of the sender's kids are rostered.
    const { data: teamRosters } = await supabaseAdmin
      .from('team_rosters')
      .select('team_id')
      .in('player_id', senderKidIds);

    const teamIds = Array.from(new Set((teamRosters || []).map((r: any) => r.team_id)));

    if (teamIds.length === 0) {
      return NextResponse.json(
        { error: 'None of your claimed kids are rostered on any team. You can only DM coaches of teams your kids are on.', currentTier: tier },
        { status: 403 }
      );
    }

    // Verify the recipient is a coach/team_manager of any of those teams.
    const { data: recipientMemberships } = await supabaseAdmin
      .from('team_memberships')
      .select('team_id, role')
      .eq('user_id', body.recipientId)
      .in('team_id', teamIds);

    const isCoachOrManager = (recipientMemberships || []).some((m: any) =>
      m.role === 'coach' || m.role === 'manager' || m.role === 'head_coach' || m.role === 'team_manager'
    );

    if (!isCoachOrManager) {
      return NextResponse.json(
        { error: 'Roster members can only DM coaches or team managers of teams your kid is on.', currentTier: tier },
        { status: 403 }
      );
    }
  }

  // Validate context profile if provided.
  const validProfileTypes = ['player', 'team', 'league', 'rink'];
  if (body.contextProfileType && !validProfileTypes.includes(body.contextProfileType)) {
    return NextResponse.json({ error: 'Invalid contextProfileType.' }, { status: 400 });
  }
  if (body.contextProfileType && !body.contextProfileId) {
    return NextResponse.json({ error: 'contextProfileId required when contextProfileType is set.' }, { status: 400 });
  }

  // Upsert: if a thread with the same (connection_id, contextProfileType, contextProfileId) exists, return it.
  const { data: thread, error: thErr } = await supabaseAdmin
    .from('threads')
    .upsert(
      {
        connection_id: connection.id,
        context_profile_type: body.contextProfileType ?? null,
        context_profile_id: body.contextProfileId ?? null,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'connection_id,context_profile_type,context_profile_id', ignoreDuplicates: false }
    )
    .select('*')
    .single();

  if (thErr) {
    console.error('[threads POST] failed', thErr);
    return NextResponse.json({ error: 'Failed to start thread.' }, { status: 500 });
  }

  const res = NextResponse.json({ thread });
  return applyRateLimitHeaders(res, result);
}
