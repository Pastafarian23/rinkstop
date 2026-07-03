/**
 * Tier utilities — shared across server and client components.
 *
 * Extracted from RoleAwareTabBar.tsx (where it was a local helper
 * tierAtLeastLocal) and src/lib/connections.ts (where tierAtLeast is
 * the supabase-coupled server-side version).
 *
 * This module is a thin pure-data module: no supabase, no React, no
 * node:fs. Safe to import from both server and client components.
 *
 * RANK TABLE POLICY: TIER_RANK uses PER-TRACK ranks (org 1-5, personal 1-2,
 * business 1-2), not a single global ranking. This matches the canonical
 * server-side table in src/lib/connections.ts. Same-tract comparison
 * (org-tier >= org-tier-min) is what tierAtLeast checks; cross-track
 * always returns false.
 */

export type TierTrack = 'personal' | 'organization' | 'business';

/**
 * Per-track tier rank. A tier on the organization track with rank 3
 * (club_elite) does NOT outrank a personal tier with rank 1 — tierAtLeast
 * rejects cross-track comparisons before doing the numeric check.
 */
export const TIER_RANK: Record<string, number> = {
  free: 0,
  // Personal track
  verified_identity: 1,
  identity_plus: 2,
  // Business track
  business_listing: 1,
  business_plus: 2,
  // Organization track
  club_starter: 1,
  club_pro: 2,
  club_elite: 3,
  league: 4,
  federation: 5,
};

export const TIER_TRACK: Record<string, TierTrack> = {
  free: 'personal',
  verified_identity: 'personal',
  identity_plus: 'personal',
  business_listing: 'business',
  business_plus: 'business',
  club_starter: 'organization',
  club_pro: 'organization',
  club_elite: 'organization',
  league: 'organization',
  federation: 'organization',
};

/**
 * Returns true if `actual` is at or above `min` on the same track.
 * Returns false if either tier is unknown or the tracks differ.
 *
 * Examples:
 *   tierAtLeast('club_pro', 'club_starter')       -> true
 *   tierAtLeast('club_starter', 'club_pro')       -> false
 *   tierAtLeast('club_pro', 'verified_identity')  -> false (different track)
 *   tierAtLeast('free', 'free')                   -> true
 *   tierAtLeast('identity_plus', 'verified_identity') -> true
 */
export function tierAtLeast(actual: string, min: string): boolean {
  const actualTrack = TIER_TRACK[actual] || 'personal';
  const minTrack = TIER_TRACK[min] || 'personal';
  if (actualTrack !== minTrack) return false;
  return (TIER_RANK[actual] ?? 0) >= (TIER_RANK[min] ?? 0);
}

/**
 * Returns the track a tier belongs to. Defaults to 'personal' for
 * unknown tiers (matches the historical fallback in tierAtLeastLocal).
 */
export function tierTrack(tier: string): TierTrack {
  return TIER_TRACK[tier] || 'personal';
}
