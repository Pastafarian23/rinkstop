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

  // PLAYER: profile_views is logged on /profile/[username]; use 0 for now (no view-logging
  // table yet). Once views are tracked, swap to: count from profile_views.
  data.player.loaded = true;

  // PARENT: managed_profiles where relationship IN ('parent', 'guardian', 'spouse', 'self').
  // Counts player profiles this user manages.
  try {
    const { count } = await supabaseAdmin
      .from('managed_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('manager_user_id', userId)
      .eq('profile_type', 'player')
      .in('relationship', ['parent', 'guardian', 'spouse', 'self']);
    data.parent.linkedPlayers = count || 0;
    data.parent.loaded = true;
  } catch { /* table missing — keep loaded=false */ }

  // COACH: teams where this user is a member with role='coach'.
  // Uses team_members (user_id + role) instead of nonexistent team_owners.
  try {
    const { count } = await supabaseAdmin
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('role', 'coach');
    data.coach.teamsManaged = count || 0;
    data.coach.loaded = true;
  } catch { /* team_members may not exist — keep loaded=false */ }

  // SCOUT: watchlist = follows of players
  try {
    const { count: wl } = await supabaseAdmin
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_user_id', userId)
      .eq('followee_type', 'player');
    data.scout.followedPlayers = wl || 0;
    data.scout.watchlist = wl || 0;
    data.scout.loaded = true;
  } catch { /* keep */ }

  // REFEREE: games officiated. We don't log this yet; render the "Report a game" CTA
  // as the only action. loaded=true so the section renders.
  data.referee.loaded = true;

  // TEAM_ADMIN: teams where this user is the owner/manager.
  // `team_owners` table (Phase 1) — fall back to 0 if it doesn't exist yet.
  try {
    const { count } = await supabaseAdmin
      .from('team_owners')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    data.team_admin.teamCount = count || 0;
    data.team_admin.loaded = true;
  } catch { /* keep */ }

  // LEAGUE_ADMIN: leagues where this user is the owner/admin.
  // `league_owners` table (Phase 1) — fall back to 0 if it doesn't exist yet.
  try {
    const { count } = await supabaseAdmin
      .from('league_owners')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    data.league_admin.leagueCount = count || 0;
    data.league_admin.loaded = true;
  } catch { /* keep */ }

  // RINK_OPERATOR: rinks where this user is the operator/owner.
  // `rink_operators` table (Phase 1) — fall back to 0 if it doesn't exist yet.
  try {
    const { count } = await supabaseAdmin
      .from('rink_operators')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    data.rink_operator.rinkCount = count || 0;
    // Leads associated with this user's rinks (clerk_user_id is the new column).
    try {
      const { count: lc } = await supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('clerk_user_id', userId);
      data.rink_operator.leads = lc || 0;
    } catch { /* no leads table — keep 0 */ }
    data.rink_operator.loaded = true;
  } catch { /* keep */ }

  // BUSINESS: listings table (Phase 0.4).
  try {
    const { count } = await supabaseAdmin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', userId)
      .eq('listing_type', 'business');
    data.business.listings = count || 0;
    try {
      const { count: lc } = await supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('clerk_user_id', userId);
      data.business.leads = lc || 0;
    } catch { /* no leads table */ }
    data.business.loaded = true;
  } catch { /* keep */ }

  // FAN: followed teams + players.
  try {
    const { count: teams } = await supabaseAdmin
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_user_id', userId)
      .eq('followee_type', 'team');
    const { count: players } = await supabaseAdmin
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_user_id', userId)
      .eq('followee_type', 'player');
    data.fan.followedTeams = teams || 0;
    data.fan.followedPlayers = players || 0;
    data.fan.loaded = true;
  } catch { /* keep */ }

  return data;
}
