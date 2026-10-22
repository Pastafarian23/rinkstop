/**
 * Tier gate functions for feature access control.
 *
 * TWO COMPLETELY SEPARATE TRACKS: PERSONAL and ORGANIZATION.
 * Cross-track feature access is blocked.
 *
 * Revised 2026-10-22:
 *   • The old model had a third "business" track and merged organization +
 *     business into it. That merge was a live authorization bug: a
 *     `business_listing` row satisfied a `club_starter` gate because both
 *     shared the `business` track and `business_listing` had rank 1.
 *   • The organization track is now a single ladder:
 *       org_free < org_plus < org_pro < org_elite < org_enterprise
 *   • Business listings fold into the same ladder (business_listing →
 *     org_plus, business_plus → org_pro).
 *   • Org gates read `profiles.org_tier`; personal gates read `profiles.tier`.
 */

import {
  TierName,
  TIER_TO_TRACK,
  AccountTrack,
  MAX_CLAIMS_PER_TIER,
  canonicalTier,
} from './pricing';
import { tierAtLeast, tierRank, tierTrack } from './tier';

/**
 * Personal tier hierarchy (rank order within the track).
 * Free < Hockey Passport < Hockey Passport Plus
 */
export const PERSONAL_TIER_RANK: Record<string, number> = {
  free: 0,
  verified_identity: 1,
  identity_plus: 2,
};

/**
 * Organization tier hierarchy (rank order within the track).
 * org_free < org_plus < org_pro < org_elite < org_enterprise
 */
export const ORGANIZATION_TIER_RANK: Record<string, number> = {
  org_free: 0,
  org_plus: 1,
  org_pro: 2,
  org_elite: 3,
  org_enterprise: 4,
};

/**
 * Check if user can access a personal-track feature.
 * Any organization tier user is excluded.
 */
export function canAccessPersonalFeature(tier: TierName | string | null | undefined): boolean {
  const currentTier = tier ?? 'free';
  const currentTrack = TIER_TO_TRACK[canonicalTier(currentTier)] ?? 'personal';
  return currentTrack === 'personal';
}

/**
 * Check if user can access an organization-track feature.
 * Any personal tier user is excluded.
 */
export function canAccessOrganizationFeature(tier: TierName | string | null | undefined): boolean {
  const currentTier = tier ?? 'free';
  const currentTrack = TIER_TO_TRACK[canonicalTier(currentTier)] ?? 'personal';
  return currentTrack === 'organization';
}

/**
 * @deprecated Use canAccessOrganizationFeature. Retained for callers that
 * still use the old name; behavior is identical.
 */
export const canAccessBusinessFeature = canAccessOrganizationFeature;

/**
 * Resolve the track for a tier name (legacy names resolved).
 */
function resolveTrack(tier: string | null | undefined): AccountTrack {
  return tierTrack(tier);
}

/**
 * Check if user's tier is at least `minTier` within their track.
 * Cross-track comparisons return false (no confusion between tracks).
 */
export function tierAtLeastSameTrack(
  actualTier: TierName | string | null | undefined,
  minTier: TierName | string,
): boolean {
  const actual = actualTier ?? 'free';
  const actualTrack = resolveTrack(actual);
  const minTrack = resolveTrack(minTier);
  if (actualTrack !== minTrack) return false;
  return tierRank(actual) >= tierRank(minTier);
}

/**
 * Get max claims for a tier (shared function re-exported for convenience).
 */
export function getTierMaxClaims(tier: TierName | string | null | undefined): number {
  if (!tier) return 0;
  return MAX_CLAIMS_PER_TIER[canonicalTier(tier)] ?? 0;
}

/**
 * Flat rank table for callers that don't need track awareness.
 * Legacy aliases preserved so existing DB rows rank correctly.
 */
export const TIER_RANK: Record<string, number> = {
  ...PERSONAL_TIER_RANK,
  ...ORGANIZATION_TIER_RANK,
  // Legacy aliases — ranks mirror the canonical ladder.
  roster: 1,           // -> verified_identity
  roster_plus: 2,      // -> identity_plus
  pro: 2,              // -> identity_plus
  premium: 2,          // -> identity_plus
  club_starter: 1,     // -> org_plus
  club_pro: 2,         // -> org_pro
  club_elite: 3,       // -> org_elite
  league: 4,           // -> org_enterprise
  federation: 4,       // -> org_enterprise
  enterprise: 4,       // -> org_enterprise
  business_listing: 1, // -> org_plus
  business_plus: 2,    // -> org_pro
  business_starter: 1, // -> org_plus
  business_pro: 2,     // -> org_pro
  business_premium: 2, // -> org_pro
  business_free: 0,    // -> org_free
};

export { tierAtLeast };

/**
 * Does the user hold ANY paid entitlement on EITHER track?
 *
 * Used by features that were historically gated on "any paid tier" (the
 * passport federation-registration flow, for example). After the two-column
 * split, a user can be paid on the personal track OR the organization track,
 * and both qualify.
 */
export function hasAnyPaidTier(
  personalTier: string | null | undefined,
  orgTier?: string | null,
): boolean {
  if (tierAtLeastSameTrack(personalTier, 'verified_identity')) return true;
  if (orgTier && tierAtLeastSameTrack(orgTier, 'org_plus')) return true;
  return false;
}

/**
 * Check a feature gate that is satisfied by EITHER track.
 *
 * Most pre-2026-10-22 gates were written as flat lists of tier names, e.g.
 *
 *   ['pro', 'business_pro', 'business_premium', 'enterprise'].includes(myTier)
 *
 * That list mixed both tracks and silently ignored whichever column the
 * user's entitlement actually lived in. This helper replaces those lists:
 * the caller states the minimum rung on each track, and the check passes if
 * EITHER track qualifies.
 *
 * @param personalTier  the user's `profiles.tier`
 * @param orgTier       the user's `profiles.org_tier`
 * @param minPersonal   minimum personal-track tier, or null to ignore the track
 * @param minOrg        minimum organization-track tier, or null to ignore the track
 */
export function meetsTierGate(
  personalTier: string | null | undefined,
  orgTier: string | null | undefined,
  minPersonal: string | null,
  minOrg: string | null,
): boolean {
  if (minPersonal && tierAtLeastSameTrack(personalTier, minPersonal)) return true;
  if (minOrg && tierAtLeastSameTrack(orgTier, minOrg)) return true;
  return false;
}

/**
 * Team admin access check.
 *
 * After the 2026-10-22 consolidation:
 *   • A personal Hockey Passport Plus holder may manage teams they coach.
 *   • ANY organization tier — including the free `org_free` rung — may
 *     manage up to its team cap (1 team for org_free).
 *
 * The team-count cap is enforced separately in src/lib/org-limits.ts and by
 * the create_team_workspace RPC. This gate answers "may this account manage
 * teams at all".
 */
export async function hasTeamAdminAccess(userId: string): Promise<{
  allowed: boolean;
  tier?: string;
  reason?: string;
}> {
  // Import supabaseAdmin here to avoid circular dependencies
  const { supabaseAdmin } = await import('@/lib/supabase');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier, org_tier')
    .eq('user_id', userId)
    .single();

  const personalTier = (profile?.tier as string) || 'free';
  const orgTier = (profile?.org_tier as string) || 'org_free';

  // Personal track: Hockey Passport Plus unlocks coaching tools.
  if (tierAtLeastSameTrack(personalTier, 'identity_plus')) {
    return { allowed: true, tier: personalTier };
  }

  // Organization track: any org tier (including org_free) allows management.
  if (tierAtLeastSameTrack(orgTier, 'org_free')) {
    return { allowed: true, tier: orgTier };
  }

  return {
    allowed: false,
    tier: personalTier,
    reason: 'Team admin features require Hockey Passport Plus or an organization plan',
  };
}

/**
 * Standard response formatter for tier gate failures.
 */
export function tierGateResponse(gate: { allowed: boolean; tier?: string; reason?: string }): Response {
  return new Response(JSON.stringify({
    error: gate.reason || 'tier_required',
    tier: gate.tier
  }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}
