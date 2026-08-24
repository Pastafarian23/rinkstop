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
    tagline: 'Browse, follow, claim your profile, and verify your identity — free, forever.',
    cta: 'Join Free',
    features: [
      'Browse the complete hockey directory',
      'Search rinks, teams, leagues and players',
      'Save unlimited favorites',
      'Follow unlimited teams or players',
      'Read reviews',
      'Public profile',
      'Claim 1 listing (player, team, rink, or league) — free',
      'Free identity verification (government ID + selfie, ~60 seconds)',
      'Verified owner badge after verification',
    ],
    footnote: 'Free is free, forever. The $24.99/yr Verified Identity tier adds the Hockey Passport, payments eligibility, document storage, and direct messaging — you only pay when you want the tools.',
  },
  verified_identity: {
    name: 'verified_identity',
    label: 'Verified Identity',
    group: 'identity',
    track: 'personal',
    priceUsd: 24.99,
    stripePriceEnv: 'STRIPE_PRICE_VERIFIED_IDENTITY',
    tagline: "Get a verified checkmark so coaches, scouts, and program directors know you're real.",
    cta: 'Verify My Identity',
    popular: true,
    features: [
      'Government-ID identity verification (renews every 2 years)',
      'Hockey Passport (digital career record)',
      'Claim a player profile',
      'Claim additional eligible roles',
      'Unlimited roles under one identity',
      'Parent / guardian linking',
      'Secure document storage',
      'Digital signatures',
      'Team invitations',
      'Payment eligibility',
      'Registration eligibility',
      'Verified Identity badge on profile',
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
    tagline: 'Build your hockey story — every team, every milestone, every season, in one place anyone can find.',
    cta: 'Upgrade to Identity Plus',
    features: [
      'Everything in Verified Identity',
      'Family Hub (link unlimited children)',
      'Stamps & attendance history on your passport',
      'Career timeline (auto-built from your data)',
      'Achievement tracking',
      'Advanced player analytics',
      'Unlimited photos & videos',
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
    tagline: 'Get your club in front of every coach, scout, and family searching for hockey in your area.',
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
    tagline: 'Showcase every team, track every player, and give coaches, scouts, and families one place to find schedules and standings.',
    cta: 'Upgrade to Club Pro',
    popular: true,
    features: [
      'Everything in Club Starter',
      'Up to 150 players',
      'Multiple teams',
      'Coach & volunteer rosters',
      'Practice Plans & Drills Library',
      'Financial reporting (payments, outstanding, overdue)',
      'Player transfers',
      'Stamp verification (coach-verified passport rows)',
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
    tagline: 'Run a hockey organization at scale — your brand, your data, your members in one place, visible to the whole hockey world.',
    cta: 'Go Club Elite',
    features: [
      'Everything in Club Pro',
      'Unlimited teams',
      'Advanced analytics',
      'Custom branding',
      'API access',
      'Priority support',
    ],
    footnote: 'For large clubs with multi-location or multi-region operations. Multi-location directory support ships in 2026 Q4.',
  },
  league: {
    name: 'league',
    label: 'League',
    group: 'organization',
    track: 'business',
    priceUsd: 1999,
    stripePriceEnv: 'STRIPE_PRICE_LEAGUE',
    tagline: 'Publish standings, schedules, and stats for every team — automatically, visible to every coach and scout.',
    cta: 'Get Started',
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
    tagline: 'Govern your sport at the national level — member verification, compliance, and analytics across every member organization.',
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
    tagline: 'Get found by coaches, scouts, and parents searching for hockey services in your city.',
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
    tagline: 'Multi-location visibility, featured placement, booking, and messaging — turn your hockey business into a lead engine.',
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
  // WS25 (2026-08-23): free tier lifted from 0 to 1 so free users can claim
  // one listing per profile type without paying. Verification is bundled into
  // every paid subscription at no extra cost (see /api/verification/start-free).
  free: 1,
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
  // Unknown tier value — shouldn't happen after the 2026-07-02 data migration
  // (see supabase/migrations/2026-07-02_remove_old_tier_names.sql). Return the
  // raw string so we never silently drop information.
  return tier;
}