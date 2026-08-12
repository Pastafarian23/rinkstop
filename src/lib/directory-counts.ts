import { createClient } from '@supabase/supabase-js';

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
    // Join leagues → team_workspaces. Filter to active leagues with active teams.
    // Note: PostgREST doesn't support GROUP BY directly, so we count per league
    // by fetching the (slug, name) of each league, then aggregating in JS for
    // a stable ordering.
    //
    // 2026-08-12 fix: was using `.limit(50)` but PostgREST defaults to ordering
    // by primary key (creation order), which cut off leagues created early
    // (like NCAA D1/D3 with the highest team counts). Now we fetch ALL active
    // leagues and let the JS aggregation handle ordering. The DB has ~200
    // active leagues — still fast for an in-memory aggregation.
    const { data, error } = await supabase
      .from('leagues')
      .select('name, slug, team_workspaces!inner(id, is_active)')
      .eq('is_active', true)
      .eq('team_workspaces.is_active', true);

    if (error) {
      console.error('[getTopLeagues] query failed:', error);
      return ZERO_LEAGUE_COUNTS;
    }

    // Aggregate team count per league
    const counts = new Map<string, LeagueCount>();
    for (const row of (data ?? []) as Array<{ name: string; slug: string; team_workspaces: Array<{ id: string }> | null }>) {
      if (!row.slug || !row.name) continue;
      const teamCount = Array.isArray(row.team_workspaces) ? row.team_workspaces.length : 0;
      // If multiple rows came back (shouldn't with unique slug, but defensive)
      const existing = counts.get(row.slug);
      if (existing) {
        existing.team_count += teamCount;
      } else {
        counts.set(row.slug, { name: row.name, slug: row.slug, team_count: teamCount });
      }
    }

    // 2026-08-12 fix: when we cap at 25, leagues from less-common levels
    // (like NCAA, IIHF national teams) can get crowded out by leagues with
    // many team_workspaces rows (like NAHL/NHL/AHL). When the user picks
    // Level=College, the league <select> would be empty.
    //
    // Fix: for each level, ensure at least the top-3 leagues by team count
    // are included. Then fill remaining slots with overall top leagues.
    const { LEAGUE_LEVELS } = await import('@/lib/league-levels');
    const LEVELS: Array<keyof typeof LEAGUE_LEVELS> = ['pro', 'junior', 'college', 'international', 'adult'];
    const byLevel = new Map<string, LeagueCount[]>();
    for (const lc of LEVELS) byLevel.set(lc, []);
    for (const lc of Array.from(counts.values())) {
      const level = LEAGUE_LEVELS[lc.name];
      if (level) byLevel.get(level)!.push(lc);
    }
    // Sort each level's list by team_count DESC and take top 3
    for (const lc of LEVELS) {
      byLevel.set(lc, byLevel.get(lc)!.sort((a, b) => b.team_count - a.team_count).slice(0, 3));
    }

    // Build the final list: per-level top-3 first, then any remaining
    // high-count leagues to fill up to 25.
    const seen = new Set<string>();
    const finalList: LeagueCount[] = [];
    for (const lc of LEVELS) {
      for (const item of byLevel.get(lc)!) {
        if (!seen.has(item.slug)) {
          finalList.push(item);
          seen.add(item.slug);
        }
      }
    }
    // Fill remaining slots with overall top leagues by team_count
    const remaining = Array.from(counts.values())
      .filter((l) => !seen.has(l.slug))
      .sort((a, b) => b.team_count - a.team_count);
    for (const item of remaining) {
      if (finalList.length >= 25) break;
      finalList.push(item);
      seen.add(item.slug);
    }

    return finalList;
  } catch (e) {
    console.error('[getTopLeagues] unexpected error:', e);
    return ZERO_LEAGUE_COUNTS;
  }
}
