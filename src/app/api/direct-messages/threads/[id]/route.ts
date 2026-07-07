/**
 * /api/direct-messages/threads/[id]
 *
 * Phase 1c-1.
 *
 * GET: load a thread with its messages. Marks messages from the OTHER user
 *   as read on the recipient side (the user opening the thread).
 *
 * Auth: must be signed in. RLS verifies thread participant.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId } from '@/lib/connections';
import {
  checkRateLimit,
  getClientIP,
  applyRateLimitHeaders,
  maybeCleanup,
} from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`dm-thread-get:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress || ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  const { id: threadId } = await params;
  if (!threadId) {
    const res = NextResponse.json({ error: 'id_required' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  // Load thread + verify participant
  const { data: thread, error: tErr } = await supabaseAdmin
    .from('direct_message_threads')
    .select('id, user_a_id, user_b_id, last_message_at, last_message_preview, created_at')
    .eq('id', threadId)
    .maybeSingle();
  if (tErr) {
    const res = NextResponse.json({ error: 'Could not load thread.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
  if (!thread) {
    const res = NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }
  if (thread.user_a_id !== userId && thread.user_b_id !== userId) {
    const res = NextResponse.json({ error: 'You are not a participant in this thread.' }, { status: 403 });
    return applyRateLimitHeaders(res, rl);
  }

  const otherUserId = thread.user_a_id === userId ? thread.user_b_id : thread.user_a_id;

  // Load messages
  const { data: messages, error: mErr } = await supabaseAdmin
    .from('direct_messages')
    .select('id, thread_id, sender_id, body, created_at, read_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (mErr) {
    const res = NextResponse.json({ error: 'Could not load messages.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  // Mark unread messages from the other user as read
  const unreadFromOther = (messages || []).filter(
    (m) => m.sender_id === otherUserId && m.read_at === null
  );
  if (unreadFromOther.length > 0) {
    const ids = unreadFromOther.map((m) => m.id);
    await supabaseAdmin
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids);
    // Reflect the read_at in the response
    for (const m of (messages || []) as any[]) {
      if (ids.includes(m.id)) m.read_at = new Date().toISOString();
    }
  }

  // Load other user's profile
  const { data: otherProfile } = await supabaseAdmin
    .from('profiles')
    .select('user_id, display_name, username, avatar_url')
    .eq('user_id', otherUserId)
    .maybeSingle();

  const res = NextResponse.json({
    ok: true,
    thread: {
      id: thread.id,
      other_user_id: otherUserId,
      other_user: otherProfile || null,
      last_message_at: thread.last_message_at,
      created_at: thread.created_at,
    },
    messages: messages || [],
  });
  return applyRateLimitHeaders(res, rl);
}
