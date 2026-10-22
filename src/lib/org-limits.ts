/**
 * Organization limits — server-side enforcement of the advertised quotas.
 *
 * WHY THIS FILE EXISTS
 * The pricing page advertises "1 team workspace", "up to 3 teams", "up to 10
 * teams", "unlimited teams", and player-capacity caps. Before 2026-10-22
 * NONE of those were enforced anywhere — `create_team_workspace` had no tier
 * check at all, so any free user could create unlimited teams. Advertising a
 * quota you don't enforce is both a support burden and a pricing lie.
 *
 * The rules live here so there is ONE place that decides what a tier may do.
 * The DB RPC `create_team_workspace` enforces the same numbers for
 * non-app callers; see supabase/migrations/2026-10-22_org_tier_consolidation.sql
 * and the follow-up RPC migration.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { OWNER_EMAILS } from '@/lib/admin-auth';
import {
  TEAM_LIMIT_PER_TIER,
  PLAYER_CAPACITY_PER_TIER,
  canonicalTier,
  type TierName,
} from './pricing';

/** Owner + super-admin bypass — never capped. */
export async function isPrivilegedUser(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('role, email')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return false;
  if ((data as any).role === 'super_admin' || (data as any).role === 'admin') return true;

  // OWNER_EMAILS is a hard-coded constant in src/lib/admin-auth.ts — the
  // env var of the same name is not set in every environment, so reading
  // only the env var silently disabled the owner bypass.
  const email = ((data as any).email || '').toLowerCase();
  if (!email) return false;
  if (OWNER_EMAILS.has(email)) return true;
  const ownerEmails = (process.env.OWNER_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return ownerEmails.includes(email);
}

/**
 * How many team workspaces this user currently owns.
 *
 * Counts team_workspaces rows created by this user. `owner_user_id` is the
 * authoritative owner column; `created_by` is a legacy/nullable creator
 * column. We count a team if EITHER points at the user, so a team created
 * before `owner_user_id` was populated is not orphaned from its owner.
 */
export async function countUserTeams(userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('team_workspaces')
    .select('id', { count: 'exact', head: true })
    .or(`owner_user_id.eq.${userId},created_by.eq.${userId}`);

  if (error) {
    console.error('[org-limits] countUserTeams failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

/** Resolve the effective organization tier for a user. */
export async function getUserOrgTier(userId: string): Promise<TierName> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('org_tier')
    .eq('user_id', userId)
    .maybeSingle();
  return canonicalTier((data as any)?.org_tier || 'org_free');
}

/** Team cap for a tier. Infinity = unlimited. */
export function getTeamLimit(tier: string | null | undefined): number {
  return TEAM_LIMIT_PER_TIER[canonicalTier(tier)];
}

/** Player capacity for a tier. Infinity = unlimited. */
export function getPlayerCapacity(tier: string | null | undefined): number {
  return PLAYER_CAPACITY_PER_TIER[canonicalTier(tier)];
}

export interface TeamLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  reason?: string;
}

/**
 * Check whether the user may create one more team workspace.
 */
export async function checkTeamLimit(
  userId: string,
  orgTier: string | null | undefined,
): Promise<TeamLimitResult> {
  const limit = getTeamLimit(orgTier);
  if (limit === Infinity) {
    return { allowed: true, current: 0, limit };
  }
  if (await isPrivilegedUser(userId)) {
    return { allowed: true, current: 0, limit };
  }
  const current = await countUserTeams(userId);
  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      reason:
        limit === 1
          ? 'Your plan includes 1 team workspace. Upgrade to Organization Plus for up to 3 teams.'
          : `Your plan includes ${limit} team workspaces. Upgrade for more teams.`,
    };
  }
  return { allowed: true, current, limit };
}
