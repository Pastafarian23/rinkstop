/**
 * Tier gate functions for feature access control.
 * Two completely separate tracks: PERSONAL and BUSINESS.
 * Cross-track feature access is blocked.
 */

import { TierName, TIER_TO_TRACK, AccountTrack, MAX_CLAIMS_PER_TIER } from './pricing';

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
 * Business tier hierarchy (rank order within the track).
 * Free < Business Listing < Business Plus
 * For organization tiers (clubs/leagues/federations), each has its own rank
 * within the same `business` track. Cross-tier comparisons are blocked.
 */
export const BUSINESS_TIER_RANK: Record<string, number> = {
  free: 0,
  business_listing: 1,
  business_plus: 2,
  club_starter: 1,
  club_pro: 2,
  club_elite: 3,
  league: 4,
  federation: 5,
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
 * Resolve the track for a tier name.
 * All tier names are mapped in TIER_TO_TRACK (src/lib/pricing.ts). No legacy
 * aliases exist — old tier names were migrated to new names by
 * supabase/migrations/2026-07-02_remove_old_tier_names.sql.
 */
function resolveTrack(tier: string | null | undefined): 'personal' | 'business' {
  if (!tier) return 'personal';
  return TIER_TO_TRACK[tier as TierName] ?? 'personal';
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
  // - Personal track: Hockey Passport Plus (or legacy pro/roster_plus/premium equivalent)
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
    reason: 'Team admin features require Hockey Passport Plus (personal) or Club Starter (business) tier or higher'
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