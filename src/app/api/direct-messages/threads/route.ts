/**
 * /api/direct-messages/threads
 *
 * Phase 1c-1 (Advanced Messaging).
 *
 * GET: list the current user's threads, sorted by last_message_at desc.
 *   Returns: { ok: true, threads: [{ id, other_user_id, other_user: {...},
 *                                   last_message_at, last_message_preview,
 *                                   unread_count }] }
 *
 * POST: create or find a thread with another user, then send the first message.
 *   Body: { recipient_user_id, body }
 *   Returns: { ok: true, thread_id, message }
 *
 * Tier gate: the SENDER must be on Hockey Passport Plus+ or Business Plus+ (matches
 *   the "Advanced messaging" promise on /pricing). Receiving is free.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId } from '@/lib/connections';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';
import {
  checkRateLimit,
  getClientIP,
  applyRateLimitHeaders,
  maybeCleanup,
} from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Phase 1c-1 tier gate — per Arnel 2026-07-07 correction: ALL paid tiers can
// send direct messages. Hockey Passport ($24.99/yr) is the floor. The
// 'advanced' features (group DMs, attachments) are v2 and will gate at
// Hockey Passport Plus+ / Business Plus+ separately. For now, basic 1:1 DMs are
// available to every tier that has spent money.
function canDM(tier: string | null | undefined): boolean {
  return (
    tierAtLeastSameTrack(tier, 'verified_identity') ||
    tierAtLeastSameTrack(tier, 'business_listing')
  );
}

function badRequest(error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`dm-threads-list:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
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

  // Find threads where the user is a participant.
  // RLS will filter to only the user's threads, but we also filter explicitly
  // for safety against the service-role connection.
  const { data: threads, error } = await supabaseAdmin
    .from('direct_message_threads')
    .select('id, user_a_id, user_b_id, last_message_at, last_message_preview, created_at')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error) {
    console.error('[dm-threads] GET failed:', error);
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  // Compute unread count per thread (count of messages from the OTHER user
  // that are unread).
  const threadIds = (threads || []).map((t) => t.id);
  const unreadByThread: Record<string, number> = {};
  if (threadIds.length > 0) {
    const { data: unreadMsgs } = await supabaseAdmin
      .from('direct_messages')
      .select('thread_id')
      .in('thread_id', threadIds)
      .is('read_at', null)
      .neq('sender_id', userId);
    for (const m of (unreadMsgs || []) as Array<{ thread_id: string }>) {
      unreadByThread[m.thread_id] = (unreadByThread[m.thread_id] || 0) + 1;
    }
  }

  // Build the response with the other user info
  const otherUserIds = (threads || []).map((t) => (t.user_a_id === userId ? t.user_b_id : t.user_a_id));
  let profilesById: Record<string, { display_name: string | null; username: string | null; avatar_url: string | null }> = {};
  if (otherUserIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, username, avatar_url')
      .in('user_id', otherUserIds);
    for (const p of (profiles || []) as any[]) {
      profilesById[p.user_id] = {
        display_name: p.display_name ?? null,
        username: p.username ?? null,
        avatar_url: p.avatar_url ?? null,
      };
    }
  }

  const result = (threads || []).map((t) => {
    const otherUserId = t.user_a_id === userId ? t.user_b_id : t.user_a_id;
    return {
      id: t.id,
      other_user_id: otherUserId,
      other_user: profilesById[otherUserId] || null,
      last_message_at: t.last_message_at,
      last_message_preview: t.last_message_preview,
      unread_count: unreadByThread[t.id] || 0,
    };
  });

  const res = NextResponse.json({ ok: true, threads: result });
  return applyRateLimitHeaders(res, rl);
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`dm-send:${ip}`, { maxRequests: 30, windowMs: 60 * 1000 });
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

  let body: any;
  try {
    body = await request.json();
  } catch {
    const res = badRequest('invalid_json');
    return applyRateLimitHeaders(res, rl);
  }

  const recipientUserId = body?.recipient_user_id;
  const messageBody = body?.body;

  if (typeof recipientUserId !== 'string' || !recipientUserId) {
    const res = badRequest('recipient_user_id_required');
    return applyRateLimitHeaders(res, rl);
  }
  if (recipientUserId === userId) {
    const res = badRequest('cannot_dm_self');
    return applyRateLimitHeaders(res, rl);
  }
  if (typeof messageBody !== 'string' || messageBody.trim().length < 1 || messageBody.length > 5000) {
    const res = badRequest('invalid_body', { min: 1, max: 5000 });
    return applyRateLimitHeaders(res, rl);
  }

  // Tier gate on the SENDER
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();
  if (!canDM((profile?.tier as string) ?? 'free')) {
    const res = NextResponse.json(
      { error: 'Direct messaging requires a paid tier (Hockey Passport or higher).', code: 'tier_required' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  // Verify recipient exists
  const { data: recipient } = await supabaseAdmin
    .from('profiles')
    .select('user_id')
    .eq('user_id', recipientUserId)
    .maybeSingle();
  if (!recipient) {
    const res = badRequest('recipient_not_found');
    return applyRateLimitHeaders(res, rl);
  }

  // Canonical pair
  const [a, b] = [userId, recipientUserId].sort();
  if (a === b) {
    const res = badRequest('cannot_dm_self');
    return applyRateLimitHeaders(res, rl);
  }

  // Find-or-create thread
  let threadId: string;
  const { data: existing } = await supabaseAdmin
    .from('direct_message_threads')
    .select('id')
    .eq('user_a_id', a)
    .eq('user_b_id', b)
    .maybeSingle();
  if (existing) {
    threadId = existing.id;
  } else {
    const { data: created, error: tErr } = await supabaseAdmin
      .from('direct_message_threads')
      .insert({ user_a_id: a, user_b_id: b, last_message_preview: messageBody.slice(0, 200) })
      .select('id')
      .single();
    if (tErr || !created) {
      // Race condition: another request created the thread between our SELECT
      // and INSERT. Re-fetch.
      if (tErr?.code === '23505') {
        const { data: retry } = await supabaseAdmin
          .from('direct_message_threads')
          .select('id')
          .eq('user_a_id', a)
          .eq('user_b_id', b)
          .single();
        if (!retry) {
          const res = NextResponse.json({ error: 'Thread creation race' }, { status: 500 });
          return applyRateLimitHeaders(res, rl);
        }
        threadId = retry.id;
      } else {
        console.error('[dm-threads] insert failed:', tErr);
        const res = NextResponse.json({ error: tErr?.message || 'Thread create failed' }, { status: 500 });
        return applyRateLimitHeaders(res, rl);
      }
    } else {
      threadId = created.id;
    }
  }

  // Insert the first message
  const { data: msg, error: mErr } = await supabaseAdmin
    .from('direct_messages')
    .insert({
      thread_id: threadId,
      sender_id: userId,
      body: messageBody.trim(),
    })
    .select('id, thread_id, sender_id, body, created_at, read_at')
    .single();
  if (mErr || !msg) {
    console.error('[dm-threads] message insert failed:', mErr);
    const res = NextResponse.json({ error: mErr?.message || 'Message create failed' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  // Update thread preview + last_message_at
  await supabaseAdmin
    .from('direct_message_threads')
    .update({
      last_message_at: msg.created_at,
      last_message_preview: messageBody.slice(0, 200),
    })
    .eq('id', threadId);

  const res = NextResponse.json({ ok: true, thread_id: threadId, message: msg }, { status: 201 });
  return applyRateLimitHeaders(res, rl);
}
