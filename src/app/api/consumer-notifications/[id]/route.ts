/**
 * /api/consumer-notifications/[id]
 *
 * Phase 1b-4. PATCH only in v1 (mark-as-read).
 *
 * PATCH: { read_at: ISO timestamp or null, clear_snooze?: boolean }
 *   - read_at: now → mark as read
 *   - read_at: null → mark as unread (v1 supports this; useful for "re-derive
 *     on read transition" semantics)
 *   - clear_snooze: true → also null out snooze_until. Requires read_at to be
 *     set (dismiss-and-clear-snooze is a single user action, not two). WS14
 *     PR1.
 *
 * Auth: must be signed in. RLS verifies the row's user_id matches the caller.
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`consumer-notifications-edit:${ip}`, { maxRequests: 30, windowMs: 60 * 1000 });
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    ''
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

  let body: any;
  try {
    body = await request.json();
  } catch {
    const res = NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  // read_at: null = mark unread, ISO string = mark read
  const readAt = body?.read_at === null
    ? null
    : typeof body?.read_at === 'string'
      ? body.read_at
      : new Date().toISOString();

  // WS14 PR1: optional clear_snooze action — caller passes true to
  // remove snooze_until from this row, allowing the next re-derivation to refresh it.
  // Only allowed alongside a read=now (the dismissal action is the natural moment).
  const clearSnooze = body?.clear_snooze === true;
  if (clearSnooze && readAt === null) {
    const res = NextResponse.json(
      { error: 'clear_snooze requires read_at to be set (dismiss the row to clear snooze).', code: 'invalid_combination' },
      { status: 400 },
    );
    return applyRateLimitHeaders(res, rl);
  }

  const updateFields: Record<string, unknown> = { read_at: readAt };
  if (clearSnooze) updateFields.snooze_until = null;

  const { data: updated, error } = await supabaseAdmin
    .from('consumer_notifications')
    .update(updateFields as any)
    .eq('id', notifId)
    .eq('user_id', userId)  // server-side double-check; RLS also enforces
    .select('id, read_at, snooze_until')
    .single();

  if (error || !updated) {
    console.error('[consumer-notifications PATCH] failed:', error);
    const res = NextResponse.json({ error: error?.message || 'Update failed' }, { status: error?.code === 'PGRST116' ? 404 : 500 });
    return applyRateLimitHeaders(res, rl);
  }

  const res = NextResponse.json({
    ok: true,
    id: updated.id,
    read_at: updated.read_at,
    snooze_until: updated.snooze_until,
  });
  return applyRateLimitHeaders(res, rl);
}
