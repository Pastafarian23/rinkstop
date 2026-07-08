/**
 * POST /api/corrections — submit a new correction
 *
 * Phase 2-A0 Corrections Flow. Approved by Arnel 2026-07-08.
 * Prep: docs/phase-2-A0-prep-corrections-flow.md
 *
 * Any signed-in user can submit. Four spam-protection layers are enforced:
 *   1. Account age ≥ 7 days (defeats throwaway signups)
 *   2. Rate limit: 3 submissions per user per 24h
 *   3. One open correction per (submitter, entity, field) — DB-enforced
 *      via partial UNIQUE index + API re-check
 *   4. Min content: proposed_value non-empty, reason ≥ 10 chars
 *
 * The corrections table is INSERT-only via service role. RLS lets users
 * read their own submissions; admin reads via service role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_ENTITY_TYPES = new Set(['player', 'team', 'rink', 'league']);
const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 1000;
const MIN_ACCOUNT_AGE_DAYS = 7;
const RATE_LIMIT_PER_24H = 3;

interface CreateBody {
  entity_type?: string;
  entity_id?: string;
  field_name?: string;
  current_value?: string | null;
  proposed_value?: string;
  reason?: string;
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`corrections-create:${ip}`, { maxRequests: 30, windowMs: 60 * 60 * 1000 });
  maybeCleanup();

  // ---- Auth ----
  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  // ---- Parse body ----
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    const res = NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  const entity_type = (body.entity_type || '').trim();
  const entity_id = (body.entity_id || '').trim();
  const field_name = (body.field_name || '').trim();
  const proposed_value = (body.proposed_value || '').trim();
  const reason = (body.reason || '').trim();
  const current_value = body.current_value ?? null;

  if (!ALLOWED_ENTITY_TYPES.has(entity_type)) {
    const res = NextResponse.json({ error: 'Invalid entity_type.', code: 'invalid_entity_type' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }
  if (!entity_id) {
    const res = NextResponse.json({ error: 'entity_id required.', code: 'missing_entity_id' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }
  if (!field_name) {
    const res = NextResponse.json({ error: 'field_name required.', code: 'missing_field_name' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }
  if (!proposed_value) {
    const res = NextResponse.json({ error: 'proposed_value required.', code: 'missing_proposed_value' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }
  if (reason.length < MIN_REASON_LENGTH) {
    const res = NextResponse.json({ error: `reason must be at least ${MIN_REASON_LENGTH} characters.`, code: 'reason_too_short' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }
  if (reason.length > MAX_REASON_LENGTH) {
    const res = NextResponse.json({ error: `reason must be at most ${MAX_REASON_LENGTH} characters.`, code: 'reason_too_long' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  // ---- Spam gate #1: account age ----
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('created_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (!profile?.created_at) {
    const res = NextResponse.json({ error: 'Profile not found.' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }
  const accountAgeMs = Date.now() - new Date(profile.created_at).getTime();
  const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
  if (accountAgeDays < MIN_ACCOUNT_AGE_DAYS) {
    const res = NextResponse.json(
      {
        error: `Accounts must be at least ${MIN_ACCOUNT_AGE_DAYS} days old to submit corrections.`,
        code: 'account_too_new',
      },
      { status: 403 },
    );
    return applyRateLimitHeaders(res, rl);
  }

  // ---- Spam gate #2: rate limit (per-user) ----
  const rlUser = await checkRateLimit(`corrections-user:${userId}`, {
    maxRequests: RATE_LIMIT_PER_24H,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!rlUser.allowed) {
    const res = NextResponse.json(
      {
        error: `You can submit at most ${RATE_LIMIT_PER_24H} corrections per 24 hours.`,
        code: 'rate_limited',
        retry_after: rlUser.retryAfter,
      },
      { status: 429 },
    );
    return applyRateLimitHeaders(res, rl);
  }

  // ---- Spam gate #3: one open per (submitter, entity, field) ----
  // DB has a partial UNIQUE index that enforces this; we pre-check to give
  // a friendlier error message and avoid relying on the constraint name.
  const { data: existingOpen } = await supabaseAdmin
    .from('corrections')
    .select('id')
    .eq('submitter_user_id', userId)
    .eq('entity_type', entity_type)
    .eq('entity_id', entity_id)
    .eq('field_name', field_name)
    .eq('status', 'pending')
    .maybeSingle();
  if (existingOpen) {
    const res = NextResponse.json(
      { error: 'You already have a pending correction for this field. Wait for it to be reviewed.', code: 'duplicate_open' },
      { status: 409 },
    );
    return applyRateLimitHeaders(res, rl);
  }

  // ---- Insert ----
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('corrections')
    .insert({
      entity_type,
      entity_id,
      field_name,
      current_value,
      proposed_value,
      reason,
      submitter_user_id: userId,
      status: 'pending',
    })
    .select('id, status, submitted_at')
    .single();

  if (insertErr || !inserted) {
    // Race condition: partial UNIQUE caught a concurrent insert that beat us.
    if (insertErr?.code === '23505') {
      const res = NextResponse.json(
        { error: 'You already have a pending correction for this field.', code: 'duplicate_open' },
        { status: 409 },
      );
      return applyRateLimitHeaders(res, rl);
    }
    console.error('[corrections] insert failed:', insertErr);
    const res = NextResponse.json({ error: 'Submission failed. Try again.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  const res = NextResponse.json(
    {
      ok: true,
      id: inserted.id,
      status: inserted.status,
      submitted_at: inserted.submitted_at,
    },
    { status: 201 },
  );
  return applyRateLimitHeaders(res, rl);
}