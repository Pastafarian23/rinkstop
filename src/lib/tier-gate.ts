/**
 * Tier gate functions for feature access control.
 * Two completely separate tracks: PERSONAL and BUSINESS.
 * Cross-track feature access is blocked.
 */

import { TierName, TIER_TO_TRACK, AccountTrack, MAX_CLAIMS_PER_TIER } from './pricing';

/**
 * Personal tier hierarchy (rank order within the track).
 * Free < Roster < Roster+ < Pro
 */
export const PERSONAL_TIER_RANK: Record<string, number> = {
  free: 0,
  roster: 1,
  roster_plus: 2,
  pro: 3,
};

/**
 * Business tier hierarchy (rank order within the track).
 * Free < Business Starter < Business Pro < Business Premium < Enterprise
 */
export const BUSINESS_TIER_RANK: Record<string, number> = {
  free: 0,
  business_starter: 1,
  business_pro: 2,
  business_premium: 3,
  enterprise: 4,
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
 * Check if user's tier is at least `minTier` within their track.
 * Cross-track comparisons return false (no confusion between tracks).
 */
export function tierAtLeastSameTrack(actualTier: TierName | string | null | undefined, minTier: TierName | string): boolean {
  const actual = actualTier ?? 'free';
  const actualRank = 
    TIER_TO_TRACK[actual as TierName] === 'business' 
      ? BUSINESS_TIER_RANK[actual] ?? 0 
      : PERSONAL_TIER_RANK[actual] ?? 0;
  const minRank = 
    TIER_TO_TRACK[minTier as TierName] === 'business'
      ? BUSINESS_TIER_RANK[minTier] ?? 0
      : PERSONAL_TIER_RANK[minTier] ?? 0;
  
  const actualTrack = TIER_TO_TRACK[actual as TierName] ?? 'personal';
  const minTrack = TIER_TO_TRACK[minTier as TierName] ?? 'personal';
  
  // Cross-track comparison not allowed
  if (actualTrack !== minTrack) return false;
  
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
  
  // Team admin features require at least Pro tier (personal or business)
  if (tierAtLeastSameTrack(tier, 'pro')) {
    return { allowed: true, tier };
  }
  
  return { 
    allowed: false, 
    tier, 
    reason: 'Team admin features require Pro tier or higher' 
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