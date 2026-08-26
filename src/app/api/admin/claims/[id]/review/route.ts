/**
 * POST /api/admin/claims/[id]/review — admin approves or rejects a claim
 *
 * Phase 3-A0. Approved by Arnel 2026-07-08 (Path X).
 * Prep: docs/phase-3-A0-prep-claims-approval.md
 *
 * Admin-only via getAdminFromRequest(). Body: { action, note? }
 *
 * On approve:
 *   - Update claims.status='approved', set reviewer fields.
 *   - For player claims: also set players.user_id = claim.user_id (self-managed).
 *   - claim_approved_trigger (migration 2026-06-29) fires automatically → analytics.
 *
 * On reject:
 *   - Update claims.status='rejected', set reviewer fields. No side effects.
 *
 * Data integrity:
 *   - Refuses to overwrite players.user_id if it's already set to a different user.
 *   - Refuses to approve a claim with no entity_id (nothing to apply).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { getUserTier } from '@/lib/connections';
import { emitClaimPaidTierUnlocked } from '@/lib/notifications/emit';
import { getTierLabel } from '@/lib/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ReviewBody {
  action?: 'approve' | 'reject';
  note?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`claims-review:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
  maybeCleanup();

  // ---- Admin guard ----
  const auth = await getAdminFromRequest(request, 'admin_claims_review');
  if ('response' in auth) {
    return applyRateLimitHeaders(auth.response as NextResponse, rl);
  }
  const { admin } = auth;

  // ---- Parse body ----
  let body: ReviewBody;
  try {
    body = (await request.json()) as ReviewBody;
  } catch {
    const res = NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }
  if (body.action !== 'approve' && body.action !== 'reject') {
    const res = NextResponse.json({ error: 'action must be "approve" or "reject".', code: 'invalid_action' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }
  const note = (body.note || '').trim() || null;

  // ---- Load claim ----
  const { id } = await params;
  const { data: claim, error: loadErr } = await supabaseAdmin
    .from('claims')
    .select('id, user_id, claim_type, entity_id, entity_name, status, reason')
    .eq('id', id)
    .maybeSingle();
  if (loadErr || !claim) {
    const res = NextResponse.json({ error: 'Claim not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }
  if (claim.status !== 'pending') {
    const res = NextResponse.json(
      { error: `Claim already ${claim.status}.`, code: 'already_reviewed' },
      { status: 409 },
    );
    return applyRateLimitHeaders(res, rl);
  }

  // ---- Reject path ----
  if (body.action === 'reject') {
    const { error: updateErr } = await supabaseAdmin
      .from('claims')
      .update({
        status: 'rejected',
        reviewer_user_id: admin.userId,
        reviewer_note: note,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (updateErr) {
      console.error('[claims-review] reject failed:', updateErr);
      const res = NextResponse.json({ error: 'Reject failed.' }, { status: 500 });
      return applyRateLimitHeaders(res, rl);
    }
    const res = NextResponse.json({ ok: true, status: 'rejected' });
    return applyRateLimitHeaders(res, rl);
  }

  // ---- Approve path ----
  // Refuse if entity_id is missing — there's nothing to apply.
  if (!claim.entity_id) {
    const res = NextResponse.json(
      { error: 'Claim has no entity_id; cannot approve automatically.', code: 'no_entity_id' },
      { status: 400 },
    );
    return applyRateLimitHeaders(res, rl);
  }

  // For player claims, set players.user_id if not already taken by another user.
  let playerUpdateWarning: string | null = null;
  if (claim.claim_type === 'player') {
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id, user_id')
      .eq('id', claim.entity_id)
      .maybeSingle();
    if (!player) {
      const res = NextResponse.json(
        { error: 'Player not found; cannot approve.', code: 'player_missing' },
        { status: 400 },
      );
      return applyRateLimitHeaders(res, rl);
    }
    if (player.user_id && player.user_id !== claim.user_id) {
      playerUpdateWarning = 'Player is already managed by another user; approval recorded but players.user_id not overwritten.';
    } else {
      const { error: setOwnerErr } = await supabaseAdmin
        .from('players')
        .update({ user_id: claim.user_id })
        .eq('id', claim.entity_id);
      if (setOwnerErr) {
        console.error('[claims-review] players.user_id update failed:', setOwnerErr);
        const res = NextResponse.json(
          { error: 'Failed to set player ownership.', code: 'player_owner_update_failed' },
          { status: 500 },
        );
        return applyRateLimitHeaders(res, rl);
      }
    }
  }

  // Flip claim status (trigger fires the analytics event automatically).
  const { error: updateErr } = await supabaseAdmin
    .from('claims')
    .update({
      status: 'approved',
      reviewer_user_id: admin.userId,
      reviewer_note: note,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (updateErr) {
    console.error('[claims-review] approve failed:', updateErr);
    const res = NextResponse.json({ error: 'Approve failed.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  // WS14 PR1 — fire-and-forget in-app notification: if the claimer is on a
  // paid tier, emit claim_paid_tier_unlocked so they see the new owner badge
  // in their inbox. Idempotent on (user_id, claim_id) via the emit's
  // source_key — re-approving a claim won't double-fire.
  void (async () => {
    try {
      const tier = await getUserTier(claim.user_id);
      if (tier && tier !== 'free') {
        await emitClaimPaidTierUnlocked(
          claim.user_id,
          id,
          (claim.entity_name ?? 'Your listing') as string,
          getTierLabel(tier),
        );
      }
    } catch (err) {
      console.error('[claims-review] emit claim_paid_tier_unlocked failed:', err);
    }
  })();

  const res = NextResponse.json({
    ok: true,
    status: 'approved',
    ...(playerUpdateWarning ? { warning: playerUpdateWarning } : {}),
  });
  return applyRateLimitHeaders(res, rl);
}