/**
 * /api/consumer-notifications/unread-count — lightweight badge count
 *
 * WS14 PR2 (2026-07-31). Returns unread + total counts from consumer_notifications.
 * Used by the bottom tab bar badge and bell badge.
 *
 * Auth: must be signed in. RLS enforces row-level isolation (server-side guard too).
 * Rate limit: 60/min/IP (cheaper than the main GET endpoint).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { requireUserId } from '@/lib/connections';
import {
  checkRateLimit,
  getClientIP,
  applyRateLimitHeaders,
  maybeCleanup,
} from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`consumer-notif-count:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const cu = await import('@clerk/nextjs/server').then(m => m.currentUser());
  const email = cu?.emailAddresses?.[0]?.emailAddress ?? '';
  const userId = await resolveCanonicalUserId(session.userId, email);
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  // WS14 PR1: also skip snoozed rows so the badge only reflects truly unread items.
  const nowIso = new Date().toISOString();
  const { count: unread, error: unreadErr } = await supabaseAdmin
    .from('consumer_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
    .or(`snooze_until.is.null,snooze_until.lte.${nowIso}`);

  const { count: total, error: totalErr } = await supabaseAdmin
    .from('consumer_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (unreadErr || totalErr) {
    console.error('[consumer-notifications/unread-count]', unreadErr || totalErr);
    const res = NextResponse.json({ error: 'Could not fetch count.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  const res = NextResponse.json({
    unread: unread ?? 0,
    total: total ?? 0,
  });
  return applyRateLimitHeaders(res, rl);
}
