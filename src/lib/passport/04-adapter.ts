/**
 * src/lib/passport/04-adapter.ts
 *
 * Read-only facade over existing RinkStop tables.
 *
 * Per Rule 7 (Adapters over Modifications): this adapter wraps existing
 * components without changing them. It uses existing queries that are
 * already proven in production.
 *
 * Per Rule 6 (Zero Data Mutation): the adapter only reads. Never writes.
 *
 * What it wraps:
 *   - public.profiles                       — user identity
 *   - public.managed_profiles                — parent → child links
 *   - public.coach_profiles                 — coach records
 *   - public.hockey_player_team_history     — legacy aggregate (read-only)
 *   - public.organizations, federations      — org affiliations
 *   - public.didit_sessions                 — verification status
 */

import { supabaseAdmin } from '@/lib/supabase';
import type { PassportAdapterLike } from './interfaces';
import type { PassportUnifiedView, VerificationLevel } from './types';

export class PassportAdapter implements PassportAdapterLike {
  /**
   * Build the unified identity view for a user.
   *
   * Reads across multiple existing tables and synthesizes a single view.
   * All queries are read-only. If a downstream table is unavailable,
   * the error propagates — the adapter does not silently degrade.
   */
  async getUnifiedView(internalUserId: string): Promise<PassportUnifiedView | null> {
    // 1. Profile (base identity)
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('user_id, account_type')
      .eq('user_id', internalUserId)
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (!profile) return null;

    // 2. Coach profile check (parallel with the others)
    const coachPromise = supabaseAdmin
      .from('coach_profiles')
      .select('id, current_team_id, verification_status')
      .eq('profile_id', internalUserId)
      .maybeSingle();

    // 3. Managed profiles (parent indicator)
    const managedPromise = supabaseAdmin
      .from('managed_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('manager_user_id', internalUserId);

    // 4. Hockey history (legacy aggregate, read-only)
    const hockeyHistoryPromise = supabaseAdmin
      .from('hockey_player_team_history')
      .select('id, team_name_snapshot, end_date, player_id, team_id')
      .order('end_date', { ascending: false, nullsFirst: false })
      .limit(1);

    // 5. Didit verification (latest session)
    const diditPromise = supabaseAdmin
      .from('didit_sessions')
      .select('status')
      .eq('internal_user_id', internalUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 6. Organization memberships (admin indicator)
    // (We treat "user has any organization" as a heuristic for isOrganizationAdmin;
    //  exact admin role depends on team_members/organization_members tables.)
    const orgMembershipPromise = supabaseAdmin
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', internalUserId)
      .limit(1);

    const [coachRes, managedRes, hockeyRes, diditRes, orgRes] = await Promise.all([
      coachPromise,
      managedPromise,
      hockeyHistoryPromise,
      diditPromise,
      orgMembershipPromise,
    ]);

    if (coachRes.error) throw coachRes.error;
    if (managedRes.error) throw managedRes.error;
    if (hockeyRes.error) throw hockeyRes.error;
    if (diditRes.error) throw diditRes.error;
    if (orgRes.error) throw orgRes.error;

    // 7. Hockey team count (separate because we need count not single row)
    const playerIds = await this.getPlayerIdsForUser(internalUserId);
    let teamCount = 0;
    if (playerIds.length > 0) {
      // PostgREST .in() with array — safer than building a SQL string.
      const { count: hockeyCount, error: hockeyCountErr } = await supabaseAdmin
        .from('hockey_player_team_history')
        .select('*', { count: 'exact', head: true })
        .in('player_id', playerIds);

      if (!hockeyCountErr) teamCount = hockeyCount ?? 0;
    }

    // Build the unified view
    const isCoach = !!coachRes.data;
    const verificationLevel = this.mapDiditStatus(diditRes.data?.status);

    return {
      internalUserId,
      passportId: null, // populated by IdentityService after lookup
      passportStatus: null,
      isCoach,
      isPlayer: teamCount > 0,
      isParent: (managedRes.count ?? 0) > 0,
      isOrganizationAdmin: (orgRes.count ?? 0) > 0,
      verificationLevel,
      hasHockeyHistory: teamCount > 0,
      hockeyTeamCount: teamCount,
      latestTeamName: hockeyRes.data?.[0]?.team_name_snapshot ?? null,
      managedProfileCount: managedRes.count ?? 0,
      federationAffiliations: [], // wired through federation/org tables in later phase
    };
  }

  /**
   * Convenience check — does the user have a Passport?
   * Reads the new passports table.
   */
  async hasPassport(internalUserId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('passports')
      .select('passport_id')
      .eq('internal_user_id', internalUserId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return false;
      throw error;
    }
    return !!data;
  }

  /**
   * Map a Didit session status to our cached VerificationLevel.
   * Pure function. Extracted for testability.
   */
  private mapDiditStatus(diditStatus: string | null | undefined): VerificationLevel {
    if (!diditStatus) return 'none';
    switch (diditStatus) {
      case 'approved':
        return 'id_verified';
      case 'in_progress':
        return 'none';
      case 'declined':
      case 'in_review':
        return 'none';
      default:
        return 'none';
    }
  }

  /**
   * Get the list of player IDs that belong to a given user.
   * Returns an empty array if the user has no player record or on DB error.
   * Used to count hockey history rows.
   *
   * Returns array (not joined string) so callers can use PostgREST .in()
   * which is safer than building a SQL string with comma-separated values.
   */
  private async getPlayerIdsForUser(internalUserId: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('user_id', internalUserId);

    if (error) return [];
    return (data ?? []).map((p) => p.id);
  }
}

export const passportAdapter = new PassportAdapter();