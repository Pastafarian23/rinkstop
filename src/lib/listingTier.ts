// Tier rank used to sort listings in directory pages.
// Lower = higher in the list. Premium is always on top when claimed.
// Listings without an active claim are sorted alphabetically within the "unclaimed" bucket.
//
// Tier rename 2026-06-17: was free/supporter/verified/pro → free/starter/pro/premium/enterprise.
export const TIER_RANK: Record<string, number> = {
  enterprise: 0,
  premium: 1,
  pro: 2,
  starter: 3,
  free: 4,
};

// Display labels for each tier (consumer-facing). Single source of truth.
export const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  premium: 'Premium',
  enterprise: 'Enterprise',
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
