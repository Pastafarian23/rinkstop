import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

export type DirectoryCounts = {
  rinks: number;
  teams: number;
  players: number;
  leagues: number;
  cities: number;
  countries: number;
};

export type CountryCount = {
  country: string;
  team_count: number;
};

export type LeagueCount = {
  name: string;
  slug: string;
  team_count: number;
};

const ZERO_COUNTS: DirectoryCounts = {
  rinks: 0,
  teams: 0,
  players: 0,
  leagues: 0,
  cities: 0,
  countries: 0,
};

const ZERO_COUNTRY_COUNTS: CountryCount[] = [];
const ZERO_LEAGUE_COUNTS: LeagueCount[] = [];

/**
 * Single source of truth for "how big is the directory" numbers that
 * appear on RinkStop surfaces.
 *
 * Wraps the `get_directory_stats` Supabase RPC. The RPC is the canonical
 * count — every page that surfaces a number (homepage meta description,
 * homepage stats grid, about page, claim-your-listing empty-state copy,
 * any future surface) should call this function and never hardcode a
 * literal. That way, when counts grow, the UI updates without a code
 * change.
 *
 * Falls back to zeros on error so a Supabase outage doesn't crash the
 * surrounding page. Callers that want a "best effort" display should
 * show the value with a "0" fallback (e.g. "1,000+ rinks") — the
 * comparison with the previous literal "900+ rinks" means a temporary
 * drop to "0+" is still better than a hardcoded stale number, and
 * `revalidate` ensures the next request re-fetches.
 */
export async function getDirectoryCounts(): Promise<DirectoryCounts> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.rpc('get_directory_stats');
    const s = (data || {}) as Partial<DirectoryCounts>;
    return {
      rinks: s.rinks || 0,
      teams: s.teams || 0,
      players: s.players || 0,
      leagues: s.leagues || 0,
      cities: s.cities || 0,
      countries: s.countries || 0,
    };
  } catch {
    return ZERO_COUNTS;
  }
}

/**
 * Live per-country team counts. Wraps the `get_country_team_counts`
 * Supabase RPC. Returns top 50 countries by team count, ordered DESC.
 *
 * Used by /directory/teams (HockeyTeamsContent) to render the top-10
 * countries block with live numbers instead of hardcoded approximations.
 * Falls back to empty array on error so a Supabase outage doesn't break
 * the surrounding page.
 */
export async function getCountryTeamCounts(): Promise<CountryCount[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.rpc('get_country_team_counts');
    return (data || []) as CountryCount[];
  } catch {
    return ZERO_COUNTRY_COUNTS;
  }
}

/**
 * Live per-league team counts. Top 25 leagues by team_count, ordered DESC.
 *
 * Used by /directory/teams (TeamsIndexClient) to populate the league select
 * filter with real options + counts, instead of the broken <datalist> with
 * hardcoded options. Falls back to empty array on error so a Supabase outage
 * doesn't break the surrounding page — the select simply shows "All leagues"
 * with no options.
 */
export async function getTopLeagues(): Promise<LeagueCount[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // 2026-08-13: switched to the SQL aggregation RPC. The previous client-side
    // approach pulled 200 leagues × (variable) team_workspaces rows over the
    // wire, then aggregated in JS. The RPC does the GROUP BY on the DB side
    // and returns top 100 leagues pre-aggregated. ~400ms vs the prior 666ms.
    const { data, error } = await supabase.rpc('get_top_leagues_with_levels');
    if (error) {
      console.error('[getTopLeagues] RPC failed:', error);
      return ZERO_LEAGUE_COUNTS;
    }
    return (data ?? []).map((row: { name: string; slug: string; team_count: number }) => ({
      name: row.name,
      slug: row.slug,
      team_count: Number(row.team_count),
    }));
  } catch (e) {
    console.error('[getTopLeagues] unexpected error:', e);
    return ZERO_LEAGUE_COUNTS;
  }
}

/**
 * Countries that have ACTIVE teams matching a given level and/or league.
 * Used by /directory/teams to cascade the country dropdown so the user
 * can only pick countries that have teams in the current filter combo.
 *
 * Pure JS aggregation over team_workspaces — no GROUP BY. The query is
 * bounded by the table size (~500 active teams) so it fits in memory.
 *
 * Returns a Set of country names (e.g. "United States", "Canada") so the
 * caller can do an O(1) lookup against their topCountries list.
 *
 * Why both filters: with NHL=US+Canada, the user wants to see only those
 * two countries. With Level=Pro (no league), they want all countries
 * that have pro teams. With both, intersection.
 */
export async function getCountriesForFilter(opts: {
  level?: string | null;
  league?: string | null;
}): Promise<Set<string>> {
  const result = new Set<string>();
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Resolve level to a list of league IDs (same logic as fetchInitialTeams
    // in page.tsx). Then fetch team_workspaces with those leagues.
    const { LEAGUE_LEVELS } = await import('@/lib/league-levels');
    let leagueIds: string[] | null = null;
    if (opts.level) {
      const { data: leagues } = await supabase
        .from('leagues')
        .select('id, name')
        .eq('is_active', true);
      const ids = (leagues ?? [])
        .filter((l: { name: string }) => LEAGUE_LEVELS[l.name] === opts.level)
        .map((l: { id: string }) => l.id);
      if (ids.length === 0) return result;
      leagueIds = ids;
    }
    if (opts.league) {
      const { data: matchedLeagues } = await supabase
        .from('leagues')
        .select('id')
        .eq('is_active', true)
        .ilike('name', opts.league);
      const ids = (matchedLeagues ?? []).map((l: { id: string }) => l.id);
      if (ids.length === 0) return result;
      // Intersect with level-derived IDs when both are set
      if (leagueIds) {
        const set = new Set(ids);
        leagueIds = leagueIds.filter((id) => set.has(id));
        if (leagueIds.length === 0) return result;
      } else {
        leagueIds = ids;
      }
    }
    if (!leagueIds) return result;

    // Fetch team_workspaces with these leagues and pull distinct countries.
    // Limit 500 since we already filtered to active teams earlier.
    const { data: teams } = await supabase
      .from('team_workspaces')
      .select('country, country_code, home_country')
      .eq('is_active', true)
      .in('league_id', leagueIds)
      .limit(500);

    for (const t of (teams ?? []) as Array<{ country: string | null; country_code: string | null; home_country: string | null }>) {
      // Prefer country_code from team_workspaces (ISO 3166-1 alpha-2), fall back to other fields
      if (t.country) result.add(t.country);
      if (t.country_code) result.add(t.country_code);
      if (t.home_country) result.add(t.home_country);
    }
    return result;
  } catch (e) {
    console.error('[getCountriesForFilter] unexpected error:', e);
    return result;
  }
}

/**
 * Builds a country → league-names[] mapping for the cascading dropdown.
 * Used by /directory/teams to cascade the country dropdown in real-time:
 * when the user picks League=NHL, the client intersects the current
 * level/league with this set to show only countries that have NHL teams.
 *
 * Returns a Map<country, Set<leagueName>>. The team_workspaces table has
 * thousands of active teams; the SQL RPC `get_country_leagues_map_json`
 * does the GROUP BY on the DB side and returns the country-grouped array
 * in one round-trip (~170ms vs the prior 534ms paginated scan).
 */
export async function getCountryLeaguesMap(): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // 2026-08-13: switched to the SQL aggregation RPC. The previous client-side
    // approach paginated 4 pages of 1000 team_workspaces rows to build the
    // country→leagues map (~534ms total). The RPC does the GROUP BY on the DB
    // side and returns the full map in one JSONB call (~170ms).
    const { data, error } = await supabase.rpc('get_country_leagues_map_json');
    if (error) {
      console.error('[getCountryLeaguesMap] RPC failed:', error);
      return result;
    }
    const entries = Array.isArray(data) ? data : [];
    for (const entry of entries as Array<{ country: string; leagues: string[] }>) {
      if (!entry.country || !Array.isArray(entry.leagues) || entry.leagues.length === 0) continue;
      if (!result.has(entry.country)) result.set(entry.country, new Set());
      for (const league of entry.leagues) result.get(entry.country)!.add(league);
    }
    return result;
  } catch (e) {
    console.error('[getCountryLeaguesMap] unexpected error:', e);
    return result;
  }
}


// ---------------------------------------------------------------------------
// Cached wrappers — keep the original function exports unchanged so existing
// callers stay source-compatible. The wrappers memoize the response for
// `revalidate` seconds per call site, so a busy page like /directory/teams
// (which calls getDirectoryCounts in generateMetadata AND in the page body)
// makes ONE RPC call per process per revalidate window instead of two.
//
// Why 5 minutes: directory counts shift slowly (a few new teams per day, not
// per second). 5 min is fine for "1,000+ ..." marketing copy. Top leagues
// and country-leagues map are even more stable — 15 min is fine there.
// ---------------------------------------------------------------------------

const TEN_MIN = 600;
const FIFTEEN_MIN = 900;

export const getDirectoryCountsCached = unstable_cache(
  async () => getDirectoryCounts(),
  ['getDirectoryCounts'],
  { revalidate: TEN_MIN, tags: ['directory-counts'] }
);

export const getCountryTeamCountsCached = unstable_cache(
  async () => getCountryTeamCounts(),
  ['getCountryTeamCounts'],
  { revalidate: FIFTEEN_MIN, tags: ['directory-counts'] }
);

export const getTopLeaguesCached = unstable_cache(
  async () => getTopLeagues(),
  ['getTopLeagues'],
  { revalidate: FIFTEEN_MIN, tags: ['directory-counts'] }
);

export const getCountryLeaguesMapCached = unstable_cache(
  async (): Promise<Array<[string, string[]]>> => {
    const map = await getCountryLeaguesMap();
    return Array.from(map.entries()).map(([k, v]) => [k, Array.from(v)]);
  },
  ['getCountryLeaguesMap'],
  { revalidate: FIFTEEN_MIN, tags: ['directory-counts'] }
);
