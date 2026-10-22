import { canonicalTier } from './pricing';
import { tierAtLeastSameTrack } from './tier-gate';

// Tier rank for directory sorting (lower = higher placement).
// This determines search result order for claimed listings.
// Higher tiers get better placement for lead capture priority.
//
// Revised 2026-10-22: placement now spans BOTH tracks. A claimer can hold a
// personal Hockey Passport AND an organization plan; the effective placement
// tier is the BEST of the two, so an org owner is placed by their org plan and
// an individual by their personal plan.
//
// The rank table is ordered across the whole ladder (not per track) because
// placement is a single sorted list in the directory — a Federation-tier
// organization outranks a Hockey Passport Plus individual.
export const TIER_RANK: Record<string, number> = {
  // Top placement: priority lead capture
  org_enterprise: 0,
  org_elite: 1,
  org_pro: 2,
  org_plus: 3,
  // Mid placement: DMs enabled, multiple claims
  identity_plus: 4,
  // Lower placement: personal focus, kid linking
  verified_identity: 7,
  // Unclaimed
  free: 8,
  org_free: 8,
};

// Legacy names retained so historical claims.tier values still rank.
const LEGACY_RANK: Record<string, number> = {
  federation: 0,
  league: 0,
  club_elite: 1,
  business_plus: 2,
  club_pro: 2,
  club_starter: 3,
  business_listing: 3,
};

// Display labels — canonical tier names only.
export const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  verified_identity: 'Hockey Passport',
  identity_plus: 'Hockey Passport Plus',
  org_free: 'Organization Free',
  org_plus: 'Organization Plus',
  org_pro: 'Organization Pro',
  org_elite: 'Organization Elite',
  org_enterprise: 'Organization Enterprise',
};

/**
 * Rank of a single tier value. Legacy names are resolved via LEGACY_RANK.
 * Unknown = 99 (unclaimed).
 */
export function rankForTier(tier: string | null | undefined): number {
  if (!tier) return 99; // unclaimed
  if (tier in TIER_RANK) return TIER_RANK[tier];
  if (tier in LEGACY_RANK) return LEGACY_RANK[tier];
  return 99;
}

/**
 * Effective placement rank for an account that may hold BOTH a personal tier
 * and an organization tier. Lower is better.
 */
export function rankForEntitlements(
  personalTier: string | null | undefined,
  orgTier?: string | null,
): number {
  const a = rankForTier(personalTier);
  const b = orgTier ? rankForTier(orgTier) : 99;
  return Math.min(a, b);
}

/**
 * Effective placement tier for an account that may hold BOTH a personal tier
 * and an organization tier. Returns the BETTER of the two, canonicalized.
 */
export function effectiveTier(
  personalTier: string | null | undefined,
  orgTier?: string | null,
): string | null {
  const a = personalTier ? canonicalTier(personalTier) : null;
  const b = orgTier ? canonicalTier(orgTier) : null;
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  return rankForTier(a) <= rankForTier(b) ? a : b;
}

/**
 * Is this claim "verified" in the directory?
 *
 * A listing is verified when its claimer holds ANY paid entitlement on
 * either track. 2026-10-22: the directory clients previously hardcoded a set
 * of legacy tier names and only ever looked at the PERSONAL column, so an
 * org-only claimer (personal tier still 'free') was never marked verified.
 */
export function isVerifiedClaim(
  personalTier: string | null | undefined,
  orgTier?: string | null,
): boolean {
  const t = effectiveTier(personalTier, orgTier);
  if (!t) return false;
  return t !== 'free' && t !== 'org_free';
}

/**
 * Is this claim "featured" in the directory?
 *
 * Featured placement is an Organization Pro feature (org_pro+), matching
 * the pricing card. Legacy `federation`/`league` map to org_enterprise and
 * legacy `business_plus` maps to org_pro, so both keep the badge.
 */
export function isFeaturedClaim(
  personalTier: string | null | undefined,
  orgTier?: string | null,
): boolean {
  if (orgTier && tierAtLeastSameTrack(orgTier, 'org_pro')) return true;
  if (personalTier && tierAtLeastSameTrack(personalTier, 'org_pro')) return true;
  return false;
}

// Comparator: by tier rank, then alphabetical by name.
export function compareByTier<T extends { name?: string; claimed_by_tier?: string | null; claimed_by_org_tier?: string | null }>(a: T, b: T): number {
  const ra = rankForEntitlements(a.claimed_by_tier, a.claimed_by_org_tier);
  const rb = rankForEntitlements(b.claimed_by_tier, b.claimed_by_org_tier);
  if (ra !== rb) return ra - rb;
  return (a.name || '').localeCompare(b.name || '');
}

// Batch-enrich a list of entities with the tier of their active claimer.
// entityType: 'rink' | 'team' | 'league' | 'player'
// Returns a Map<entity_id, { tier, org_tier, user_id, claim_id }>
export async function enrichEntitiesWithClaimTier(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  entityType: string,
  entityIds: string[]
): Promise<Map<string, { tier: string | null; org_tier: string | null; user_id: string; claim_id: string }>> {
  const out = new Map<string, { tier: string | null; org_tier: string | null; user_id: string; claim_id: string }>();
  if (!entityIds.length) return out;

  // Supabase returns 400 if the embed syntax is wrong. Use the canonical join pattern.
  const { data, error } = await supabaseAdmin
    .from('claims')
    .select('id, entity_id, user_id, claim_type, status, profiles!inner(tier, org_tier)')
    .eq('claim_type', entityType)
    .eq('status', 'approved')
    .in('entity_id', entityIds);

  if (error) {
    console.error('[enrichEntitiesWithClaimTier] failed', { entityType, error });
    return out;
  }

  for (const row of data || []) {
    // First claim wins (alphabetical by id is fine — there's only one approved per entity in practice)
    if (!out.has(row.entity_id)) {
      out.set(row.entity_id, {
        tier: row.profiles?.tier || null,
        org_tier: row.profiles?.org_tier || null,
        user_id: row.user_id,
        claim_id: row.id,
      });
    }
  }
  return out;
}

// Single-entity lookup. Used by entity detail pages to decide whether to
// render the ListingContactForm (lead capture, activity-gated since
// 2026-06-17). Returns null if unclaimed or no approved claim exists.
// Leagues are not a first-class claim type today → returns null for leagues.
export async function getEntityClaimTier(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  entityType: 'rink' | 'team' | 'league',
  entityId: string
): Promise<{ tier: string; org_tier: string | null; user_id: string; claim_id: string } | null> {
  if (entityType === 'league') return null; // not wired yet

  const { data, error } = await supabaseAdmin
    .from('claims')
    .select('id, user_id, profiles!inner(tier, org_tier)')
    .eq('claim_type', entityType)
    .eq('entity_id', entityId)
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getEntityClaimTier] failed', { entityType, entityId, error });
    return null;
  }
  if (!data) return null;
  return {
    tier: data.profiles?.tier || 'free',
    org_tier: data.profiles?.org_tier || null,
    user_id: data.user_id,
    claim_id: data.id,
  };
}
