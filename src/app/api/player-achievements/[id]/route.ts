/**
 * /api/player-achievements/[id]
 *
 * Phase 1b-2. PATCH only in v1 (no DELETE — destructive action protocol).
 *
 * PATCH: edit a single achievement (title, description, category, achieved_at).
 *
 * Auth + parental-link gate: same as the collection route.
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

const ALLOWED_CATEGORIES = new Set([
  'milestone',
  'tournament',
  'award',
  'team',
  'personal',
  'stat',
  'other',
]);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function badRequest(error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status: 400 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`player-achievements-edit:${ip}`, { maxRequests: 30, windowMs: 60 * 1000 });
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

  const { id: achievementId } = await params;
  if (!achievementId) {
    const res = badRequest('id_required');
    return applyRateLimitHeaders(res, rl);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    const res = badRequest('invalid_json');
    return applyRateLimitHeaders(res, rl);
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body?.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length < 1 || body.title.length > 100) {
      const res = badRequest('invalid_title', { min: 1, max: 100 });
      return applyRateLimitHeaders(res, rl);
    }
    update.title = body.title.trim();
  }
  if (body?.description !== undefined) {
    if (body.description !== null && (typeof body.description !== 'string' || body.description.length > 500)) {
      const res = badRequest('invalid_description', { max: 500 });
      return applyRateLimitHeaders(res, rl);
    }
    update.description = typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null;
  }
  if (body?.category !== undefined) {
    if (typeof body.category !== 'string' || !ALLOWED_CATEGORIES.has(body.category)) {
      const res = badRequest('invalid_category', { allowed: Array.from(ALLOWED_CATEGORIES) });
      return applyRateLimitHeaders(res, rl);
    }
    update.category = body.category;
  }
  if (body?.achieved_at !== undefined) {
    if (typeof body.achieved_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.achieved_at)) {
      const res = badRequest('invalid_achieved_at', { format: 'YYYY-MM-DD' });
      return applyRateLimitHeaders(res, rl);
    }
    update.achieved_at = body.achieved_at;
  }

  // Look up the achievement + parent-link check
  const { data: ach, error: achErr } = await supabaseAdmin
    .from('player_achievements')
    .select('id, player_id')
    .eq('id', achievementId)
    .maybeSingle();
  if (achErr) {
    const res = NextResponse.json({ error: 'Could not load achievement.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
  if (!ach) {
    const res = NextResponse.json({ error: 'Achievement not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }
  const { data: link } = await supabaseAdmin
    .from('managed_profiles')
    .select('id')
    .eq('manager_user_id', userId)
    .eq('profile_id', ach.player_id)
    .eq('profile_type', 'player')
    .maybeSingle();
  if (!link) {
    const res = NextResponse.json({ error: 'You do not manage this player.' }, { status: 403 });
    return applyRateLimitHeaders(res, rl);
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from('player_achievements')
    .update(update)
    .eq('id', achievementId)
    .select('id, player_id, title, description, category, achieved_at, created_at, updated_at')
    .single();
  if (updErr || !updated) {
    console.error('[player-achievements PATCH] update failed:', updErr);
    const res = NextResponse.json({ error: updErr?.message || 'Update failed' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  const res = NextResponse.json({ ok: true, achievement: updated });
  return applyRateLimitHeaders(res, rl);
}
