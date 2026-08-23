import { auth } from '@clerk/nextjs/server';
import ClaimThisListing, { type ClaimEntityType } from './ClaimThisListing';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserTier, getUserApprovedClaimCount, getMaxClaimsForTier } from '@/lib/connections';

/**
 * Server wrapper for the "Claim this listing" CTA.
 *
 * Renders on unclaimed rink / team / league / player detail pages. Sits next
 * to (and is mutually exclusive with) the existing `ClaimedBy` component,
 * which renders when the listing IS claimed.
 *
 * State resolution:
 *  - If the entity has an approved claim → render null (ClaimedBy is showing instead)
 *  - If signed out → "Sign in to claim" CTA
 *  - If free tier → "Upgrade to claim" CTA
 *  - If paid tier at cap → "At cap — upgrade to Pro" CTA
 *  - If paid tier with room AND an existing pending claim → "Pending review" CTA
 *  - If paid tier with room AND no pending claim → "Claim this X" form
 */
export default async function ClaimThisListingMount({
  entityType,
  entityId,
  entityName,
}: {
  entityType: ClaimEntityType;
  entityId: string;
  entityName?: string;
}) {
  // WS25 (2026-08-23): claimable flag gate. Pro profiles (NHL/AHL/KHL/PWHL and
  // their players) are managed by the league, not user-claimed. Render null
  // before any other work so we don't waste DB calls and we don't show a
  // claim CTA on a page where the only correct answer is "this is curated
  // by the league." The public listing page surfaces the existing 'Verified'
  // badge in this case (handled by the parent page, not this component).
  const claimableTable = entityType === 'player' ? 'players' : entityType === 'team' ? 'teams' : entityType === 'league' ? 'leagues' : 'rinks';
  const { data: claimableRow } = await supabaseAdmin
    .from(claimableTable)
    .select('id, claimable')
    .eq('id', entityId)
    .maybeSingle();
  if (claimableRow && claimableRow.claimable === false) {
    return null;
  }

  // === Step 1: is the listing already claimed? ===
  // Leagues aren't a first-class claim_type today, so we check the underlying
  // team's claim when entityType is 'league'. For now, if we can't resolve a
  // claim for a league, we still show the CTA — better to over-ask than hide.
  if (entityType !== 'league') {
    const { data: existingClaim } = await supabaseAdmin
      .from('claims')
      .select('id, status')
      .eq('claim_type', entityType)
      .eq('entity_id', entityId)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle();

    if (existingClaim) {
      // ClaimedBy is rendering in this slot — don't double up.
      return null;
    }
  } else {
    // League: best-effort — look up any approved team-claim for any team in the league.
    // If we can match a team and it's claimed, hide the CTA. Otherwise show it.
    const { data: league } = await supabaseAdmin
      .from('leagues')
      .select('id')
      .eq('id', entityId)
      .single();

    if (league) {
      const { data: claimedTeam } = await supabaseAdmin
        .from('claims')
        .select('id')
        .eq('claim_type', 'team')
        .eq('status', 'approved')
        .limit(1)
        // We don't have a league_id on claims, so this is intentionally a coarse check.
        // A future improvement: add a league_id column or join via team→league_id.
        .maybeSingle();

      if (claimedTeam) {
        // Heuristic: some team somewhere is claimed. We can't tell if it's in THIS league.
        // Default to showing the CTA — over-asking is the safer bet for unclaimed pages.
      }
    }
  }

  // === Step 2: auth state + tier + cap ===
  const { userId } = await auth();

  // Look up the display name once (skip if the caller already passed it).
  // The queries below only need a short field, but this keeps the rendered
  // copy consistent across all five states.
  let displayName = entityName;
  if (!displayName) {
    const table = entityType === 'player' ? 'players'
                : entityType === 'team' ? 'teams'
                : entityType === 'rink' ? 'rinks'
                : 'leagues';
    const nameCol = entityType === 'player' ? 'first_name, last_name' : 'name';
    const { data: row } = await supabaseAdmin
      .from(table)
      .select(nameCol)
      .eq('id', entityId)
      .maybeSingle();
    if (row) {
      displayName = entityType === 'player'
        ? `${(row as any).first_name ?? ''} ${(row as any).last_name ?? ''}`.trim() || 'this player'
        : (row as any).name || 'this listing';
    } else {
      displayName = 'this listing';
    }
  }

  if (!userId) {
    return (
      <ClaimThisListing
        entityType={entityType}
        entityId={entityId}
        entityName={displayName}
        state={{ kind: 'signed_out' }}
      />
    );
  }

  const tier = await getUserTier(userId);
  if (tier === 'free') {
    return (
      <ClaimThisListing
        entityType={entityType}
        entityId={entityId}
        entityName={displayName}
        state={{ kind: 'free' }}
      />
    );
  }

  // === Step 3: paid tier — cap check + pending check ===
  const [approvedCount, pendingResult] = await Promise.all([
    getUserApprovedClaimCount(userId),
    supabaseAdmin
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('entity_id', entityId)
      .eq('claim_type', entityType === 'league' ? 'team' : entityType),
  ]);

  const hasPending = (pendingResult.count ?? 0) > 0;
  if (hasPending) {
    return (
      <ClaimThisListing
        entityType={entityType}
        entityId={entityId}
        entityName={displayName}
        state={{ kind: 'pending', tier }}
      />
    );
  }

  const max = getMaxClaimsForTier(tier);
  if (approvedCount >= max) {
    return (
      <ClaimThisListing
        entityType={entityType}
        entityId={entityId}
        entityName={displayName}
state={{ kind: 'at_cap', tier, maxClaims: max === Infinity ? -1 : max, recommendedTier: tier === 'identity_plus' ? 'identity_plus' : tier === 'federation' ? 'federation' : 'business_plus' }}
      />
    );
  }

  // === Step 4: claim form ===
  return (
    <ClaimThisListing
      entityType={entityType}
      entityId={entityId}
      entityName={displayName}
      state={{ kind: 'claim_form', entityType, entityId, entityName: displayName }}
    />
  );
}
