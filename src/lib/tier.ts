/**
 * Tier utilities — shared across server and client components.
 *
 * Pure-data module: no supabase, no React, no node:fs. Safe to import from
 * both server and client components.
 *
 * RANK TABLE POLICY (revised 2026-10-22): PER-TRACK ranks, not one global
 * ranking. The personal track is free(0) < verified_identity(1) <
 * identity_plus(2). The organization track is org_free(0) < org_plus(1) <
 * org_pro(2) < org_elite(3) < org_enterprise(4).
 *
 * Cross-track comparisons are always false — a Hockey Passport Plus never
 * outranks an org gate, and an org subscription never unlocks a personal
 * gate. This was the bug in the old model: `business_listing` satisfied a
 * `club_starter` gate because both were on a shared "business" track.
 *
 * LEGACY NAMES stay resolvable here (they are canonicalized through
 * LEGACY_TIER_ALIAS) so in-flight rows and webhooks keep working.
 */

import { canonicalTier, LEGACY_TIER_ALIAS, type TierName } from './pricing';

export type TierTrack = 'personal' | 'organization';

/**
 * Per-track tier rank.
 */
export const TIER_RANK: Record<string, number> = {
  // Personal track
  free: 0,
  verified_identity: 1,
  identity_plus: 2,
  // Organization track
  org_free: 0,
  org_plus: 1,
  org_pro: 2,
  org_elite: 3,
  org_enterprise: 4,
};

export const TIER_TRACK: Record<string, TierTrack> = {
  free: 'personal',
  verified_identity: 'personal',
  identity_plus: 'personal',
  org_free: 'organization',
  org_plus: 'organization',
  org_pro: 'organization',
  org_elite: 'organization',
  org_enterprise: 'organization',
};

/**
 * Legacy names, resolved to their canonical rank and track.
 *
 * These are NOT canonical names — they exist only so a DB row written before
 * 2026-10-22 still ranks correctly. `club_starter` → org_plus (rank 1),
 * `federation`/`league` → org_enterprise (rank 4), `business_plus` →
 * org_pro (rank 2), and so on.
 */
const LEGACY_RANK: Record<string, number> = {
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

/** Rank of a tier name, resolving legacy aliases. Unknown = 0. */
export function tierRank(tier: string | null | undefined): number {
  if (!tier) return 0;
  const raw = tier.trim();
  if (raw in TIER_RANK) return TIER_RANK[raw];
  if (raw in LEGACY_RANK) return LEGACY_RANK[raw];
  return 0;
}

/** Track of a tier name, resolving legacy aliases. Unknown = 'personal'. */
export function tierTrack(tier: string | null | undefined): TierTrack {
  if (!tier) return 'personal';
  const raw = tier.trim();
  if (raw in TIER_TRACK) return TIER_TRACK[raw];
  const canonical = LEGACY_TIER_ALIAS[raw];
  if (canonical) return TIER_TRACK[canonical];
  return 'personal';
}

/**
 * Returns true if `actual` is at or above `min` on the same track.
 * Returns false if either tier is unknown or the tracks differ.
 *
 * Examples:
 *   tierAtLeast('org_pro', 'org_plus')             -> true
 *   tierAtLeast('org_plus', 'org_pro')             -> false
 *   tierAtLeast('org_pro', 'verified_identity')    -> false (different track)
 *   tierAtLeast('free', 'free')                    -> true
 *   tierAtLeast('identity_plus', 'verified_identity') -> true
 *   tierAtLeast('club_starter', 'org_plus')        -> true (legacy alias)
 */
export function tierAtLeast(actual: string, min: string): boolean {
  const actualTrack = tierTrack(actual);
  const minTrack = tierTrack(min);
  if (actualTrack !== minTrack) return false;
  return tierRank(actual) >= tierRank(min);
}

/** Canonical tier for a raw value (re-exported for convenience). */
export function canonicalizeTier(tier: string | null | undefined): TierName {
  return canonicalTier(tier);
}
