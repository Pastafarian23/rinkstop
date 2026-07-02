import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId, getUserTier } from '@/lib/connections';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email';

const RL_READ    = { maxRequests: 30, windowMs: 60 * 1000 };
const RL_SEND    = { maxRequests: 30, windowMs: 60 * 1000 };

interface ThreadRow {
  id: string;
  connection_id: string;
  context_profile_type: string | null;
  context_profile_id: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
}

interface ConnectionRow {
  id: string;
  user_low: string;
  user_high: string;
  status: string;
}

/**
 * Verify the caller is a participant in the thread's connection, and return both rows.
 * Returns null if the thread doesn't exist or the caller is not a participant.
 */
async function getThreadForUser(threadId: string, userId: string): Promise<{ thread: ThreadRow; connection: ConnectionRow } | null> {
  const { data: thread } = await supabaseAdmin
    .from('threads')
    .select('*')
    .eq('id', threadId)
    .maybeSingle();
  if (!thread) return null;

  const { data: connection } = await supabaseAdmin
    .from('connections')
    .select('*')
    .eq('id', (thread as ThreadRow).connection_id)
    .maybeSingle();
  if (!connection) return null;

  const conn = connection as ConnectionRow;
  if (conn.user_low !== userId && conn.user_high !== userId) {
    return null; // not a participant
  }
  if (conn.status !== 'accepted' && conn.status !== 'blocked') {
    return null;
  }
  if (conn.status === 'blocked') {
    return null; // block state hides the thread
  }
  return { thread: thread as ThreadRow, connection: conn };
}

// GET /api/threads/[id]/messages?before=<iso>&limit=50
// Returns messages in a thread, oldest first. Marks unread messages addressed to the caller as read.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ip = getClientIP(request);
  const result = await checkRateLimit(`messages:${ip}`, RL_READ);
  maybeCleanup();

  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress || ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  const lookup = await getThreadForUser(id, userId);
  if (!lookup) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  const url = new URL(request.url);
  const before = url.searchParams.get('before'); // ISO timestamp
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 100);

  let q = supabaseAdmin
    .from('messages')
    .select('*')
    .eq('thread_id', id);
  if (before) {
    q = q.lt('created_at', before);
  }
  const { data: messages, error } = await q.order('created_at', { ascending: false }).limit(limit);

  if (error) {
    console.error('[messages GET] failed', error);
    return NextResponse.json({ error: 'Failed to load messages.' }, { status: 500 });
  }

  // Mark unread messages addressed to the caller as read.
  const now = new Date().toISOString();
  await supabaseAdmin
    .from('messages')
    .update({ read_at: now })
    .eq('thread_id', id)
    .is('read_at', null)
    .neq('sender_id', userId);

  // Hydrate with sender profile (display_name, avatar).
  const senderIds = Array.from(new Set((messages || []).map((m: any) => m.sender_id)));
  let profileMap: Record<string, any> = {};
  if (senderIds.length > 0) {
    const { data: profileRows } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, avatar_url, tier')
      .in('user_id', senderIds);
    for (const p of profileRows || []) profileMap[p.user_id] = p;
  }
  const enriched = (messages || []).map((m: any) => ({
    ...m,
    sender: profileMap[m.sender_id] || { user_id: m.sender_id, display_name: null, avatar_url: null, tier: 'free' },
  }));

  const res = NextResponse.json({
    thread: lookup.thread,
    connection: lookup.connection,
    otherUserId: lookup.connection.user_low === userId ? lookup.connection.user_high : lookup.connection.user_low,
    messages: enriched.reverse(), // oldest first
  });
  return applyRateLimitHeaders(res, result);
}

// POST /api/threads/[id]/messages
// Body: { body: string }
// Sends a message in a thread. Sender must be Verified+ and a participant.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ip = getClientIP(request);
  const result = await checkRateLimit(`messages:${ip}`, RL_SEND);
  maybeCleanup();

  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress || ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  const lookup = await getThreadForUser(id, userId);
  if (!lookup) {
    return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
  }

  // Tier check: Identity Plus (personal) or Business Plus (business) required to send messages.
  // Connection requests are gated at /api/connections, but we re-check here
  // so users who somehow got into the thread without proper tier are blocked.
  const tier = await getUserTier(userId);
  // Personal: Identity Plus+ (or legacy pro). Business: Business Listing+ (or legacy business_pro).
  const canSendMessage = tierAtLeastSameTrack(tier, 'identity_plus') || tierAtLeastSameTrack(tier, 'business_listing');
  if (!canSendMessage) {
    return NextResponse.json(
      { error: 'Identity Plus or Business Plus membership required to send messages.', currentTier: tier },
      { status: 403 }
    );
  }

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const text = (body.body || '').trim();
  if (!text) {
    return NextResponse.json({ error: 'Message body required.' }, { status: 400 });
  }
  if (text.length > 5000) {
    return NextResponse.json({ error: 'Message too long (5000 char max).' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      thread_id: id,
      sender_id: userId,
      body: text,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[messages POST] insert failed', error);
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 });
  }

  // Update thread's last_message_at and preview.
  await supabaseAdmin
    .from('threads')
    .update({ last_message_at: now, last_message_preview: text.slice(0, 100) })
    .eq('id', id);

  // Email the other party (best-effort, async, never blocks).
  // Skipped if:
  //  - the other party has email_dm_notifications = false
  //  - they have no email on file
  //  - the connection is blocked (defensive — shouldn't even reach here)
  const conn = lookup.connection;
  const otherUserId = conn.user_low === userId ? conn.user_high : conn.user_low;
  if (conn.status === 'accepted') {
    void (async () => {
      try {
        const { data: recipient } = await supabaseAdmin
          .from('profiles')
          .select('user_id, email, display_name, username, email_dm_notifications')
          .eq('user_id', otherUserId)
          .maybeSingle();
        if (!recipient?.email) return;
        if (recipient.email_dm_notifications === false) return;

        const { data: sender } = await supabaseAdmin
          .from('profiles')
          .select('user_id, display_name, username')
          .eq('user_id', userId)
          .maybeSingle();
        const senderName = sender?.display_name || sender?.username || 'Someone';

        await sendEmail({
          to: recipient.email,
          subject: `New message from ${senderName}`,
          template: 'dm-notification',
          data: {
            senderName,
            senderUsername: sender?.username ?? null,
            preview: text.slice(0, 200),
            threadId: id,
          },
          tag: 'dm',
        });
      } catch (err) {
        console.warn('[messages POST] email fanout failed:', err);
      }
    })();
  }

  const res = NextResponse.json({ message });
  return applyRateLimitHeaders(res, result);
}
