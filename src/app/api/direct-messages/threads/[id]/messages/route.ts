/**
 * /api/direct-messages/threads/[id]/messages
 *
 * Phase 1c-1.
 *
 * POST: send a message into an existing thread. Tier-gated on sender.
 *
 * Auth: must be signed in. RLS verifies thread participant.
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
// send direct messages. Hockey Passport ($24.99/yr) is the floor.
function canDM(tier: string | null | undefined): boolean {
  return (
    tierAtLeastSameTrack(tier, 'verified_identity') ||
    tierAtLeastSameTrack(tier, 'business_listing')
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`dm-message-send:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
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

  let body: any;
  try {
    body = await request.json();
  } catch {
    const res = NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  const messageBody = body?.body;
  if (typeof messageBody !== 'string' || messageBody.trim().length < 1 || messageBody.length > 5000) {
    const res = NextResponse.json({ error: 'invalid_body', min: 1, max: 5000 }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  // Tier gate
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

  // Verify thread + participant
  const { data: thread, error: tErr } = await supabaseAdmin
    .from('direct_message_threads')
    .select('id, user_a_id, user_b_id')
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

  // Insert message
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
    console.error('[dm-messages] insert failed:', mErr);
    const res = NextResponse.json({ error: mErr?.message || 'Send failed' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  // Update thread last_message_at + preview
  await supabaseAdmin
    .from('direct_message_threads')
    .update({
      last_message_at: msg.created_at,
      last_message_preview: messageBody.slice(0, 200),
    })
    .eq('id', threadId);

  const res = NextResponse.json({ ok: true, message: msg }, { status: 201 });
  return applyRateLimitHeaders(res, rl);
}
