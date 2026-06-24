import { supabaseAdmin } from '@/lib/supabase';

/**
 * Result of checking whether a user has access to team-admin features.
 *
 * `allowed` is the boolean decision.
 * `reason` explains why (for UI messages, logs, and debugging).
 * `tier` is the user's current tier from `profiles.tier`, or null if no profile.
 */
export interface TierGateResult {
  allowed: boolean;
  reason: string;
  tier: string | null;
}

/**
 * Decide whether a user can use team-admin features (calendar, attendance,
 * payments, etc.).
 *
 * Rule (Arnel, 2026-06-24): any non-free tier grants access. So this is a
 * binary check: `tier === 'free'` blocks; anything else allows.
 *
 * Failure modes (fail closed — better to deny a paid user than grant a
 * free user admin access):
 *   - DB read fails → { allowed: false, reason: 'db_error' }
 *   - No profile row → { allowed: false, reason: 'no_profile' }
 *   - tier null/undefined → treated as free
 *
 * Approved tier codes (display name shown to user, code stored in DB):
 *   - free ($0)
 *   - starter ($19.99/yr, display "Roster")
 *   - family_plus ($29.99/yr, display "Roster+")
 *   - pro ($59.99/yr)
 *   - premium ($299/yr)
 *   - enterprise (contact sales)
 *
 * Note: as of 2026-06-24, the live DB only has `free`, `starter`, `premium`.
 * The `family_plus` and `pro` migrations are pending. The helper accepts
 * all non-free values so future migrations don't break existing code.
 */
export async function hasTeamAdminAccess(userId: string): Promise<TierGateResult> {
  if (!userId) {
    return { allowed: false, reason: 'no_user', tier: null };
  }

  let tier: string | null = null;
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('tier')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { allowed: false, reason: 'db_error', tier: null };
    }
    tier = data?.tier ?? null;
  } catch {
    return { allowed: false, reason: 'db_error', tier: null };
  }

  if (!tier) {
    return { allowed: false, reason: 'no_profile', tier: null };
  }

  if (tier === 'free') {
    return { allowed: false, reason: 'paid_tier_required', tier };
  }

  return { allowed: true, reason: 'ok', tier };
}

/**
 * Convenience: throw-style variant for API routes that want to early-return
 * a 402 response. Usage:
 *
 *   const gate = await hasTeamAdminAccess(userId);
 *   if (!gate.allowed) return tierGateResponse(gate);
 */
export function tierGateResponse(gate: TierGateResult): Response {
  return new Response(
    JSON.stringify({
      error: gate.reason,
      currentTier: gate.tier,
      upgradeUrl: '/pricing',
    }),
    {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}