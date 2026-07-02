// Tier rank for directory sorting (lower = higher placement).
// This determines search result order for claimed listings.
// Higher tiers get better placement for lead capture priority.
// Identity Plus (personal) and Business Plus (business) both have DMs + photos.
//
// 2026-07-02 brief: new tier structure added; legacy aliases preserved so old
// DB-stored tier values still rank correctly during the transition.
export const TIER_RANK: Record<string, number> = {
  // Top placement: priority lead capture
  federation: 0,
  enterprise: 0,         // legacy alias for federation
  league: 1,
  business_plus: 2,
  business_premium: 2,   // legacy alias for business_plus
  club_elite: 3,
  // Mid placement: DMs enabled, multiple claims
  identity_plus: 4,
  pro: 4,                 // legacy alias for identity_plus
  business_listing: 5,
  business_pro: 5,        // legacy alias for business_listing's neighborhood
  club_pro: 5,
  club_starter: 6,
  // Lower placement: personal focus, kid linking
  verified_identity: 7,
  roster: 7,              // legacy alias for verified_identity
  roster_plus: 4,         // legacy alias for identity_plus
  business_starter: 6,   // legacy alias for club_starter
  // Unclaimed
  free: 8,
};

// Display labels - sourced from pricing.ts single source of truth via getTierLabel().
// Fallback map kept for legacy DB-stored values; getTierLabel() in pricing.ts
// already handles the modern mapping.
export const TIER_LABELS: Record<string, string> = {
  // New canonical tiers
  free: 'Free',
  verified_identity: 'Verified Identity',
  identity_plus: 'Identity Plus',
  club_starter: 'Club Starter',
  club_pro: 'Club Pro',
  club_elite: 'Club Elite',
  league: 'League',
  federation: 'Federation',
  business_listing: 'Business Listing',
  business_plus: 'Business Plus',
  // Legacy aliases — for any pre-2026-07-02 DB rows
  roster: 'Verified Identity (legacy)',
  roster_plus: 'Identity Plus (legacy)',
  pro: 'Identity Plus (legacy)',
  premium: 'Identity Plus (legacy)',
  business_starter: 'Business Listing (legacy)',
  business_pro: 'Business Listing (legacy)',
  business_premium: 'Business Plus (legacy)',
  enterprise: 'Federation (legacy)',
};

export function rankForTier(tier: string | null | undefined): number {
  if (!tier) return 99; // unclaimed
  return TIER_RANK[tier] ?? 99;
}

// Comparator: by tier rank, then alphabetical by name.
export function compareByTier<T extends { name?: string; claimed_by_tier?: string | null }>(a: T, b: T): number {
  const ra = rankForTier(a.claimed_by_tier);
  const rb = rankForTier(b.claimed_by_tier);
  if (ra !== rb) return ra - rb;
  return (a.name || '').localeCompare(b.name || '');
}

// Batch-enrich a list of entities with the tier of their active claimer.
// entityType: 'rink' | 'team' | 'league' | 'player'
// Returns a Map<entity_id, { tier, user_id, claim_id }>
export async function enrichEntitiesWithClaimTier(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  entityType: string,
  entityIds: string[]
): Promise<Map<string, { tier: string | null; user_id: string; claim_id: string }>> {
  const out = new Map<string, { tier: string | null; user_id: string; claim_id: string }>();
  if (!entityIds.length) return out;

  // Supabase returns 400 if the embed syntax is wrong. Use the canonical join pattern.
  const { data, error } = await supabaseAdmin
    .from('claims')
    .select('id, entity_id, user_id, claim_type, status, profiles!inner(tier)')
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
): Promise<{ tier: string; user_id: string; claim_id: string } | null> {
  if (entityType === 'league') return null; // not wired yet

  const { data, error } = await supabaseAdmin
    .from('claims')
    .select('id, user_id, profiles!inner(tier)')
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
    user_id: data.user_id,
    claim_id: data.id,
  };
}
