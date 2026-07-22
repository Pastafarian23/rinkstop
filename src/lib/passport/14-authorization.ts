/**
 * src/lib/passport/14-authorization.ts
 *
 * WS4 Chunk 1 — Account-type-aware authorization resolver.
 *
 * Replaces the binary `isStaff: boolean` parameter that WS3.5 PR2/PR3/PR4
 * threaded through the stamp dispute service. Instead of asking "is this
 * user staff?", callers ask `getAuthorizationContext(userId)` and get a
 * structured AuthorizationContext object describing what the user can do.
 *
 * Chunk 1 scope: resolve staff + rink_operator (claim-gated) only. League
 * admin and team admin paths return DENY (chunk 3 will wire those up).
 * Referee and coach scopes are exposed but unused in chunk 1 (chunk 2 will
 * consume them).
 *
 * Flag behavior:
 *   STAMPS_PERMISSIONS_V2_ENABLED=false → callers should use the old
 *     isStaff: boolean path. The resolver exists but is not consulted.
 *   STAMPS_PERMISSIONS_V2_ENABLED=true  → service methods call the
 *     resolver internally based on callerUserId.
 *
 * Why a flag: introducing a permission model that touches every auth check
 * is risky. Gate the cutover so we can flip back instantly if chunk 1 has
 * a bug. No migration to roll back, no data to clean up.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { isPassportFlagEnabled } from './02-feature-flags';

/**
 * What a user is allowed to do, computed from profile_account_types + claims
 * + profiles.role. Empty arrays mean "no grants of this kind" — the caller
 * decides whether that maps to 403 or to a public read.
 */
export interface AuthorizationContext {
  userId: string;

  /** System-wide admin. profiles.role IN ('admin', 'super_admin'). */
  isStaff: boolean;

  /** Rink operator via approved `claims` row. */
  rinkOperator: {
    rinkIds: string[];
  };

  /** League admin. Empty in chunk 1 — wired up in chunk 3. */
  leagueAdmin: {
    leagueIds: string[];
  };

  /** Team admin via team_workspaces. Empty in chunk 1 — chunk 3. */
  teamAdmin: {
    teamIds: string[];
  };

  /** Coach via team_members. Empty in chunk 1 — chunk 2 lights up referee tools. */
  coach: {
    teamIds: string[];
  };

  /** Referee self-identification. False unless `referee` in profile_account_types. */
  isReferee: boolean;

  /**
   * WS4 Chunk 2 — venue_event ids this user is assigned to officiate.
   * Empty for non-referees. Used by /dashboard/referee to filter the
   * referee's calendar and games list without a second roundtrip.
   * Populated from public.referee_game_assignments regardless of
   * REFEREE_TOOLS_ENABLED (resolver reads don't depend on the flag).
   */
  referee: {
    assignedEventIds: string[];
  };

  /** Parent — has managed_profiles rows where they are the manager. */
  parent: {
    managedUserIds: string[];
  };

  /** True if the user has any operator/admin/staff permission at all. */
  hasAnyOperatorGrant: boolean;
}

/**
 * Per the spec: only staff + rink_operator are wired in chunk 1.
 * Anything past that returns empty / false so the resolver is honest
 * about what's currently usable.
 */
export async function getAuthorizationContext(
  userId: string
): Promise<AuthorizationContext> {
  // Step 1: peek at account types so we know whether to fetch referee
  // assignments (saves a query for non-referees).
  const { data: accountTypesData } = await supabaseAdmin
    .from('profile_account_types')
    .select('account_type')
    .eq('user_id', userId);
  const accountTypes = new Set(
    (accountTypesData ?? []).map((r) => r.account_type as string)
  );
  const isRefereeFlag = accountTypes.has('referee');

  // Parallel fetches: profile role, rink claims, managed profiles, and
  // (if referee) assigned event ids. League/team/coach fields stay empty
  // for chunk 1; chunk 3 wires those up.
  const [
    profileRes,
    rinkClaimsRes,
    managedRes,
    refereeEventRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('claims')
      .select('entity_id')
      .eq('user_id', userId)
      .eq('claim_type', 'rink')
      .eq('status', 'approved'),
    supabaseAdmin
      .from('managed_profiles')
      .select('id')
      .eq('manager_user_id', userId),
    isRefereeFlag
      ? supabaseAdmin
          .from('referee_game_assignments')
          .select('venue_event_id')
          .eq('referee_user_id', userId)
      : Promise.resolve({ data: [] as Array<{ venue_event_id: string }> | null, error: null }),
  ]);

  const role = profileRes.data?.role as string | undefined;
  const isStaff = role === 'admin' || role === 'super_admin';

  const isReferee = isRefereeFlag;

  const rinkIds = (rinkClaimsRes.data ?? [])
    .map((r) => r.entity_id as string)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const managedUserIds = (managedRes.data ?? [])
    .map((r) => r.id as string)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const assignedEventIds = (refereeEventRes.data ?? [])
    .map((r) => r.venue_event_id as string)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const hasAnyOperatorGrant =
    isStaff || rinkIds.length > 0 || managedUserIds.length > 0;

  return {
    userId,
    isStaff,
    rinkOperator: { rinkIds },
    leagueAdmin: { leagueIds: [] }, // chunk 3
    teamAdmin: { teamIds: [] },     // chunk 3
    coach: { teamIds: [] },         // chunk 2
    isReferee,
    referee: { assignedEventIds },
    parent: { managedUserIds },
    hasAnyOperatorGrant,
  };
}

/**
 * Returns true iff the V2 permission resolver should be consulted.
 *
 * Per spec: when this flag is false, callers should use the legacy
 * `isStaff: boolean` parameter path. When true, service methods call
 * getAuthorizationContext internally based on callerUserId.
 */
export function isPermissionsV2Enabled(): boolean {
  return isPassportFlagEnabled('STAMPS_PERMISSIONS_V2_ENABLED');
}

/**
 * Helper used by the dispute service (chunk 1): can this caller adjudicate
 * a stamp against the given target? Encapsulates the staff-or-rink-operator
 * decision that today's code inlines across 3 service methods.
 *
 * Chunk 1 only: staff → yes; rink operator → only if their rinkIds includes
 * the target's rinkId. venue/event targets → only staff (matching today's
 * behavior). League/team admin paths return false (chunk 3 wires them up).
 */
export function canAdjudicateOn(
  authz: AuthorizationContext,
  target: {
    targetType: 'rink' | 'venue' | 'event';
    targetRinkId?: string | null;
  }
): boolean {
  if (authz.isStaff) return true;

  if (target.targetType === 'rink') {
    if (!target.targetRinkId) return false;
    return authz.rinkOperator.rinkIds.includes(target.targetRinkId);
  }

  // venue / event — staff-only in v1.
  return false;
}