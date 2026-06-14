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
 * NOTE: this is intentionally lean — just counts. The actual "drill into your
 * data" pages are out of scope for Phase 1.
 */
export async function loadDashboardTypeData(userId: string): Promise<TypeSectionData> {
  const data: TypeSectionData = { ...EMPTY };

  // PLAYER: profile_views is logged on /profile/[username]; use 0 for now (no view-logging
  // table yet). Once views are tracked, swap to: count from profile_views.
  data.player.loaded = true;

  // PARENT: managed_relationships where relationship includes 'parent' or 'parent_managed'.
  // The public profile page already reads from /api/profiles/managed; use the same source.
  try {
    const { count } = await supabaseAdmin
      .from('managed_relationships')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .or("relationship.ilike.'parent',relationship.ilike.'parent_managed'");
    data.parent.linkedPlayers = count || 0;
    data.parent.loaded = true;
  } catch { /* table missing — keep loaded=false */ }

  // COACH: teams they manage (relationship = 'head_coach' / 'assistant_coach').
  try {
    const { count } = await supabaseAdmin
      .from('managed_relationships')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('relationship', ['head_coach', 'assistant_coach']);
    data.coach.teamsManaged = count || 0;
    data.coach.loaded = true;
  } catch { /* keep */ }

  // SCOUT: watchlist + followed players
  try {
    const { count: wl } = await supabaseAdmin
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_user_id', userId)
      .eq('followee_type', 'player');
    data.scout.followedPlayers = wl || 0;
    // Watchlist isn't a separate table yet; treat follows as the watchlist surface.
    data.scout.watchlist = wl || 0;
    data.scout.loaded = true;
  } catch { /* keep */ }

  // REFEREE: games officiated. We don't log this yet; render the "Report a game" CTA
  // as the only action. loaded=true so the section renders.
  data.referee.loaded = true;

  // TEAM_ADMIN: teams where relationship = 'team_manager' or 'team_admin'.
  try {
    const { count } = await supabaseAdmin
      .from('managed_relationships')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('relationship', ['team_manager', 'team_admin']);
    data.team_admin.teamCount = count || 0;
    data.team_admin.loaded = true;
  } catch { /* keep */ }

  // LEAGUE_ADMIN: leagues where relationship = 'league_admin'.
  try {
    const { count } = await supabaseAdmin
      .from('managed_relationships')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('relationship', 'league_admin');
    data.league_admin.leagueCount = count || 0;
    data.league_admin.loaded = true;
  } catch { /* keep */ }

  // RINK_OPERATOR: rinks where relationship = 'rink_operator' or 'rink_owner'.
  try {
    const { count } = await supabaseAdmin
      .from('managed_relationships')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('relationship', ['rink_operator', 'rink_owner']);
    data.rink_operator.rinkCount = count || 0;
    // Leads table may or may not exist.
    try {
      const { count: lc } = await supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('owner_user_id', userId);
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
        .eq('owner_user_id', userId);
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
