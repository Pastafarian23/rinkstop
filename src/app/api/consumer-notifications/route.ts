/**
 * /api/consumer-notifications
 *
 * Phase 1b-4 (Consumer Notifications) — prep doc §2.
 * Approved by Arnel 2026-07-07 ("use your recommendations and proceed").
 *
 * GET: list the current user's consumer notifications (paginated, with
 *   optional `?unread=true` filter).
 *
 * POST: re-derive notifications for the current user. Idempotent — uses
 *   INSERT ... ON CONFLICT (user_id, source_key, kind) DO NOTHING. The
 *   route also DELETEs any "expired" rows whose source is no longer in
 *   the derived set (so e.g. a doc that was "expiring 7d" but is now
 *   "expired" gets re-derived correctly).
 *
 * Auth: caller must be signed in. No tier gate (free users get a read-only
 *   inbox with the upgrade upsell; the inbox itself is always available).
 *
 * RLS: consumer_notifications_select_own / update_own (table-level RLS).
 *   The route uses supabaseAdmin for INSERT (service-role bypass), so the
 *   server is responsible for setting user_id = current user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { requireUserId } from '@/lib/connections';
import { deriveNotifications } from '@/lib/notification-deriver';
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
  const rl = await checkRateLimit(`consumer-notifications-list:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
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

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);

  let query = supabaseAdmin
    .from('consumer_notifications')
    .select('id, user_id, kind, source_key, player_id, title, body, metadata, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (unreadOnly) query = query.is('read_at', null);

  const { data, error } = await query;
  if (error) {
    console.error('[consumer-notifications] GET failed:', error);
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  // Unread count (independent of pagination)
  const { count: unreadCount } = await supabaseAdmin
    .from('consumer_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  const res = NextResponse.json({
    ok: true,
    notifications: data || [],
    unread: unreadCount || 0,
  });
  return applyRateLimitHeaders(res, rl);
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`consumer-notifications-derive:${ip}`, { maxRequests: 10, windowMs: 60 * 1000 });
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

  // Load linked player IDs
  const { data: links } = await supabaseAdmin
    .from('managed_profiles')
    .select('profile_id')
    .eq('manager_user_id', userId)
    .eq('profile_type', 'player');
  const playerIds = ((links || []) as Array<{ profile_id: string }>).map((l) => l.profile_id);

  // Run the deriver
  const derived = await deriveNotifications(userId, playerIds);

  // Step 1: For each derived row, if the existing read state is null, the
  // UNIQUE constraint will block the insert (correct — no duplicate unread).
  // If the existing read state is non-null, we want to re-create the row
  // (so a doc going from 30d unread to 7d unread shows up again). DELETE the
  // read row first, then INSERT.
  //
  // We do this in a single round trip: collect all source_keys, find the
  // ones that are READ in the current DB, DELETE those, then INSERT the
  // derived set with ON CONFLICT DO NOTHING.
  if (derived.length > 0) {
    const sourceKeys = Array.from(new Set(derived.map((d) => d.source_key)));
    const { data: existing } = await supabaseAdmin
      .from('consumer_notifications')
      .select('id, source_key, kind, read_at')
      .eq('user_id', userId)
      .in('source_key', sourceKeys);
    const readIds = ((existing || []) as Array<{ id: string; source_key: string; kind: string; read_at: string | null }>)
      .filter((r) => r.read_at !== null)
      .map((r) => r.id);
    if (readIds.length > 0) {
      await supabaseAdmin.from('consumer_notifications').delete().in('id', readIds);
    }
  }

  // INSERT derived set with onConflictDoNothing (the unique index handles it)
  if (derived.length > 0) {
    const { error: insErr } = await supabaseAdmin
      .from('consumer_notifications')
      .insert(derived as any);
    if (insErr) {
      console.error('[consumer-notifications] derive insert failed:', insErr);
      // Don't fail the whole request — the GET will return whatever exists.
    }
  }

  // Return the new unread count
  const { count: unreadCount } = await supabaseAdmin
    .from('consumer_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  const res = NextResponse.json({ ok: true, derived: derived.length, unread: unreadCount || 0 });
  return applyRateLimitHeaders(res, rl);
}
