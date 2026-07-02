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

  // PLAYER: profile views (last 7 days). Count from analytics_events where
  // pathname starts with /profile/{userSlug} AND name='profile_viewed'.
  // TODO(track): the /profile/[slug] page does NOT currently emit a
  // 'profile_viewed' analytics event. Verified 2026-07-02: zero rows in
  // analytics_events match pathname LIKE '/profile/%'. Until we wire that
  // event in the page (1-line change to src/app/profile/[slug]/page.tsx),
  // the count is always 0. The card copy reflects that honestly.
  // When the event is wired, this loader just works — no schema change.
  let profileSlug: string | null = null;
  try {
    const { data: profileRow } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('user_id', userId)
      .maybeSingle();
    profileSlug = profileRow?.username || null;
  } catch { /* keep null */ }
  if (profileSlug) {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('name', 'profile_viewed')
        .eq('pathname', `/profile/${profileSlug}`)
        .gte('ts', sevenDaysAgo);
      data.player.profileViews = count || 0;
    } catch { /* keep 0 */ }
  }
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

  // COACH: teams where this user is a member with a coaching role.
  // Uses team_members (user_id + role) instead of nonexistent team_owners.
  // Note: role is plain TEXT (not enum). Common values: 'coach', 'head_coach',
  // 'assistant_coach'. Add new variants here as they appear in the data.
  try {
    const { count } = await supabaseAdmin
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('role', ['coach', 'head_coach', 'assistant_coach']);
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

  // TEAM_ADMIN: teams where this user is the creator OR active head_coach.
  // `team_owners` (the Phase 1 placeholder) doesn't exist on prod (verified
  // 2026-07-02 via information_schema.tables). The official ownership system
  // is `claims` with status='approved' per
  // /api/manage/[type]/[id]/route.ts:isOwner, but `claims` is empty on prod.
  // Closest existing signals: team_workspaces.created_by (user who created
  // the workspace) OR team_members.role='head_coach' (active membership).
  // Either signal indicates ownership. Take the max (the two may overlap for
  // the same team — overcount by ≤1 is acceptable for a summary card).
  // When `claims` is wired or `team_owners` is added, swap to that source.
  try {
    const { count: created } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId);
    const { count: headCoach } = await supabaseAdmin
      .from('team_members')
      .select('team_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('role', 'head_coach')
      .is('left_at', null);
    data.team_admin.teamCount = Math.max(created || 0, headCoach || 0);
    data.team_admin.loaded = true;
  } catch { /* keep loaded=false on unexpected error */ }

  // LEAGUE_ADMIN: `league_owners` doesn't exist on prod (verified 2026-07-02).
  // `leagues` table has NO ownership column (no owner_user_id, no created_by).
  // `claims` is empty on prod, so we can't count approved league claims.
  // No reliable ownership signal exists yet. Probe-only pattern: if the table
  // appears in the future, this loader starts working automatically with no
  // code change. Until then, loaded=false and the card shows the honest
  // empty state ("You don't run a league yet").
  // Separate piece: add leagues.owner_user_id or wire claims. Out of scope here.
  try {
    await supabaseAdmin
      .from('league_owners')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    // league_owners exists — count against it.
    const { count } = await supabaseAdmin
      .from('league_owners')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    data.league_admin.leagueCount = count || 0;
    data.league_admin.loaded = true;
  } catch { /* league_owners still missing — keep loaded=false */ }

  // RINK_OPERATOR: `rink_operators` doesn't exist on prod (verified 2026-07-02).
  // `rinks` table has NO ownership column (only created_at). Same problem as
  // league_admin. Probe-only pattern — same as above.
  try {
    await supabaseAdmin
      .from('rink_operators')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    // rink_operators exists — count against it.
    const { count } = await supabaseAdmin
      .from('rink_operators')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    data.rink_operator.rinkCount = count || 0;
    data.rink_operator.loaded = true;
  } catch { /* rink_operators still missing — keep loaded=false */ }

  // RINK_OPERATOR.leads: count leads associated with this user's rinks.
  // The leads table has NO `clerk_user_id` column (verified 2026-07-02 via
  // information_schema.columns). The real column is `claimant_user_id`.
  // Filtering on a non-existent column would silently return 0 for everyone;
  // switching to claimant_user_id returns the real count (table is small
  // on prod but the filter is at least correct now).
  try {
    const { count: lc } = await supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('claimant_user_id', userId);
    data.rink_operator.leads = lc || 0;
  } catch { /* no leads table — keep 0 */ }

  // BUSINESS: listings table (Phase 0.4).
  try {
    const { count } = await supabaseAdmin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', userId)
      .eq('listing_type', 'business');
    data.business.listings = count || 0;
    // Same leads.clerk_user_id -> claimant_user_id fix as rink_operator above.
    try {
      const { count: lc } = await supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('claimant_user_id', userId);
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
