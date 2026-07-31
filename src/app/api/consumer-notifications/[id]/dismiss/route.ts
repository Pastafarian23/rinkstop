/**
 * /api/consumer-notifications/[id]/dismiss — one-click dismiss from inbox
 *
 * WS14 PR1 (2026-07-31). GET only (the inbox is a server component that renders
 * <a href>, and GET-as-action is acceptable for an idempotent user-driven action
 * that calls PATCH + redirect). POST is also supported so client-side code can
 * use it without breaking CSRF expectations.
 *
 * Action: sets read_at = now() AND snooze_until = null (clearing the snooze so
 * the next emitOnboardingNotification call can re-surface the row if the
 * underlying trigger condition still applies).
 *
 * Auth: must be signed in. RLS verifies user_id.
 *
 * Rate limit: 30/min/IP (matches the [id] PATCH endpoint).
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

async function dismiss(request: NextRequest, params: Promise<{ id: string }>) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`consumer-notifications-dismiss:${ip}`, { maxRequests: 30, windowMs: 60 * 1000 });
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    '',
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  const { id: notifId } = await params;
  if (!notifId) {
    const res = NextResponse.json({ error: 'id_required' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  const { data: updated, error } = await supabaseAdmin
    .from('consumer_notifications')
    .update({
      read_at: new Date().toISOString(),
      snooze_until: null,
    } as any)
    .eq('id', notifId)
    .eq('user_id', userId)  // RLS also enforces; this is defense in depth
    .select('id')
    .single();

  if (error || !updated) {
    const res = NextResponse.json(
      { error: error?.message || 'Dismiss failed' },
      { status: error?.code === 'PGRST116' ? 404 : 500 },
    );
    return applyRateLimitHeaders(res, rl);
  }

  // For GET (inbox link click), redirect back to the inbox. For POST, return JSON.
  if (request.method === 'GET') {
    const res = NextResponse.redirect(new URL('/dashboard/notifications', request.url), { status: 303 });
    return applyRateLimitHeaders(res, rl);
  }
  const res = NextResponse.json({ ok: true, id: updated.id });
  return applyRateLimitHeaders(res, rl);
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return dismiss(request, ctx.params);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return dismiss(request, ctx.params);
}
