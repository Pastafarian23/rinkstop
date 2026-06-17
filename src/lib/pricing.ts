/**
 * Single source of truth for RinkStop subscription tier prices.
 *
 * IMPORTANT: The values here MUST match the live Stripe prices exactly.
 * If you change a price in Stripe, update it here in the same commit and
 * redeploy. The Stripe price IDs are pinned in the comments below.
 *
 * Live Stripe prices (verified 2026-06-13):
 *   - RinkStop Supporter: $19.99 USD/year  (price_1ThcqgCJiUbEZVbnyHLCogTF)
 *   - RinkStop Verified:  $59.99 USD/year  (price_1ThcqhCJiUbEZVbnVfgLCdzu)
 *   - RinkStop Pro:       $299.00 USD/year (price_1ThcqhCJiUbEZVbnHtmWwpAa)
 */

export type TierName = 'free' | 'supporter' | 'verified' | 'pro';

export interface TierInfo {
  name: TierName;
  label: string;
  /** Annual price in USD as a decimal (e.g. 19.99 for $19.99/year). 0 for free. */
  priceUsd: number;
  /** Stripe price ID env var name (the actual ID is server-side via process.env) */
  stripePriceEnv: string;
  /** Short marketing line for the tier card. */
  tagline: string;
}

export const TIERS: Record<TierName, TierInfo> = {
  free: {
    name: 'free',
    label: 'Free',
    priceUsd: 0,
    stripePriceEnv: '',
    tagline: 'I want to browse',
  },
  supporter: {
    name: 'supporter',
    label: 'Supporter',
    priceUsd: 19.99,
    stripePriceEnv: 'STRIPE_PRICE_TIER_SUPPORTER',
    tagline: 'I support the site and want the good stuff',
  },
  verified: {
    name: 'verified',
    label: 'Verified',
    priceUsd: 59.99,
    stripePriceEnv: 'STRIPE_PRICE_TIER_VERIFIED',
    tagline: 'I want to be taken seriously',
  },
  pro: {
    name: 'pro',
    label: 'Pro',
    priceUsd: 299,
    stripePriceEnv: 'STRIPE_PRICE_TIER_PRO',
    tagline: 'I run a rink, team, or league and want to be found',
  },
};

/**
 * Budget knobs per tier. Tier is a budget ceiling — features beyond the
 * budget are gated by activity (e.g. lead capture is available to anyone
 * with an active listing, not gated by Pro). See SPEC 2026-06-17 for the
 * rationale: tier-as-budget decouples features from user archetypes, so
 * a $19.99 Supporter running one rink gets the same lead capture as a
 * $299 Pro running 25 listings.
 */
export interface TierLimits {
  /** Max approved claims a user can hold. */
  maxClaims: number;
  /** Max active marketplace listings (ice slots, programs, etc.). */
  maxListings: number;
  /** Outbound marketplace messages per calendar month. Infinity = uncapped. */
  monthlyOutboundMessages: number;
}

export const TIER_LIMITS: Record<TierName, TierLimits> = {
  free: { maxClaims: 0, maxListings: 0, monthlyOutboundMessages: 0 },
  supporter: { maxClaims: 1, maxListings: 1, monthlyOutboundMessages: 25 },
  verified: { maxClaims: 5, maxListings: 5, monthlyOutboundMessages: 100 },
  pro: { maxClaims: 25, maxListings: 25, monthlyOutboundMessages: Infinity },
};

/** Convenience: monthly outbound message cap for a tier, defaulting to 0 for unknown tiers. */
export function getMonthlyOutboundMessages(tier: TierName | string | null | undefined): number {
  if (!tier) return 0;
  return TIER_LIMITS[tier as TierName]?.monthlyOutboundMessages ?? 0;
}

/** Convenience: max active listings for a tier. */
export function getMaxListingsForTier(tier: TierName | string | null | undefined): number {
  if (!tier) return 0;
  return TIER_LIMITS[tier as TierName]?.maxListings ?? 0;
}

/** Format a tier's price for display. '$0' for free, '$19.99' for paid, '$299' for whole dollars. */
export function formatTierPrice(tier: TierName): string {
  const p = TIERS[tier].priceUsd;
  if (p === 0) return '$0';
  // Whole dollars: no decimals
  if (p === Math.floor(p)) return `$${p}`;
  return `$${p.toFixed(2)}`;
}

/** Format with the "/ year" suffix. */
export function formatTierPricePerYear(tier: TierName): string {
  return `${formatTierPrice(tier)} / year`;
}
