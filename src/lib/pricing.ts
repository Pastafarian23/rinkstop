/**
 * Single source of truth for RinkStop subscription tier prices.
 *
 * TWO SEPARATE TRACKS: PERSONAL and BUSINESS.
 * Users choose track at signup - pricing/tier logic is completely separate.
 * Personal users cannot access business features and vice versa.
 *
 * PERSONAL TRACK (players/families), display labels per 2026-06-30 rename:
 *   - Roster Starter        (roster, $19.99)         → claim your profile + unlimited kids
 *   - Roster Pro            (roster_plus, $29.99)    → photos/videos + Family Hub
 *   - Roster Premium        (pro, $59.99)            → advanced personal features
 *
 * BUSINESS TRACK (orgs/rinks/leagues):
 *   - Business Starter      (business_starter, $29.99) → claim 1 business listing
 *   - Business Pro          (business_pro, $59.99)    → lead forms + DMs + 5 claims
 *   - Business Premium      (business_premium, $299)  → analytics + branding + 25 claims
 *   - Enterprise            (enterprise, Contact)     → custom integration
 *
 * Note: the internal enum values (roster, roster_plus, pro, etc.) are kept
 * unchanged because they are stored in the database and referenced by SQL
 * constraints. Only the user-visible labels were renamed in 2026-06-30 so
 * the personal-track progression reads Starter → Pro → Premium, mirroring
 * the business-track progression Starter → Pro → Premium.
 *
 * Stripe price IDs are verified and stored in Vercel environment.
 */

export type TierName = 'free' | 'roster' | 'roster_plus' | 'pro' | 'business_starter' | 'business_pro' | 'business_premium' | 'enterprise';

export type AccountTrack = 'personal' | 'business';

/**
 * Tier to track mapping. Used for UI routing and feature differentiation.
 */
export const TIER_TO_TRACK: Record<TierName, AccountTrack> = {
  free: 'personal', // neutral - can switch later via signup
  roster: 'personal',
  roster_plus: 'personal',
  pro: 'personal',
  business_starter: 'business',
  business_pro: 'business',
  business_premium: 'business',
  enterprise: 'business',
};

export interface TierInfo {
  name: TierName;
  label: string;
  track: AccountTrack;
  /** Annual price in USD as a decimal (e.g. 19.99 for $19.99/year). 0 for free. */
  priceUsd: number | null;
  /** Stripe price ID env var name (the actual ID is server-side via process.env). */
  stripePriceEnv: string;
  /** Short marketing line for the tier card. */
  tagline: string;
}

export const TIERS: Record<TierName, TierInfo> = {
  free: {
    name: 'free',
    label: 'Free',
    track: 'personal',
    priceUsd: 0,
    stripePriceEnv: '',
    tagline: 'I want to browse',
  },
  roster: {
    name: 'roster',
    label: 'Roster Starter',
    track: 'personal',
    priceUsd: 19.99,
    stripePriceEnv: 'STRIPE_PRICE_ROSTER',
    tagline: 'Claim your profile and link unlimited kids',
  },
  roster_plus: {
    name: 'roster_plus',
    label: 'Roster Pro',
    track: 'personal',
    priceUsd: 29.99,
    stripePriceEnv: 'STRIPE_PRICE_ROSTER_PLUS',
    tagline: 'Photos, videos, and Family Hub for your kids',
  },
  pro: {
    name: 'pro',
    label: 'Roster Premium',
    track: 'personal',
    priceUsd: 59.99,
    stripePriceEnv: 'STRIPE_PRICE_PRO',
    tagline: 'Team management and advanced features',
  },
  business_starter: {
    name: 'business_starter',
    label: 'Business Starter',
    track: 'business',
    priceUsd: 29.99,
    stripePriceEnv: 'STRIPE_PRICE_BUSINESS_STARTER',
    tagline: 'Claim one business listing - rink, team, or league',
  },
  business_pro: {
    name: 'business_pro',
    label: 'Business Pro',
    track: 'business',
    priceUsd: 59.99,
    stripePriceEnv: 'STRIPE_PRICE_BUSINESS_PRO',
    tagline: 'Lead forms, DMs, and featured placement for up to 5 claims',
  },
  business_premium: {
    name: 'business_premium',
    label: 'Business Premium',
    track: 'business',
    priceUsd: 299,
    stripePriceEnv: 'STRIPE_PRICE_BUSINESS_PREMIUM',
    tagline: 'Analytics, custom branding, and advanced features for up to 25 claims',
  },
  enterprise: {
    name: 'enterprise',
    label: 'Enterprise',
    track: 'business',
    priceUsd: null,
    stripePriceEnv: '',
    tagline: 'Custom integration for large organizations',
  },
};

/**
 * Max claims per tier (both tracks).
 * Kids are unlimited within plans but don't count against this cap.
 */
export const MAX_CLAIMS_PER_TIER: Record<TierName, number> = {
  free: 0,
  roster: 1,
  roster_plus: 1,
  pro: 5,
  business_starter: 1,
  business_pro: 5,
  business_premium: 25,
  enterprise: Infinity,
};

/** Convenience: monthly outbound message cap for a tier, defaulting to 0 for unknown tiers. */
export function getMonthlyOutboundMessages(tier: TierName | string | null | undefined): number {
  if (!tier) return 0;
  // Business tiers get higher message quotas
  const businessTiers: Record<string, number> = {
    free: 0,
    roster: 100,
    roster_plus: 250,
    pro: 500,
    business_starter: 100,
    business_pro: 1000,
    business_premium: 5000,
    enterprise: Infinity,
  };
  return businessTiers[tier as TierName] ?? 0;
}

/** Convenience: max active listings for a tier. */
export function getMaxListingsForTier(tier: TierName | string | null | undefined): number {
  if (!tier) return 0;
  const limits: Record<string, number> = {
    free: 0,
    roster: 1,
    roster_plus: 3,
    pro: 5,
    business_starter: 1,
    business_pro: 5,
    business_premium: 25,
    enterprise: Infinity,
  };
  return limits[tier as TierName] ?? 0;
}

/** Format a tier's price for display. '$0' for free, '$19.99' for paid, 'Contact' for enterprise. */
export function formatTierPrice(tier: TierName): string {
  const p = TIERS[tier].priceUsd;
  if (p === null) return 'Contact';
  if (p === 0) return '$0';
  if (p === Math.floor(p)) return `$${p}`;
  return `$${p.toFixed(2)}`;
}

/** Format with the "/ year" suffix. */
export function formatTierPricePerYear(tier: TierName): string {
  const price = formatTierPrice(tier);
  if (price === 'Contact') return 'Contact for pricing';
  return `${price} / year`;
}

/** Get track for a tier (for UI routing). */
export function getTrackForTier(tier: TierName | string | null | undefined): AccountTrack {
  if (!tier) return 'personal';
  return TIER_TO_TRACK[tier as TierName] ?? 'personal';
}