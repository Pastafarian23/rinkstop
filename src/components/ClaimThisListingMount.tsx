import { auth } from '@clerk/nextjs/server';
import ClaimThisListing, { type ClaimEntityType } from './ClaimThisListing';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserTier, getUserOrgTier, getUserApprovedClaimCount, getMaxClaimsForTier } from '@/lib/connections';
import { resolveClaimEntity, resolveClaimEntityName, type ClaimEntityType as ResolvableEntityType } from '@/lib/claim-entity';

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
  // WS25 (2026-08-23): claimable flag gate. Pro profiles (NHL/AHL/KHL/PWHL and
  // their players) are managed by the league, not user-claimed. Render null
  // before any other work so we don't waste DB calls and we don't show a
  // claim CTA on a page where the only correct answer is "this is curated
  // by the league." The public listing page surfaces the existing 'Verified'
  // badge in this case (handled by the parent page, not this component).
  //
  // 2026-10-30 (Arnel-flagged): this used to pick the table inline —
  // 'team' -> `teams` (the LEGACY table; the public directory reads
  // `team_workspaces`) and select `id, claimable` from it (that column does
  // NOT exist on `team_workspaces` -> PostgREST 42703). The shared resolver
  // in src/lib/claim-entity.ts now owns that mapping: it searches the
  // canonical table first and falls back to the legacy one.
  //
  // 'league' is skipped: it is not a first-class claim_type (POST /api/claims
  // rejects it with 400 "Invalid claim type"). A league owner cannot
  // self-serve claim a league today — league management is gated on a
  // `league_admin` account type. The league page routes league owners to
  // /add-listing instead, which lands in the admin approval queue.
  if (entityType !== 'league') {
    let resolved = null;
    try {
      resolved = await resolveClaimEntity(entityType as ResolvableEntityType, entityId);
    } catch (e) {
      // A schema error here is OUR bug, not a missing row. Do NOT swallow it
      // into "not claimable" — that is the fail-safe-into-empty-state bug
      // class that hid the team_workspaces rename for weeks.
      console.error('[claim-cta] entity resolution failed:', e);
      throw e;
    }
    if (resolved && resolved.claimable === false) {
      return null;
    }
  }

  // === Step 1: is the listing already claimed? ===
  // Leagues aren't a first-class claim_type today (POST /api/claims rejects
  // claim_type 'league'), so there is no league claim to check. A league
  // owner requests management via /add-listing, which the admin queue
  // approves.
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
  }

  // === Step 2: auth state + tier + cap ===
  const { userId } = await auth();

  // Look up the display name once (skip if the caller already passed it).
  // The queries below only need a short field, but this keeps the rendered
  // copy consistent across all five states.
  let displayName = entityName;
  if (!displayName) {
    // 2026-10-30: this used to read `teams` for team names — the legacy
    // table. The public directory reads `team_workspaces`, so a team that
    // only exists there rendered as "this listing". Shared resolver now.
    if (entityType !== 'league') {
      displayName =
        (await resolveClaimEntityName(entityType as ResolvableEntityType, entityId)) || 'this listing';
    } else {
      const { data: leagueRow } = await supabaseAdmin
        .from('leagues')
        .select('name')
        .eq('id', entityId)
        .maybeSingle();
      displayName = (leagueRow as any)?.name || 'this league';
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
  const orgTier = await getUserOrgTier(userId);

  // === Step 2b: free tier — check if they've used their 1 free claim ===
  if (tier === 'free') {
    const { count: approvedCount } = await supabaseAdmin
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'approved');
    const usedFreeClaim = (approvedCount ?? 0) >= 1;
    if (usedFreeClaim) {
      return (
        <ClaimThisListing
          entityType={entityType}
          entityId={entityId}
          entityName={displayName}
          state={{ kind: 'free' }}
        />
      );
    }
    // Free user with room — fall through to claim_form
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

  // Cap uses the BEST entitlement across both tracks (personal + org).
  const max = Math.max(getMaxClaimsForTier(tier), getMaxClaimsForTier(orgTier));
  if (approvedCount >= max) {
    return (
      <ClaimThisListing
        entityType={entityType}
        entityId={entityId}
        entityName={displayName}
state={{ kind: 'at_cap', tier, maxClaims: max === Infinity ? -1 : max, recommendedTier: max === Infinity ? undefined : 'org_pro' }}
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
