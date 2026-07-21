/**
 * /api/family/setup-state
 *
 * Phase 1a (Consumer-First Growth) — prep doc §3.2.
 * Approved by Arnel 2026-07-05 18:23 CDT.
 *
 * POST: dismiss or resume the Family Setup Wizard.
 *   Body: { action: 'dismiss' | 'resume' }
 *   - 'dismiss' sets profiles.family_setup_completed_at = NOW()
 *   - 'resume' sets profiles.family_setup_completed_at = NULL
 *
 * Auth: caller must be signed in.
 * Tier gate: caller must be on identity_plus+ or business_listing+ tier
 *   (matches the dashboard-level gate, so a user who downgrades cannot
 *   resume the wizard).
 * Account-type gate: caller must have at least one entry in
 *   profile_account_types. 2026-07-21: widened from parent-only to any
 *   persona; mirrors the dashboard-level gate. The wizard itself branches
 *   on persona inside the component.
 *
 * Response: { ok: true, family_setup_completed_at: ISO | null }
 *
 * Why this lives in its own endpoint (not /api/profiles/me):
 *   - The action is binary (dismiss/resume), not a generic profile update.
 *   - Keeps audit trail in one place (request logs).
 *   - Mirrors /api/players, /api/profiles/managed — small, focused endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId } from '@/lib/connections';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';
import { isAccountType } from '@/components/dashboard/dashboardTypes';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RL = { maxRequests: 30, windowMs: 60 * 1000 };

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`family-setup-state:${ip}`, RL);
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress || ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  // Tier gate — match the dashboard-level gate exactly. A user on a paid
  // business tier (business_listing+) is also allowed. Free fans cannot
  // dismiss/resume a wizard they cannot see.
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('tier, family_setup_completed_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileErr) {
    console.error('[family/setup-state] profile read failed:', profileErr);
    const res = NextResponse.json({ error: 'Could not load profile.' }, { status: 500 });
    return applyRateLimitHeaders(res, result);
  }

  const tier = (profile?.tier as string) ?? 'free';
  const tierOk =
    tierAtLeastSameTrack(tier, 'identity_plus') ||
    tierAtLeastSameTrack(tier, 'business_listing');
  if (!tierOk) {
    const res = NextResponse.json(
      { error: 'Family Setup Wizard requires Identity Plus or higher.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, result);
  }

  // Account-type gate — 2026-07-21: widened from parent-only to any persona.
  // The wizard now branches on persona inside the component; the gate just
  // ensures the caller has at least one declared persona.
  const { data: types, error: typesErr } = await supabaseAdmin
    .from('profile_account_types')
    .select('account_type')
    .eq('user_id', userId);

  if (typesErr) {
    console.error('[family/setup-state] account_types read failed:', typesErr);
    const res = NextResponse.json({ error: 'Could not load account types.' }, { status: 500 });
    return applyRateLimitHeaders(res, result);
  }

  const hasAnyPersona = (types || []).some(
    (r: { account_type: string }) => isAccountType(r.account_type)
  );
  if (!hasAnyPersona) {
    const res = NextResponse.json(
      { error: 'Set up your account type first to access the Setup Wizard.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, result);
  }

  // Action
  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    const res = NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    return applyRateLimitHeaders(res, result);
  }

  const action = body.action;
  if (action !== 'dismiss' && action !== 'resume') {
    const res = NextResponse.json(
      { error: 'action must be "dismiss" or "resume".' },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, result);
  }

  const newValue = action === 'dismiss' ? new Date().toISOString() : null;

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('profiles')
    .update({ family_setup_completed_at: newValue, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('family_setup_completed_at')
    .maybeSingle();

  if (updateErr) {
    console.error('[family/setup-state] update failed:', updateErr);
    // If the column does not exist yet (migration not applied), return a
    // clear 503 so the client can surface a useful error rather than fail
    // silently.
    if (updateErr.code === '42703' || /column.*does not exist/i.test(updateErr.message)) {
      const res = NextResponse.json(
        { error: 'Family Setup Wizard is not yet available. Schema migration pending.' },
        { status: 503 }
      );
      return applyRateLimitHeaders(res, result);
    }
    const res = NextResponse.json({ error: 'Could not update wizard state.' }, { status: 500 });
    return applyRateLimitHeaders(res, result);
  }

  const res = NextResponse.json({
    ok: true,
    family_setup_completed_at: updated?.family_setup_completed_at ?? null,
  });
  return applyRateLimitHeaders(res, result);
}
