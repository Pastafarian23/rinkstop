/**
 * Tier gate functions for feature access control.
 * Two completely separate tracks: PERSONAL and BUSINESS.
 * Cross-track feature access is blocked.
 */

import { TierName, TIER_TO_TRACK, AccountTrack, MAX_CLAIMS_PER_TIER } from './pricing';

/**
 * Personal tier hierarchy (rank order within the track).
 * Free < Verified Identity < Identity Plus
 *
 * Legacy aliases (pre-2026-07-02 brief): `roster` -> verified_identity (rank 1),
 * `roster_plus`/`pro`/`premium` -> identity_plus (rank 2). Old DB values still
 * rank correctly so pre-existing users keep their feature access.
 */
export const PERSONAL_TIER_RANK: Record<string, number> = {
  free: 0,
  // New canonical personal tiers (2026-07-02 brief)
  verified_identity: 1,
  identity_plus: 2,
  // Legacy aliases — preserve access for pre-2026-07-02 DB rows
  roster: 1,            // -> verified_identity
  roster_plus: 2,       // -> identity_plus
  pro: 2,               // -> identity_plus (top personal tier before 2026-06-30 rename)
  premium: 2,           // -> identity_plus (legacy alias for `pro`, pre-2026-06-30)
};

/**
 * Business tier hierarchy (rank order within the track).
 * Free < Business Listing < Business Plus
 * For organization tiers (clubs/leagues/federations), each has its own rank
 * within the same `business` track. Cross-tier comparisons are blocked.
 *
 * Legacy aliases (pre-2026-07-02 brief): business_starter -> business_listing,
 * business_pro/business_premium -> business_plus, enterprise -> federation.
 */
export const BUSINESS_TIER_RANK: Record<string, number> = {
  free: 0,
  // New canonical business tiers
  business_listing: 1,
  business_plus: 2,
  // New organization tiers (ranked by tier strength within business track)
  club_starter: 1,
  club_pro: 2,
  club_elite: 3,
  league: 4,
  federation: 5,
  // Legacy aliases — preserve access for pre-2026-07-02 DB rows
  business_starter: 1,    // -> business_listing
  business_pro: 2,        // -> business_plus
  business_premium: 2,    // -> business_plus (top business tier pre-refactor)
  enterprise: 5,          // -> federation (top tier pre-refactor)
};

/**
 * Check if user can access a personal-track feature.
 * Any business tier user is excluded.
 */
export function canAccessPersonalFeature(tier: TierName | string | null | undefined): boolean {
  const currentTier = tier ?? 'free';
  const currentTrack = TIER_TO_TRACK[currentTier as TierName] ?? 'personal';
  return currentTrack === 'personal';
}

/**
 * Check if user can access a business-track feature.
 * Any personal tier user is excluded.
 */
export function canAccessBusinessFeature(tier: TierName | string | null | undefined): boolean {
  const currentTier = tier ?? 'free';
  const currentTrack = TIER_TO_TRACK[currentTier as TierName] ?? 'personal';
  return currentTrack === 'business';
}

/**
 * Resolve the track for a tier name, including legacy aliases that are not in
 * the modern TIER_TO_TRACK map. Mirrors the legacy-alias mapping in
 * src/lib/pricing.ts:431-442 (getTierLabel).
 */
function resolveTrack(tier: string | null | undefined): 'personal' | 'business' {
  if (!tier) return 'personal';
  if (tier in TIER_TO_TRACK) return TIER_TO_TRACK[tier as TierName];
  // Legacy aliases — pre-2026-07-02 DB values
  const legacyTrack: Record<string, 'personal' | 'business'> = {
    roster: 'personal',
    roster_plus: 'personal',
    pro: 'personal',
    premium: 'personal',
    business_starter: 'business',
    business_pro: 'business',
    business_premium: 'business',
    enterprise: 'business',
  };
  return legacyTrack[tier] ?? 'personal';
}

/**
 * Check if user's tier is at least `minTier` within their track.
 * Cross-track comparisons return false (no confusion between tracks).
 */
export function tierAtLeastSameTrack(actualTier: TierName | string | null | undefined, minTier: TierName | string): boolean {
  const actual = actualTier ?? 'free';
  const actualTrack = resolveTrack(actual);
  const minTrack = resolveTrack(minTier);
  // Cross-track comparison not allowed
  if (actualTrack !== minTrack) return false;
  const rankTable = actualTrack === 'business' ? BUSINESS_TIER_RANK : PERSONAL_TIER_RANK;
  const actualRank = rankTable[actual] ?? 0;
  const minRank = rankTable[minTier] ?? 0;
  return actualRank >= minRank;
}

/**
 * Get max claims for a tier (shared function re-exported for convenience).
 */
export function getTierMaxClaims(tier: TierName | string | null | undefined): number {
  if (!tier) return 0;
  return MAX_CLAIMS_PER_TIER[tier as TierName] ?? 0;
}

// Backward compatibility: tierAtLeast function (same-track comparison only)
export const TIER_RANK = {
  ...PERSONAL_TIER_RANK,
  ...BUSINESS_TIER_RANK,
};

export function tierAtLeast(actualTier: string, minTier: string): boolean {
  return tierAtLeastSameTrack(actualTier, minTier);
}

/**
 * Team admin access check.
 * Returns { allowed: boolean; tier?: string; reason?: string }
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
    .select('tier')
    .eq('user_id', userId)
    .single();

  const tier = (profile?.tier as string) || 'free';

  // Team admin features require:
  // - Personal track: Identity Plus (or legacy pro/roster_plus/premium equivalent)
  // - Business track: any paid tier (Club Starter+, Business Listing+, etc.)
  // Cross-track: identity_plus users CAN manage teams they coach.
  const track = TIER_TO_TRACK[tier as TierName] ?? 'personal';
  if (track === 'personal') {
    if (tierAtLeastSameTrack(tier, 'identity_plus')) {
      return { allowed: true, tier };
    }
  } else {
    // business track — any paid tier grants team admin
    if (tierAtLeastSameTrack(tier, 'club_starter')) {
      return { allowed: true, tier };
    }
  }

  return {
    allowed: false,
    tier,
    reason: 'Team admin features require Identity Plus (personal) or Club Starter (business) tier or higher'
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