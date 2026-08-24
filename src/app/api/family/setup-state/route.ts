/**
 * /api/family/setup-state
 *
 * Phase 1a (Consumer-First Growth) — prep doc §3.2.
 * Approved by Arnel 2026-07-05 18:23 CDT.
 *
 * POST: mark the Family Setup Wizard complete.
 *   Body: { action: 'mark_complete' }
 *   - 'mark_complete' sets profiles.family_setup_completed_at = NOW()
 *     (idempotent — if already set, leave it alone so we don't reset the
 *     completion timestamp on every render)
 *
 * 2026-07-22 (Arnel): the wizard is now MANDATORY. The previous 'dismiss'
 * and 'resume' actions are gone — users can no longer hide the wizard.
 * The wizard component auto-calls this endpoint via useEffect when every
 * reachable step is done or acknowledged (comingNext). The user no longer
 * needs to take an explicit action.
 *
 * Auth: caller must be signed in.
 * Tier gate: caller must be on identity_plus+ or business_listing+ tier
 *   (matches the dashboard-level gate, so a user who downgrades cannot
 *   mark the wizard complete).
 * Account-type gate: caller must have at least one entry in
 *   profile_account_types. Mirrors the dashboard-level gate.
 *
 * Response: { ok: true, family_setup_completed_at: ISO | null }
 *
 * Why this lives in its own endpoint (not /api/profiles/me):
 *   - The action is a single intent (mark complete), not a generic profile update.
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
  // mark the wizard complete (they cannot see it).
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
      { error: 'Family Setup Wizard requires Hockey Passport Plus or higher.' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, result);
  }

  // Account-type gate — 2026-07-21: widened from parent-only to any persona.
  // The wizard branches on persona inside the component; the gate just
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

  // Action — 2026-07-22: only 'mark_complete' is allowed. 'dismiss' and
  // 'resume' were removed when the wizard became mandatory.
  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    const res = NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    return applyRateLimitHeaders(res, result);
  }

  const action = body.action;
  if (action !== 'mark_complete') {
    const res = NextResponse.json(
      { error: 'action must be "mark_complete".' },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, result);
  }

  // Idempotent: if already complete, leave the original timestamp alone.
  if (profile?.family_setup_completed_at) {
    const res = NextResponse.json({
      ok: true,
      family_setup_completed_at: profile.family_setup_completed_at,
      alreadyComplete: true,
    });
    return applyRateLimitHeaders(res, result);
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('profiles')
    .update({ family_setup_completed_at: now, updated_at: now })
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
