/**
 * Single source of truth for RinkStop subscription tier prices.
 *
 * IMPORTANT: The values here MUST match the live Stripe prices exactly.
 * Run `curl https://rinkstop.com/api/admin/stripe-prices?secret=$ONETIME_SECRET`
 * (gated by ONETIME_SECRET) to verify against Stripe. If you change a price
 * in Stripe, update it here in the same commit and redeploy.
 *
 * Live Stripe prices (verified 2026-06-13):
 *   - RinkStop Supporter: $19.99 USD/year  (price_1ThcqgCJiUbEZVbnyHLCogTF)
 *   - RinkStop Verified:  $59.99 USD/year  (price_1ThcqhCJiUbEZVbnVfgLCdzu)
 *   - RinkStop Pro:       $299.00 USD/year (price_1ThcqhCJiUbEZVbnHtmWwpAa)
 *
 * Founding tier (closed/inactive): $9.99 / $19.99 / $29.99
 * Player Recruit tier (dormant, not on Stripe): $39 / $99
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
