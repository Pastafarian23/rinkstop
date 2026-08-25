/**
 * /api/player-achievements
 *
 * Phase 1b-2 (Player Achievements + Career Timeline) — prep doc §2.
 * Approved by Arnel 2026-07-07 ("use your recommendations and proceed").
 *
 * POST: create one achievement for a linked child.
 *   Body (JSON): { player_id, title, description?, category, achieved_at }
 *
 * GET: list achievements for a player.
 *   Query: ?player_id=uuid
 *   Returns: { ok: true, achievements: [...] }
 *
 * Auth: caller must be signed in.
 * Tier gate: identity_plus+ OR business_listing+ (matches 1b-1).
 * Account-type gate: 'parent' in profile_account_types.
 * Parental-link gate: managed_profiles row exists.
 *
 * No DELETE in v1 (matches 1b-1 destructive-action protocol).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId } from '@/lib/connections';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';
import { isAccountType } from '@/components/dashboard/dashboardTypes';
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

function tierOk(tier: string | null | undefined): boolean {
  return (
    tierAtLeastSameTrack(tier, 'identity_plus') ||
    tierAtLeastSameTrack(tier, 'business_listing')
  );
}

function badRequest(error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status: 400 });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`player-achievements-create:${ip}`, { maxRequests: 30, windowMs: 60 * 1000 });
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

  const playerId = body?.player_id;
  const title = body?.title;
  const description = body?.description ?? null;
  const category = body?.category ?? 'milestone';
  const achievedAt = body?.achieved_at;

  if (typeof playerId !== 'string' || !playerId) {
    const res = badRequest('player_id_required');
    return applyRateLimitHeaders(res, rl);
  }
  if (typeof title !== 'string' || title.trim().length < 1 || title.length > 100) {
    const res = badRequest('invalid_title', { min: 1, max: 100 });
    return applyRateLimitHeaders(res, rl);
  }
  if (description !== null && (typeof description !== 'string' || description.length > 500)) {
    const res = badRequest('invalid_description', { max: 500 });
    return applyRateLimitHeaders(res, rl);
  }
  if (typeof category !== 'string' || !ALLOWED_CATEGORIES.has(category)) {
    const res = badRequest('invalid_category', { allowed: Array.from(ALLOWED_CATEGORIES) });
    return applyRateLimitHeaders(res, rl);
  }
  if (typeof achievedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(achievedAt)) {
    const res = badRequest('invalid_achieved_at', { format: 'YYYY-MM-DD' });
    return applyRateLimitHeaders(res, rl);
  }

  // Tier + account-type + parental-link gates
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();
  if (!tierOk((profile?.tier as string) ?? 'free')) {
    const res = NextResponse.json(
      { error: 'Adding achievements requires Hockey Passport Plus or higher.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  const { data: types } = await supabaseAdmin
    .from('profile_account_types')
    .select('account_type')
    .eq('user_id', userId);
  const isParent = (types || []).some(
    (r: { account_type: string }) => isAccountType(r.account_type) && r.account_type === 'parent'
  );
  if (!isParent) {
    const res = NextResponse.json(
      { error: 'Only parents can add achievements.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  const { data: link } = await supabaseAdmin
    .from('managed_profiles')
    .select('id')
    .eq('manager_user_id', userId)
    .eq('profile_id', playerId)
    .eq('profile_type', 'player')
    .maybeSingle();
  if (!link) {
    const res = NextResponse.json(
      { error: 'You do not manage this player.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  const { data: row, error: insErr } = await supabaseAdmin
    .from('player_achievements')
    .insert({
      player_id: playerId,
      granted_by: userId,
      title: title.trim(),
      description: typeof description === 'string' && description.trim() ? description.trim() : null,
      category,
      achieved_at: achievedAt,
    })
    .select('id, player_id, title, description, category, achieved_at, created_at, updated_at')
    .single();

  if (insErr || !row) {
    console.error('[player-achievements] insert failed:', insErr);
    const res = NextResponse.json({ error: insErr?.message || 'Insert failed' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  const res = NextResponse.json({ ok: true, achievement: row }, { status: 201 });
  return applyRateLimitHeaders(res, rl);
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`player-achievements-list:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
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

  const url = new URL(request.url);
  const playerId = url.searchParams.get('player_id');
  if (!playerId) {
    const res = badRequest('player_id_required');
    return applyRateLimitHeaders(res, rl);
  }

  const { data: link } = await supabaseAdmin
    .from('managed_profiles')
    .select('id')
    .eq('manager_user_id', userId)
    .eq('profile_id', playerId)
    .eq('profile_type', 'player')
    .maybeSingle();
  if (!link) {
    const res = NextResponse.json(
      { error: 'You do not manage this player.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  const { data: rows, error } = await supabaseAdmin
    .from('player_achievements')
    .select('id, player_id, title, description, category, achieved_at, created_at, updated_at')
    .eq('player_id', playerId)
    .order('achieved_at', { ascending: false });

  if (error) {
    console.error('[player-achievements] GET failed:', error);
    const res = NextResponse.json({ error: error.message }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  const res = NextResponse.json({ ok: true, achievements: rows || [] });
  return applyRateLimitHeaders(res, rl);
}
