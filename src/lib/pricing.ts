/**
 * Single source of truth for RinkStop subscription plans.
 *
 * PLAN STRUCTURE (revised 2026-10-22 — two-track, single-ladder org model):
 *
 * Individuals (one Verified Hockey Identity per person, unlimited roles):
 *   - Free                       (free, $0)        browse only
 *   - Hockey Passport            (verified_identity, $24.99)  participation
 *   - Hockey Passport Plus       (identity_plus, $59.99)     premium personal
 *
 * Organizations (clubs, leagues, federations, teams, associations, and
 * commercial businesses — ONE ladder for both):
 *   - Organization Free          (org_free, $0)     1 team, basic management
 *   - Organization Plus          (org_plus, $99)    multiple teams, payments
 *   - Organization Pro           (org_pro, $299)    financial reporting, API
 *   - Organization Elite         (org_elite, $599)  custom branding, analytics
 *   - Organization Enterprise    (org_enterprise, Custom)  federation governance
 *
 * ── THE TWO-COLUMN MODEL ────────────────────────────────────────────────
 * `profiles.tier` is PERSONAL only (free | verified_identity | identity_plus).
 * `profiles.org_tier` is ORGANIZATION only (org_free | org_plus | org_pro |
 * org_elite | org_enterprise). A person can hold a personal Passport AND be
 * an org owner at the same time; a single column cannot express that, and
 * letting an org purchase wipe a personal Passport would be a data-loss bug.
 *
 * ── LEGACY ALIASES ──────────────────────────────────────────────────────
 * Pre-2026-10-22 rows can still carry the old names (club_starter,
 * business_plus, federation, roster, …). Rather than a 565-site rename,
 * every tier READ is canonicalized through `canonicalTier()`, and the legacy
 * names stay resolvable in the rank tables so in-flight webhooks and gates
 * keep working. The legacy names are removed from the PUBLIC pricing surface.
 *
 * Stripe price IDs are stored in Vercel environment variables.
 *
 * Tracks: identity plans → 'personal', organization plans → 'organization'.
 * Cross-track rank comparisons are blocked.
 */

export type TierName =
  // Identity track (profiles.tier)
  | 'free'
  | 'verified_identity'
  | 'identity_plus'
  // Organization track (profiles.org_tier)
  | 'org_free'
  | 'org_plus'
  | 'org_pro'
  | 'org_elite'
  | 'org_enterprise';

export type AccountTrack = 'personal' | 'organization';

export type TierGroup = 'identity' | 'organization';

/**
 * Legacy tier name → canonical tier name.
 *
 * This is the ONLY place a legacy name is translated. Anything reading a tier
 * off the database must pass it through `canonicalTier()` first.
 */
export const LEGACY_TIER_ALIAS: Record<string, TierName> = {
  // Pre-2026-07-02 identity aliases
  roster: 'verified_identity',
  roster_plus: 'identity_plus',
  pro: 'identity_plus',
  premium: 'identity_plus',
  // Organization ladder (old names)
  club_starter: 'org_plus',
  club_pro: 'org_pro',
  club_elite: 'org_elite',
  league: 'org_enterprise',
  federation: 'org_enterprise',
  enterprise: 'org_enterprise',
  // Business ladder folded into the organization ladder
  business_listing: 'org_plus',
  business_plus: 'org_pro',
  business_starter: 'org_plus',
  business_pro: 'org_pro',
  business_premium: 'org_pro',
  // Business track also had a "free" rung; map it explicitly.
  business_free: 'org_free',
};

/**
 * Canonicalize any tier name to its current canonical form.
 * Unknown values fall back to 'free' so a bad row can never grant access.
 */
export function canonicalTier(tier: string | null | undefined): TierName {
  if (!tier) return 'free';
  const raw = tier.trim();
  if (raw in TIERS) return raw as TierName;
  if (raw in LEGACY_TIER_ALIAS) return LEGACY_TIER_ALIAS[raw];
  return 'free';
}

/**
 * Tier to track mapping.
 * Identity plans → personal, organization plans → organization.
 */
export const TIER_TO_TRACK: Record<TierName, AccountTrack> = {
  // Identity
  free: 'personal',
  verified_identity: 'personal',
  identity_plus: 'personal',
  // Organization
  org_free: 'organization',
  org_plus: 'organization',
  org_pro: 'organization',
  org_elite: 'organization',
  org_enterprise: 'organization',
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
    tagline: 'Start your Hockey Passport today — free, forever. Stamp your first 5 rinks and see how the lifetime record takes shape.',
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
      'Stamp your first 5 rinks on your Hockey Passport',
      'Verified badge reserved for Hockey Passport holders',
    ],
    footnote: 'Free is free, forever. The $24.99/yr Hockey Passport tier unlocks payments eligibility, document storage, and direct messaging — you only pay when you want the tools.',
  },
  verified_identity: {
    name: 'verified_identity',
    label: 'Hockey Passport',
    group: 'identity',
    track: 'personal',
    priceUsd: 24.99,
    stripePriceEnv: 'STRIPE_PRICE_VERIFIED_IDENTITY',
    tagline: 'Every rink you have played in, stamped. Every league circuit you finish, a shareable badge. One URL a coach, scout, or scholarship committee can open.',
    cta: 'Get My Hockey Passport',
    popular: true,
    features: [
      'Government-ID identity verification (renews every 2 years)',
      'Hockey Passport — your lifetime hockey record',
      'Stamps for every rink you visit (1,856 in our directory today)',
      'Challenge badges: finish the NHL rink circuit, all rinks in your province, your league\'s full circuit',
      'Claim a player profile',
      'Claim additional eligible roles (player, parent, coach, referee, more)',
      'Unlimited roles under one identity',
      'Parent / guardian linking',
      'Secure document storage',
      'Digital signatures',
      'Team invitations',
      'Payment eligibility',
      'Registration eligibility',
      'Hockey Passport badge on profile',
      'Priority email support',
    ],
    footnote: 'Free is free, forever. Stamp your first 5 rinks on the free tier — pay $24.99/yr when you want the full stamp history, challenges, and lifetime record.',
  },
  identity_plus: {
    name: 'identity_plus',
    label: 'Hockey Passport Plus',
    group: 'identity',
    track: 'personal',
    priceUsd: 59.99,
    stripePriceEnv: 'STRIPE_PRICE_IDENTITY_PLUS',
    tagline: 'Build your hockey story — every team, every milestone, every season, in one place anyone can find.',
    cta: 'Upgrade to Hockey Passport Plus',
    features: [
      'Everything in Hockey Passport',
      'Family Hub (link unlimited children)',
      'Stamps & attendance history on your passport',
      'Career timeline (auto-built from your data)',
      'Achievement tracking',
      'Advanced player analytics',
      '5 GB of media storage · 250 items · photos and video',
      'Advanced messaging',
      'Premium insights',
      'Priority support',
    ],
    footnote: 'Best for parents managing multiple youth players and elite athletes.',
  },

  // ── Organization track ──────────────────────────────────────────────
  org_free: {
    name: 'org_free',
    label: 'Organization Free',
    group: 'organization',
    track: 'organization',
    priceUsd: 0,
    stripePriceEnv: '',
    tagline: 'List your team on the world\'s hockey directory — free forever. Upgrade to Organization Plus for roster, schedule, events, payments, registrations, and more.',
    cta: 'Create Your Team',
    features: [
      '1 team workspace',
      'Public team directory listing',
      '100 MB of shared media storage',
    ],
    footnote: 'Free listing only — roster management, schedule, events, and attendance require Organization Plus ($99/yr).',
  },
  org_plus: {
    name: 'org_plus',
    label: 'Organization Plus',
    group: 'organization',
    track: 'organization',
    priceUsd: 99,
    stripePriceEnv: 'STRIPE_PRICE_ORG_PLUS',
    tagline: 'Everything a growing club needs — multiple teams, registrations, payments and practice plans.',
    cta: 'Upgrade to Organization Plus',
    popular: true,
    features: [
      'Everything in Organization Free',
      'Up to 3 team workspaces',
      'Registration management (programs)',
      'Payments and dues collection',
      'Practice Plans & Drills Library',
      'Up to 30 players',
      'Listing claims, leads and reviews',
      '10 GB of shared media storage',
    ],
    footnote: 'For clubs and small organizations running more than one team.',
  },
  org_pro: {
    name: 'org_pro',
    label: 'Organization Pro',
    group: 'organization',
    track: 'organization',
    priceUsd: 299,
    stripePriceEnv: 'STRIPE_PRICE_ORG_PRO',
    tagline: 'Run your organization with the numbers behind it — financial reporting, API access and promotions.',
    cta: 'Upgrade to Organization Pro',
    features: [
      'Everything in Organization Plus',
      'Up to 10 team workspaces',
      'Financial reporting (payments, outstanding, overdue)',
      'API access for team data',
      'Promotions and featured placement',
      'Multiple listings',
      'Up to 150 players',
      '50 GB of shared media storage',
    ],
    footnote: 'For mid-sized clubs and organizations that need reporting and integrations.',
  },
  org_elite: {
    name: 'org_elite',
    label: 'Organization Elite',
    group: 'organization',
    track: 'organization',
    priceUsd: 599,
    stripePriceEnv: 'STRIPE_PRICE_ORG_ELITE',
    tagline: 'Your brand, your data, your members — advanced analytics and custom branding at scale.',
    cta: 'Upgrade to Organization Elite',
    features: [
      'Everything in Organization Pro',
      'Unlimited team workspaces',
      'Custom branding',
      'Advanced analytics',
      'Priority support',
      '200 GB of shared media storage',
    ],
    footnote: 'For large clubs with multi-location or multi-region operations. Multi-location directory support ships in 2026 Q4.',
  },
  org_enterprise: {
    name: 'org_enterprise',
    label: 'Organization Enterprise',
    group: 'organization',
    track: 'organization',
    priceUsd: null,
    stripePriceEnv: '',
    tagline: 'Govern your sport at scale — member organizations, compliance, and custom integrations.',
    cta: 'Contact Sales',
    features: [
      'Federation governance and member organizations',
      'Compliance and regulatory tooling',
      'Custom integrations',
      'Dedicated success team',
      'Negotiated media capacity',
    ],
    // NOTE: literal, not derived from formatTierPrice() — this object is
    // evaluated at module load, so calling formatTierPrice() here would hit
    // the temporal dead zone on TIERS itself and crash the pricing page.
    // Keep in sync with `priceUsd` above.
    footnote: 'Custom pricing — scoped to league or federation size, with onboarding and a dedicated success manager.',
  },
};

/**
 * Canonical tier ordering for the public pricing UI.
 * Identity → Organization.
 */
export const PRICING_DISPLAY_ORDER: TierName[] = [
  // Identity
  'free',
  'verified_identity',
  'identity_plus',
  // Organization
  'org_free',
  'org_plus',
  'org_pro',
  'org_elite',
  'org_enterprise',
];

/**
 * LISTING CLAIM ALLOWANCE per tier — how many APPROVED claims (a verified
 * ownership claim on a rink / team / league / player listing) a user may hold.
 *
 * WHAT A "CLAIM" IS
 * A row in the `claims` table with status='approved' linking a user to an
 * entity they own. This is a VERIFICATION QUEUE: the user submits proof, staff
 * approve, and the approval grants listing-management rights (editing, leads,
 * reviews, featured placement).
 *
 * This is deliberately NOT the same thing as player capacity. The old name,
 * MAX_CLAIMS_PER_TIER, was carried over from a design where "claims" was
 * ambiguous and one table was doing two jobs. They are now separate constants
 * because they answer different questions and are enforced at different layers:
 *
 *   LISTING_CLAIMS_PER_TIER  → verified ownership of DIRECTORY ENTITIES
 *                               (a rink you run, a club you own). Enforced in
 *                               POST /api/claims by counting approved rows.
 *
 *   PLAYER_CAPACITY_PER_TIER → how many PLAYER RECORDS an org may manage.
 *                               Enforced in src/lib/org-limits.ts against
 *                               `players`/`managed_profiles`, not `claims`.
 *
 * Keeping them merged meant an org with 150 player capacity could be told it
 * had only 25 claims, and a user with 25 approved rink claims could be denied
 * roster spots. Both numbers were real; they were just sharing a name.
 *
 * Counts only APPROVED claims — pending submissions are in flight and must not
 * consume the cap, or a user cannot claim a second listing while the first is
 * still in review.
 *
 * `parent_managed:` reason claims are exempt at the API layer (a parent may
 * manage many children); see POST /api/claims.
 */
export const LISTING_CLAIMS_PER_TIER: Record<TierName, number> = {
  // Identity
  // WS25 (2026-08-23): free tier lifted from 0 to 1 so free users can claim
  // one listing per profile type without paying. Verification is bundled into
  // every paid subscription at no extra cost (see /api/verification/start-free).
  free: 1,
  verified_identity: 1, // claim your own player profile
  identity_plus: 5, // unlimited roles + family
  // Organization
  org_free: 1,
  org_plus: 5,
  org_pro: 25,
  org_elite: Infinity,
  org_enterprise: Infinity,
};

/**
 * DEPRECATED ALIAS — kept so existing imports keep compiling.
 *
 * Do not add new usages. This name is ambiguous by exactly the amount the
 * previous audit was trying to remove: it reads as a general "claims" cap but
 * only ever governed listing ownership claims. New code should import
 * LISTING_CLAIMS_PER_TIER (or PLAYER_CAPACITY_PER_TIER / TEAM_LIMIT_PER_TIER).
 */
export const MAX_CLAIMS_PER_TIER = LISTING_CLAIMS_PER_TIER;

/**
 * PLAYER CAPACITY per tier — how many players an organization may manage.
 * Enforced server-side (see src/lib/org-limits.ts).
 */
export const PLAYER_CAPACITY_PER_TIER: Record<TierName, number> = {
  free: Infinity,
  verified_identity: Infinity,
  identity_plus: Infinity,
  org_free: 30,
  org_plus: 30,
  org_pro: 150,
  org_elite: Infinity,
  org_enterprise: Infinity,
};

/**
 * TEAM WORKSPACE CAP per tier — how many teams an organization may create.
 * Enforced server-side in create_team_workspace + the app layer.
 */
export const TEAM_LIMIT_PER_TIER: Record<TierName, number> = {
  free: 0,
  verified_identity: 0,
  identity_plus: 0,
  org_free: 1,
  org_plus: 3,
  org_pro: 10,
  org_elite: Infinity,
  org_enterprise: Infinity,
};

/** Convenience: monthly outbound message cap for a tier, defaulting to 0 for unknown tiers. */
export function getMonthlyOutboundMessages(tier: TierName | string | null | undefined): number {
  if (!tier) return 0;
  const caps: Record<string, number> = {
    free: 0,
    verified_identity: 100,
    identity_plus: 500,
    org_free: 250,
    org_plus: 500,
    org_pro: 2000,
    org_elite: 5000,
    org_enterprise: Infinity,
  };
  return caps[canonicalTier(tier)] ?? 0;
}

/** Convenience: max active listings for a tier. */
export function getMaxListingsForTier(tier: TierName | string | null | undefined): number {
  if (!tier) return 0;
  const limits: Record<string, number> = {
    free: 1,
    verified_identity: 1,
    identity_plus: 5,
    org_free: 1,
    org_plus: 5,
    org_pro: 25,
    org_elite: Infinity,
    org_enterprise: Infinity,
  };
  return limits[canonicalTier(tier)] ?? 0;
}

/**
 * Format a raw USD amount for display.
 *
 * Exported so the thousands-separator behaviour can be unit-tested directly:
 * the old "League" tier ($1,999) is now Organization Enterprise (Custom, no
 * price), so no canonical tier exercises the four-figure path any more.
 */
export function formatTierPriceAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'Custom';
  if (amount === 0) return '$0';
  // Thousands separator, so four-figure prices read "$1,999" not "$1999".
  const whole = Math.floor(amount);
  const grouped = whole.toLocaleString('en-US');
  if (amount === whole) return `$${grouped}`;
  return `$${grouped}.${Math.round((amount - whole) * 100).toString().padStart(2, '0')}`;
}

/** Format a tier's price for display. '$0' for free, '$24.99' for paid, 'Custom' for enterprise. */
export function formatTierPrice(tier: TierName | string): string {
  const t = TIERS[canonicalTier(tier)];
  if (!t) return 'Contact';
  return formatTierPriceAmount(t.priceUsd);
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
  return TIER_TO_TRACK[canonicalTier(tier)];
}

/** Get group (identity / organization) for a tier. */
export function getGroupForTier(tier: TierName | string | null | undefined): TierGroup {
  if (!tier) return 'identity';
  return TIERS[canonicalTier(tier)].group;
}

/**
 * Returns the display label for a tier name, with safe fallback for unknown
 * (legacy DB-stored) values. Legacy names are canonicalized first, so
 * `club_starter` renders as "Organization Plus" rather than the raw string.
 */
export function getTierLabel(tier: string | null | undefined): string {
  if (!tier) return 'Free';
  const canonical = canonicalTier(tier);
  if (tier !== canonical && !(tier in TIERS)) {
    // Legacy name — show the canonical label, never the raw legacy string.
    return TIERS[canonical].label;
  }
  return TIERS[canonical].label;
}
