/**
 * POST /api/corrections/[id]/review — admin reviews a pending correction
 *
 * Phase 2-A0. Approved by Arnel 2026-07-08.
 * Prep: docs/phase-2-A0-prep-corrections-flow.md
 *
 * Admin-only (getAdminFromRequest). Body: { action: 'approve' | 'reject', note? }
 *
 * On approve for player entities, applies the proposed value to the
 * whitelisted column. For non-player entities, sets status='review_required'
 * and the admin handles the row manually. On reject, just marks rejected
 * with the optional note.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Whitelisted player columns that can be auto-applied on approve.
// Anything not in this list lands as 'review_required'.
const PLAYER_AUTO_FIELDS = new Set([
  'first_name',
  'last_name',
  'position',
  'jersey_number',
  'shoots',
  'catches',
  'height_cm',
  'weight_kg',
  'birth_date',
  'nationality',
  'bio',
]);

interface ReviewBody {
  action?: 'approve' | 'reject';
  note?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`corrections-review:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
  maybeCleanup();

  // ---- Admin guard ----
  const auth = await getAdminFromRequest(request, 'corrections_review');
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

  // ---- Load correction ----
  const { id } = await params;
  const { data: correction, error: loadErr } = await supabaseAdmin
    .from('corrections')
    .select('id, entity_type, entity_id, field_name, proposed_value, status')
    .eq('id', id)
    .maybeSingle();
  if (loadErr || !correction) {
    const res = NextResponse.json({ error: 'Correction not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }
  if (correction.status !== 'pending') {
    const res = NextResponse.json(
      { error: `Correction already ${correction.status}.`, code: 'already_reviewed' },
      { status: 409 },
    );
    return applyRateLimitHeaders(res, rl);
  }

  // ---- Reject path ----
  if (body.action === 'reject') {
    const { error: updateErr } = await supabaseAdmin
      .from('corrections')
      .update({
        status: 'rejected',
        reviewer_user_id: admin.userId,
        reviewer_note: note,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (updateErr) {
      console.error('[corrections-review] reject failed:', updateErr);
      const res = NextResponse.json({ error: 'Reject failed.' }, { status: 500 });
      return applyRateLimitHeaders(res, rl);
    }
    const res = NextResponse.json({ ok: true, status: 'rejected' });
    return applyRateLimitHeaders(res, rl);
  }

  // ---- Approve path ----
  // Only player entities get auto-apply in v1. Other entity types land as
  // review_required so the admin knows to handle them out-of-band.
  if (correction.entity_type !== 'player' || !PLAYER_AUTO_FIELDS.has(correction.field_name)) {
    const { error: updateErr } = await supabaseAdmin
      .from('corrections')
      .update({
        status: 'review_required',
        reviewer_user_id: admin.userId,
        reviewer_note: note,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (updateErr) {
      console.error('[corrections-review] review_required failed:', updateErr);
      const res = NextResponse.json({ error: 'Review-required update failed.' }, { status: 500 });
      return applyRateLimitHeaders(res, rl);
    }
    const res = NextResponse.json({ ok: true, status: 'review_required' });
    return applyRateLimitHeaders(res, rl);
  }

  // ---- Apply to player row ----
  // Coerce numeric columns. Everything else stays as text.
  const numericFields = new Set(['jersey_number', 'height_cm', 'weight_kg']);
  let appliedValue: string | number | null = correction.proposed_value;
  if (numericFields.has(correction.field_name)) {
    const n = Number(correction.proposed_value);
    if (!Number.isFinite(n)) {
      const res = NextResponse.json(
        { error: `proposed_value for ${correction.field_name} must be a number.`, code: 'invalid_numeric' },
        { status: 400 },
      );
      return applyRateLimitHeaders(res, rl);
    }
    appliedValue = n;
  }
  if (correction.field_name === 'birth_date') {
    // Sanity check YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(correction.proposed_value)) {
      const res = NextResponse.json(
        { error: 'birth_date must be YYYY-MM-DD.', code: 'invalid_date' },
        { status: 400 },
      );
      return applyRateLimitHeaders(res, rl);
    }
  }

  const { error: updatePlayerErr } = await supabaseAdmin
    .from('players')
    .update({ [correction.field_name]: appliedValue, updated_at: new Date().toISOString() })
    .eq('id', correction.entity_id);
  if (updatePlayerErr) {
    console.error('[corrections-review] player update failed:', updatePlayerErr);
    const res = NextResponse.json({ error: 'Player update failed.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  const { error: updateCorrErr } = await supabaseAdmin
    .from('corrections')
    .update({
      status: 'approved',
      reviewer_user_id: admin.userId,
      reviewer_note: note,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (updateCorrErr) {
    console.error('[corrections-review] correction approve update failed:', updateCorrErr);
    // Player row was already updated — log and continue. The correction will
    // show as pending even though the change applied. Admin can re-approve.
  }

  const res = NextResponse.json({ ok: true, status: 'approved', applied_field: correction.field_name });
  return applyRateLimitHeaders(res, rl);
}