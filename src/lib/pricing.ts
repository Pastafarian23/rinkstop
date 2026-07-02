/**
 * Single source of truth for RinkStop subscription plans.
 *
 * PLAN STRUCTURE (revised 2026-07-02 — identity-first model):
 *
 * Individuals (one Verified Hockey Identity per person, unlimited roles):
 *   - Free                       (free, $0)                 browse only
 *   - Verified Identity          (verified_identity, $24.99) required for participation
 *   - Identity Plus              (identity_plus, $59.99)     premium personal features
 *
 * Organizations (clubs, leagues, federations, teams, associations):
 *   - Club Starter               (club_starter, $149)       small clubs (≤30 players)
 *   - Club Pro                   (club_pro, $399)           mid clubs (≤150 players)
 *   - Club Elite                 (club_elite, $999)         large clubs (unlimited teams)
 *   - League                     (league, $1,999)           league-wide management
 *   - Federation                 (federation, Custom)       federation governance
 *
 * Business Listings (commercial businesses, separate from orgs):
 *   - Business Listing           (business_listing, $99)    single business claim
 *   - Business Plus              (business_plus, $299)      multi-listing + features
 *
 * Legacy DB-stored tier values from pre-2026-07-02 (roster, pro, business_premium,
 * etc.) are removed from the public pricing surface entirely. The DB column can
 * still hold them for historical rows, but they are NOT exported as TierName values.
 * Code that reads `profiles.tier` should treat unknown values as 'free' and surface
 * a "plan needs to be updated" message — or run a one-time data migration script.
 *
 * Stripe price IDs are stored in Vercel environment variables. New plans will get
 * their Stripe products created on demand; until then, /api/tier/upgrade returns
 * 503 with a clear "tier_not_configured" error so the UI can show "Coming soon".
 *
 * Tracks: identity plans → 'personal', organization + business plans → 'business'.
 * This matches the existing AccountTrack type and keeps tier-gate.ts working.
 * Cross-track rank comparisons are still blocked.
 */

export type TierName =
  // Identity track
  | 'free'
  | 'verified_identity'
  | 'identity_plus'
  // Organization track
  | 'club_starter'
  | 'club_pro'
  | 'club_elite'
  | 'league'
  | 'federation'
  // Business listings track
  | 'business_listing'
  | 'business_plus';

export type AccountTrack = 'personal' | 'business';

export type TierGroup = 'identity' | 'organization' | 'business';

/**
 * Tier to track mapping.
 * Identity plans → personal, organization + business plans → business.
 */
export const TIER_TO_TRACK: Record<TierName, AccountTrack> = {
  // Identity
  free: 'personal',
  verified_identity: 'personal',
  identity_plus: 'personal',
  // Organization
  club_starter: 'business',
  club_pro: 'business',
  club_elite: 'business',
  league: 'business',
  federation: 'business',
  // Business listings
  business_listing: 'business',
  business_plus: 'business',
};

export interface TierInfo {
  name: TierName;
  label: string;
  group: TierGroup;
  track: AccountTrack;
  /** Annual price in USD as a decimal (e.g. 24.99 for $24.99/year). 0 for free. null for custom. */
  priceUsd: number | null;
  /** Stripe price ID env var name (the actual ID is server-side via process.env). */
  stripePriceEnv: string;
  /** Short marketing line for the tier card. */
  tagline: string;
  /** Primary call-to-action label. */
  cta: string;
  /** Short list of bullet-point features. */
  features: string[];
  /** Optional footnote for the tier card. */
  footnote?: string;
  /** Whether this tier is highlighted as "most popular" on the pricing page. */
  popular?: boolean;
}

export const TIERS: Record<TierName, TierInfo> = {
  // ── Identity track ──────────────────────────────────────────────────
  free: {
    name: 'free',
    label: 'Free',
    group: 'identity',
    track: 'personal',
    priceUsd: 0,
    stripePriceEnv: '',
    tagline: 'Browse the hockey ecosystem without participating.',
    cta: 'Get Started',
    features: [
      'Browse the complete hockey directory',
      'Search rinks, teams, leagues and players',
      'Save up to 3 favorites',
      'Follow up to 3 teams or players',
      'Read reviews',
      'Public profile',
    ],
    footnote: 'No identity verification, no claim, no team management.',
  },
  verified_identity: {
    name: 'verified_identity',
    label: 'Verified Identity',
    group: 'identity',
    track: 'personal',
    priceUsd: 24.99,
    stripePriceEnv: 'STRIPE_PRICE_VERIFIED_IDENTITY',
    tagline: 'Required for active participation in the Rinkstop ecosystem.',
    cta: 'Verify My Identity',
    popular: true,
    features: [
      'Regulatory identity verification',
      'Verification renewal every two years',
      'Claim player profile',
      'Claim additional eligible roles',
      'Unlimited roles under one identity',
      'Parent/guardian linking',
      'Secure document storage',
      'Digital signatures',
      'Team invitations',
      'Payment eligibility',
      'Registration eligibility',
      'Verified Identity badge',
      'Priority email support',
    ],
    footnote: 'One Verified Hockey Identity holds every role you accumulate.',
  },
  identity_plus: {
    name: 'identity_plus',
    label: 'Identity Plus',
    group: 'identity',
    track: 'personal',
    priceUsd: 59.99,
    stripePriceEnv: 'STRIPE_PRICE_IDENTITY_PLUS',
    tagline: 'Everything in Verified Identity plus premium personal features.',
    cta: 'Upgrade to Identity Plus',
    features: [
      'Everything in Verified Identity',
      'Family Hub',
      'Unlimited children',
      'Career timeline',
      'Advanced player analytics',
      'Unlimited photos',
      'Unlimited videos',
      'Achievement tracking',
      'Advanced messaging',
      'Premium insights',
      'Priority support',
    ],
    footnote: 'Best for parents managing multiple youth players and elite athletes.',
  },

  // ── Organization track ──────────────────────────────────────────────
  club_starter: {
    name: 'club_starter',
    label: 'Club Starter',
    group: 'organization',
    track: 'business',
    priceUsd: 149,
    stripePriceEnv: 'STRIPE_PRICE_CLUB_STARTER',
    tagline: 'Designed for small clubs.',
    cta: 'Start Your Club',
    features: [
      'One organization',
      'Team management',
      'Registration management',
      'Scheduling',
      'Attendance',
      'Payments',
      'Website',
      'Up to 30 players',
    ],
    footnote: 'Designed for small clubs just getting organized.',
  },
  club_pro: {
    name: 'club_pro',
    label: 'Club Pro',
    group: 'organization',
    track: 'business',
    priceUsd: 399,
    stripePriceEnv: 'STRIPE_PRICE_CLUB_PRO',
    tagline: 'Mid-sized clubs — up to 150 players, multiple teams.',
    cta: 'Upgrade to Club Pro',
    popular: true,
    features: [
      'Everything in Club Starter',
      'Up to 150 players',
      'Multiple teams',
      'Coach management',
      'Volunteer management',
      'Equipment management',
      'Financial reporting',
      'Player transfers',
      'Advanced organization tools',
    ],
    footnote: 'For mid-sized clubs running multiple teams.',
  },
  club_elite: {
    name: 'club_elite',
    label: 'Club Elite',
    group: 'organization',
    track: 'business',
    priceUsd: 999,
    stripePriceEnv: 'STRIPE_PRICE_CLUB_ELITE',
    tagline: 'Large clubs — unlimited teams, advanced analytics, custom branding.',
    cta: 'Go Club Elite',
    features: [
      'Everything in Club Pro',
      'Unlimited teams',
      'Advanced analytics',
      'Custom branding',
      'API access',
      'Bulk imports',
      'Multi-location support',
      'Priority support',
    ],
    footnote: 'For large clubs with multi-location or multi-region operations.',
  },
  league: {
    name: 'league',
    label: 'League',
    group: 'organization',
    track: 'business',
    priceUsd: 1999,
    stripePriceEnv: 'STRIPE_PRICE_LEAGUE',
    tagline: 'League-wide management features.',
    cta: 'Contact Sales',
    features: [
      'League-wide management features',
      'Custom pricing based on scope',
      'Onboarding and migration support',
      'Dedicated success manager',
    ],
    footnote: 'Starting at $1,999/year — pricing scales with league size.',
  },
  federation: {
    name: 'federation',
    label: 'Federation',
    group: 'organization',
    track: 'business',
    priceUsd: null,
    stripePriceEnv: '',
    tagline: 'Federation governance, compliance and enterprise capabilities.',
    cta: 'Contact Sales',
    features: [
      'Federation governance',
      'Compliance and regulatory tools',
      'Enterprise capabilities',
      'Custom integrations',
      'Dedicated success team',
    ],
    footnote: 'Custom pricing — federations are scoped per engagement.',
  },

  // ── Business listings track ─────────────────────────────────────────
  business_listing: {
    name: 'business_listing',
    label: 'Business Listing',
    group: 'business',
    track: 'business',
    priceUsd: 99,
    stripePriceEnv: 'STRIPE_PRICE_BUSINESS_LISTING',
    tagline: 'Verified business listing with contact, lead form, photos, analytics.',
    cta: 'Claim Listing',
    features: [
      'Verified business listing',
      'Contact information',
      'Lead form',
      'Photos',
      'Analytics',
    ],
    footnote: 'For commercial businesses — hockey shops, sharpeners, clinics, trainers, equipment rental, travel, photography.',
  },
  business_plus: {
    name: 'business_plus',
    label: 'Business Plus',
    group: 'business',
    track: 'business',
    priceUsd: 299,
    stripePriceEnv: 'STRIPE_PRICE_BUSINESS_PLUS',
    tagline: 'Multi-listing, featured placement, promotions, messaging, bookings.',
    cta: 'Upgrade to Business Plus',
    features: [
      'Everything in Business Listing',
      'Multiple listings',
      'Featured placement',
      'Promotions',
      'Messaging',
      'Enhanced analytics',
      'Booking support',
    ],
    footnote: 'For multi-location businesses and high-volume service providers.',
  },
};

/**
 * Canonical tier ordering for the public pricing UI.
 * Identity → Organization → Business.
 */
export const PRICING_DISPLAY_ORDER: TierName[] = [
  // Identity
  'free',
  'verified_identity',
  'identity_plus',
  // Organization
  'club_starter',
  'club_pro',
  'club_elite',
  'league',
  'federation',
  // Business
  'business_listing',
  'business_plus',
];

/**
 * Max claims per tier. Used by feature gating.
 * Identity plans can claim their own player profile + linked kids/family.
 * Organization plans have player-capacity caps (player slots, not claim slots).
 * Business plans cap the number of business listings one user can claim.
 */
export const MAX_CLAIMS_PER_TIER: Record<TierName, number> = {
  // Identity
  free: 0,
  verified_identity: 1, // claim your own player profile
  identity_plus: 5, // unlimited roles + family
  // Organization (player capacity)
  club_starter: 30,
  club_pro: 150,
  club_elite: Infinity,
  league: Infinity,
  federation: Infinity,
  // Business listings
  business_listing: 1,
  business_plus: 25,
};

/** Convenience: monthly outbound message cap for a tier, defaulting to 0 for unknown tiers. */
export function getMonthlyOutboundMessages(tier: TierName | string | null | undefined): number {
  if (!tier) return 0;
  const caps: Record<string, number> = {
    free: 0,
    verified_identity: 100,
    identity_plus: 500,
    club_starter: 500,
    club_pro: 2000,
    club_elite: 5000,
    league: 10000,
    federation: Infinity,
    business_listing: 100,
    business_plus: 1000,
  };
  return caps[tier] ?? 0;
}

/** Convenience: max active listings for a tier. */
export function getMaxListingsForTier(tier: TierName | string | null | undefined): number {
  if (!tier) return 0;
  const limits: Record<string, number> = {
    free: 0,
    verified_identity: 0,
    identity_plus: 0,
    club_starter: 30,
    club_pro: 150,
    club_elite: Infinity,
    league: Infinity,
    federation: Infinity,
    business_listing: 1,
    business_plus: 25,
  };
  return limits[tier] ?? 0;
}

/** Format a tier's price for display. '$0' for free, '$24.99' for paid, 'Custom' for federation. */
export function formatTierPrice(tier: TierName | string): string {
  const t = TIERS[tier as TierName];
  if (!t) return 'Contact';
  const p = t.priceUsd;
  if (p === null || p === undefined) return 'Custom';
  if (p === 0) return '$0';
  if (p === Math.floor(p)) return `$${p}`;
  return `$${p.toFixed(2)}`;
}

/** Format with the "/ year" suffix. */
export function formatTierPricePerYear(tier: TierName | string): string {
  const price = formatTierPrice(tier);
  if (price === 'Custom') return 'Custom pricing';
  if (price === '$0') return 'Free';
  return `${price} / year`;
}

/** Get track for a tier (for UI routing). */
export function getTrackForTier(tier: TierName | string | null | undefined): AccountTrack {
  if (!tier) return 'personal';
  return TIER_TO_TRACK[tier as TierName] ?? 'personal';
}

/** Get group (identity / organization / business) for a tier. */
export function getGroupForTier(tier: TierName | string | null | undefined): TierGroup {
  if (!tier) return 'identity';
  return TIERS[tier as TierName]?.group ?? 'identity';
}

/**
 * Returns the display label for a tier name, with safe fallback for unknown
 * (legacy DB-stored) values. Used in subscription display, profile tier badges,
 * and any other UI surface where a tier name is shown.
 */
export function getTierLabel(tier: string | null | undefined): string {
  if (!tier) return 'Free';
  const t = TIERS[tier as TierName];
  if (t) return t.label;
  // Legacy / unknown values from pre-2026-07-02 DB rows. Map the common ones;
  // fall back to the raw string so we never silently drop information.
  const legacy: Record<string, string> = {
    roster: 'Verified Identity (legacy)',
    roster_plus: 'Identity Plus (legacy)',
    pro: 'Identity Plus (legacy)',
    premium: 'Identity Plus (legacy)',
    starter: 'Verified Identity (legacy)',
    business_starter: 'Business Listing (legacy)',
    business_pro: 'Business Listing (legacy)',
    business_premium: 'Business Plus (legacy)',
    enterprise: 'Federation (legacy)',
  };
  return legacy[tier] ?? tier;
}