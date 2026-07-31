import { supabaseAdmin } from '@/lib/supabase';
import type { AccountType } from './dashboardTypes';

export interface TypeSectionData {
  // Per-type counts and lists. Pages render a section only if the user holds the type.
  // `loaded: true` means we tried to query (count is reliable); `loaded: false` means
  // the table doesn't exist or the query failed (we render a generic CTA instead).
  player:        { profileViews: number; loaded: boolean };
  parent:        { linkedPlayers: number; loaded: boolean };
  coach:         { teamsManaged: number; loaded: boolean };
  scout:         { watchlist: number; followedPlayers: number; loaded: boolean };
  referee:       { officiatedGames: number; loaded: boolean };
  team_admin:    { teamCount: number; loaded: boolean };
  league_admin:  { leagueCount: number; loaded: boolean };
  rink_operator: { rinkCount: number; loaded: boolean; leads: number };
  business:      { listings: number; loaded: boolean; leads: number };
  fan:           { followedTeams: number; followedPlayers: number; loaded: boolean };
}

const EMPTY: TypeSectionData = {
  player:        { profileViews: 0, loaded: false },
  parent:        { linkedPlayers: 0, loaded: false },
  coach:         { teamsManaged: 0, loaded: false },
  scout:         { watchlist: 0, followedPlayers: 0, loaded: false },
  referee:       { officiatedGames: 0, loaded: false },
  team_admin:    { teamCount: 0, loaded: false },
  league_admin:  { leagueCount: 0, loaded: false },
  rink_operator: { rinkCount: 0, loaded: false, leads: 0 },
  business:      { listings: 0, loaded: false, leads: 0 },
  fan:           { followedTeams: 0, followedPlayers: 0, loaded: false },
};

/**
 * Loads counts/quick-stats for every account type. Each type's query is wrapped in
 * try/catch so a missing table (e.g. `scout_watchlist` not yet built) doesn't kill
 * the whole dashboard. Result is keyed by type; the consumer picks the types the
 * user actually holds.
 *
 * Schema notes (2026-06-08 onwards):
 *   - `managed_relationships` was renamed to `managed_profiles`
 *   - `managed_profiles.user_id` was renamed to `manager_user_id`
 *   - `managed_profiles.relationship` is restricted to
 *     ('parent', 'guardian', 'spouse', 'self') — it no longer carries
 *     team_admin / league_admin / rink_operator / coach roles.
 *   - Team / league / rink ownership lives elsewhere (Clerk publicMetadata,
 *     the `team_owners` table, or role on the parent record). The dashboard
 *     renders a CTA for those types until that data is wired up.
 *   - `leads` no longer has `owner_user_id` — it has `clerk_user_id`.
 *
 * NOTE: this is intentionally lean — just counts. The actual "drill into your
 * data" pages are out of scope for Phase 1.
 */
export async function loadDashboardTypeData(userId: string): Promise<TypeSectionData> {
  const data: TypeSectionData = { ...EMPTY };

  // 2026-07-31 (Arnel-flagged dashboard perf pass): the previous serial chain
  // here stacked ~12 Supabase queries one-after-the-other. From Cebu (or any
  // far-from-Chicago region) each query is ~280ms RTT, so this loader alone
  // took 3+ seconds before the page could render. The dashboard layout was
  // already parallelized in commit 697f93f; this is the page-side pass.
  //
  // Almost all queries here are independent reads by `userId`. The only
  // true dependency is the player profile view count: it needs the user's
  // `username` first. We split into two parallel groups:
  //   1. username lookup + all other queries (independent).
  //   2. profile view count (only runs if username exists).
  // `Promise.allSettled` lets us fail-closed per query — a missing table
  // (e.g. referee_assignments, league_owners, rink_owners) degrades to
  // loaded=false without crashing the loader.

  // GROUP 1: username + every independent count query.
  // Each query is wrapped in an async IIFE so .catch() (Promise<T>) is valid
  // and one bad query doesn't poison the rest. The Supabase client's
  // .then() returns PromiseLike<T>, not Promise<T>, so we can't chain
  // .catch() directly off it.
  const safeCount = async (q: PromiseLike<{ count: number | null }>): Promise<number> => {
    try {
      const { count } = await q;
      return count || 0;
    } catch { return 0; }
  };
  const safeMaybeSingle = async (q: PromiseLike<{ data: any }>): Promise<any> => {
    try {
      const { data } = await q;
      return data;
    } catch { return null; }
  };
  const settled = await Promise.allSettled([
    // username (for player profile_views below)
    safeMaybeSingle(supabaseAdmin.from('profiles').select('username').eq('user_id', userId).maybeSingle()).then((row) => row?.username || null),
    // PARENT: managed_profiles where relationship IN ('parent', 'guardian', 'spouse', 'self').
    safeCount(supabaseAdmin.from('managed_profiles').select('id', { count: 'exact', head: true }).eq('manager_user_id', userId).eq('profile_type', 'player').in('relationship', ['parent', 'guardian', 'spouse', 'self'])),
    // COACH: teams where this user is a member with a coaching role.
    safeCount(supabaseAdmin.from('team_members').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('role', ['coach', 'head_coach', 'assistant_coach'])),
    // SCOUT: watchlist = follows of players
    safeCount(supabaseAdmin.from('follows').select('id', { count: 'exact', head: true }).eq('follower_user_id', userId).eq('followee_type', 'player')),
    // TEAM_ADMIN: teams where this user is the creator OR active head_coach.
    // Run both counts in parallel inside this slot.
    Promise.all([
      safeCount(supabaseAdmin.from('team_workspaces').select('id', { count: 'exact', head: true }).eq('created_by', userId)),
      safeCount(supabaseAdmin.from('team_members').select('team_id', { count: 'exact', head: true }).eq('user_id', userId).eq('role', 'head_coach').is('left_at', null)),
    ]).then(([created, headCoach]) => Math.max(created, headCoach)),
    // RINK_OPERATOR.leads
    safeCount(supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('claimant_user_id', userId)),
    // BUSINESS: listings + leads (Phase 0.4)
    Promise.all([
      safeCount(supabaseAdmin.from('listings').select('id', { count: 'exact', head: true }).eq('owner_user_id', userId).eq('listing_type', 'business')),
      safeCount(supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('claimant_user_id', userId)),
    ]),
    // FAN: followed teams + players
    Promise.all([
      safeCount(supabaseAdmin.from('follows').select('id', { count: 'exact', head: true }).eq('follower_user_id', userId).eq('followee_type', 'team')),
      safeCount(supabaseAdmin.from('follows').select('id', { count: 'exact', head: true }).eq('follower_user_id', userId).eq('followee_type', 'player')),
    ]),
  ]);

  const [usernameRes, parentCnt, coachCnt, scoutCnt, teamAdminCnt, rinkLeadsCnt, businessRes, fanRes] = settled.map((r) => (r.status === 'fulfilled' ? r.value : null));

  // GROUP 2: probe-only patterns below. These tables don't exist on prod
  // (verified 2026-07-02), so the probe throws and we keep loaded=false.
  // Runs in parallel with each other; not gated on Group 1.
  const [refereeRes, leagueRes, rinkRes] = await Promise.allSettled([
    // REFEREE: probe-only pattern — referee_assignments table probe.
    (async () => {
      try {
        await supabaseAdmin.from('referee_assignments').select('id', { count: 'exact', head: true }).limit(1);
        const { count } = await supabaseAdmin.from('referee_assignments').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed');
        return count || 0;
      } catch { return null; }
    })(),
    // LEAGUE_ADMIN: probe-only pattern — league_owners table probe.
    (async () => {
      try {
        await supabaseAdmin.from('league_owners').select('id', { count: 'exact', head: true }).limit(1);
        const { count } = await supabaseAdmin.from('league_owners').select('id', { count: 'exact', head: true }).eq('user_id', userId);
        return count || 0;
      } catch { return null; }
    })(),
    // RINK_OPERATOR: probe-only pattern — rink_operators table probe.
    (async () => {
      try {
        await supabaseAdmin.from('rink_operators').select('id', { count: 'exact', head: true }).limit(1);
        const { count } = await supabaseAdmin.from('rink_operators').select('id', { count: 'exact', head: true }).eq('user_id', userId);
        return count || 0;
      } catch { return null; }
    })(),
  ]);

  // GROUP 3: profile_viewed count (depends on username). Only runs if username resolved.
  const profileSlug = usernameRes as string | null;
  let playerProfileViews = 0;
  if (profileSlug) {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin.from('analytics_events').select('id', { count: 'exact', head: true }).eq('name', 'profile_viewed').eq('pathname', `/profile/${profileSlug}`).gte('ts', sevenDaysAgo);
      playerProfileViews = count || 0;
    } catch { /* keep 0 */ }
  }

  // Assemble the result.
  data.player.profileViews = playerProfileViews;
  data.player.loaded = true;

  data.parent.linkedPlayers = (parentCnt as number) || 0;
  data.parent.loaded = true;

  data.coach.teamsManaged = (coachCnt as number) || 0;
  data.coach.loaded = true;

  const scout = (scoutCnt as number) || 0;
  data.scout.followedPlayers = scout;
  data.scout.watchlist = scout;
  data.scout.loaded = true;

  data.team_admin.teamCount = (teamAdminCnt as number) || 0;
  data.team_admin.loaded = true;

  if (refereeRes.status === 'fulfilled' && refereeRes.value !== null) {
    data.referee.officiatedGames = refereeRes.value;
    data.referee.loaded = true;
  }
  if (leagueRes.status === 'fulfilled' && leagueRes.value !== null) {
    data.league_admin.leagueCount = leagueRes.value;
    data.league_admin.loaded = true;
  }
  if (rinkRes.status === 'fulfilled' && rinkRes.value !== null) {
    data.rink_operator.rinkCount = rinkRes.value;
    data.rink_operator.loaded = true;
  }

  data.rink_operator.leads = (rinkLeadsCnt as number) || 0;

  if (businessRes && Array.isArray(businessRes)) {
    data.business.listings = businessRes[0] || 0;
    data.business.leads = businessRes[1] || 0;
    data.business.loaded = true;
  }

  if (fanRes && Array.isArray(fanRes)) {
    data.fan.followedTeams = fanRes[0] || 0;
    data.fan.followedPlayers = fanRes[1] || 0;
    data.fan.loaded = true;
  }

  return data;
}

// ---------------------------------------------------------------------------
// Step 7 — Workspace-level status (one-liner per hub card).
// Returns a short status string for each workspace, derived from the per-
// account-type data we already loaded. Null status means "no data" — caller
// should hide the status line.
// ---------------------------------------------------------------------------

export interface WorkspaceStatus {
  /** Short status line, e.g. "✓ 2 teams managed" or "No teams yet" */
  text: string;
  /** True when the workspace has zero counts across its relevant types. */
  empty: boolean;
}

/**
 * Compute the Personal workspace status.
 * Sum across player, parent, scout, fan account types. The Personal workspace
 * is unlocked for any user, so we always return a status when at least one
 * of these types has data.
 */
export function personalStatus(data: TypeSectionData): WorkspaceStatus | null {
  // Use `loaded` as the "we have data" gate. If none of the personal types
  // loaded (rare), return null so the card hides the status line.
  const loaded = data.player.loaded || data.parent.loaded || data.scout.loaded || data.fan.loaded;
  if (!loaded) return null;

  const pieces: string[] = [];
  if (data.player.loaded && data.player.profileViews > 0) {
    pieces.push(`${data.player.profileViews} profile view${data.player.profileViews === 1 ? '' : 's'}`);
  }
  if (data.parent.loaded && data.parent.linkedPlayers > 0) {
    pieces.push(`${data.parent.linkedPlayers} linked player${data.parent.linkedPlayers === 1 ? '' : 's'}`);
  }
  if (data.fan.loaded && (data.fan.followedTeams + data.fan.followedPlayers) > 0) {
    const total = data.fan.followedTeams + data.fan.followedPlayers;
    pieces.push(`${total} followed`);
  }
  // Scouting watchlist is part of Personal too (the Personal workspace
  // includes scout). Show as a separate count.
  if (data.scout.loaded && data.scout.followedPlayers > 0) {
    pieces.push(`${data.scout.followedPlayers} on watchlist`);
  }

  if (pieces.length === 0) {
    return { text: 'No activity yet', empty: true };
  }
  // Cap to 2 pieces for card legibility; combine remaining as "+N more" if needed.
  let text: string;
  if (pieces.length <= 2) {
    text = pieces.join(' \u00b7 ');
  } else {
    text = pieces.slice(0, 2).join(' \u00b7 ') + ' \u00b7 +' + (pieces.length - 2) + ' more';
  }
  return { text: '\u2713 ' + text, empty: false };
}

/**
 * Compute the Organization workspace status.
 * Sum across coach, team_admin, referee, league_admin.
 */
export function organizationStatus(data: TypeSectionData): WorkspaceStatus | null {
  const loaded =
    data.coach.loaded || data.team_admin.loaded || data.referee.loaded || data.league_admin.loaded;
  if (!loaded) return null;

  const teams = data.coach.loaded ? data.coach.teamsManaged : 0;
  const teamAdmin = data.team_admin.loaded ? data.team_admin.teamCount : 0;
  const totalTeams = teams + teamAdmin;
  const leagues = data.league_admin.loaded ? data.league_admin.leagueCount : 0;
  const games = data.referee.loaded ? data.referee.officiatedGames : 0;

  if (totalTeams === 0 && leagues === 0 && games === 0) {
    return { text: 'No teams or leagues yet', empty: true };
  }
  const pieces: string[] = [];
  if (totalTeams > 0) pieces.push(`${totalTeams} team${totalTeams === 1 ? '' : 's'}`);
  if (leagues > 0) pieces.push(`${leagues} league${leagues === 1 ? '' : 's'}`);
  if (games > 0) pieces.push(`${games} game${games === 1 ? '' : 's'} officiated`);
  return { text: '\u2713 ' + pieces.join(' \u00b7 '), empty: false };
}

/**
 * Compute the Business workspace status.
 * Sum across business + rink_operator (rink operators get business listings).
 */
export function businessStatus(data: TypeSectionData): WorkspaceStatus | null {
  const loaded = data.business.loaded || data.rink_operator.loaded;
  if (!loaded) return null;

  const listings = data.business.loaded ? data.business.listings : 0;
  const rinks = data.rink_operator.loaded ? data.rink_operator.rinkCount : 0;
  const total = listings + rinks;

  if (total === 0) {
    return { text: 'No listings yet', empty: true };
  }
  const pieces: string[] = [];
  if (listings > 0) pieces.push(`${listings} business listing${listings === 1 ? '' : 's'}`);
  if (rinks > 0) pieces.push(`${rinks} rink${rinks === 1 ? '' : 's'}`);
  return { text: '\u2713 ' + pieces.join(' \u00b7 '), empty: false };
}
