import { createClient } from '@supabase/supabase-js';

export type DirectoryCounts = {
  rinks: number;
  teams: number;
  players: number;
  leagues: number;
  cities: number;
  countries: number;
};

const ZERO_COUNTS: DirectoryCounts = {
  rinks: 0,
  teams: 0,
  players: 0,
  leagues: 0,
  cities: 0,
  countries: 0,
};

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
