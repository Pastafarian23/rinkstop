/**
 * Team management authorization.
 *
 * One rule, used by both the roster page and its API, so the UI and the
 * server can never disagree about who may edit a roster.
 *
 * Authority is ROLE-SCOPED PER TEAM, not per user: a user may be the head
 * coach of team A and a parent rep on team B, and each of those grants
 * different rights. The 16 roles live in `src/lib/team.ts` (TEAM_ROLES).
 *
 * Two ways to hold authority over a team:
 *   1. An APPROVED claim on the team (claim_type='team'). This is the
 *      ownership path — the person who claimed the listing.
 *   2. A `team_members` row with an admin role (head_coach, assistant_coach,
 *      goalie_coach, manager, team_staff, president, vice_president,
 *      secretary, treasurer, board_member, safety_officer).
 *
 * Roster RIGHTS (not just read access) additionally require the
 * organization's roster feature. The ladder in `src/lib/pricing.ts`:
 *   org_free       $0    1 team, listing management only
 *   org_plus       $99   multiple teams, roster/schedule/events, payments
 *   org_pro        $299  financial reporting, API
 *   org_elite      $599  custom branding, analytics
 *   org_enterprise Custom federation governance
 *
 * The org tier is read from `profiles.org_tier` — the ORGANIZATION track.
 * A person can hold a personal Passport AND an organization tier; the
 * roster is an organization feature.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { getUserOrgTier } from '@/lib/connections';

/** Roles that may manage a roster. Mirrors ADMIN_ROLES in the team pages. */
export const ROSTER_ADMIN_ROLES = [
  'head_coach',
  'assistant_coach',
  'goalie_coach',
  'skills_coach',
  'manager',
  'team_staff',
  'president',
  'vice_president',
  'secretary',
  'treasurer',
  'board_member',
  'safety_officer',
] as const;

export type RosterAdminRole = (typeof ROSTER_ADMIN_ROLES)[number];

/** Org tiers that include roster management. */
export const ROSTER_ORG_TIERS = ['org_plus', 'org_pro', 'org_elite', 'org_enterprise'] as const;

export type TeamAuthority = {
  /** The user may view the roster. */
  canView: boolean;
  /** The user may add/remove/edit roster rows. */
  canManage: boolean;
  /** Why they cannot manage, when they cannot. */
  reason:
    | null
    | 'not-authenticated'
    | 'no-claim'
    | 'no-role'
    | 'org-plan-required';
  /** The role they hold, if any. */
  role: string | null;
  /** The org tier of the owning organization. */
  orgTier: string | null;
};

/**
 * Resolve the signed-in user's authority over a team.
 *
 * `userId` is the canonical internal profile user_id (not the Clerk id).
 */
export async function getTeamAuthority(
  userId: string | null,
  teamId: string,
): Promise<TeamAuthority> {
  if (!userId) {
    return {
      canView: false,
      canManage: false,
      reason: 'not-authenticated',
      role: null,
      orgTier: null,
    };
  }

  // 1. Approved claim on the team.
  const { count: claimCount } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('claim_type', 'team')
    .eq('entity_id', teamId)
    .eq('status', 'approved');

  // 2. Active membership with an admin role.
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .is('left_at', null)
    .limit(1)
    .maybeSingle();

  const role = member?.role ?? null;
  const hasAdminRole =
    !!role && (ROSTER_ADMIN_ROLES as readonly string[]).includes(role);

  const hasClaim = !!claimCount;

  if (!hasClaim && !hasAdminRole) {
    return {
      canView: false,
      canManage: false,
      reason: hasClaim ? 'no-role' : 'no-claim',
      role,
      orgTier: null,
    };
  }

  // 3. Org tier.
  //    The `organizations` table has no tier column — the ORGANIZATION
  //    track tier lives on `profiles.org_tier` (with expiry and cancellation
  //    handling), which is exactly what `getUserOrgTier` resolves. Reuse it
  //    rather than reimplementing the tier rules, so the roster gate and
  //    every other org-tier gate can never disagree.
  const orgTier = await getUserOrgTier(userId);
  const hasRosterFeature = (ROSTER_ORG_TIERS as readonly string[]).includes(orgTier);

  return {
    canView: true,
    canManage: hasRosterFeature,
    reason: hasRosterFeature ? null : 'org-plan-required',
    role,
    orgTier,
  };
}

/** Human-readable explanation for a blocked roster action. */
export function rosterBlockMessage(reason: TeamAuthority['reason']): string {
  switch (reason) {
    case 'not-authenticated':
      return 'Sign in to manage this roster.';
    case 'no-claim':
      return 'You need an approved claim on this team (or to hold an admin role on it) to manage the roster.';
    case 'no-role':
      return 'Your role on this team does not include roster management.';
    case 'org-plan-required':
      return 'Roster management is part of Organization Plus. Upgrade to add players, set jersey numbers and verify stints.';
    default:
      return 'You cannot manage this roster.';
  }
}
