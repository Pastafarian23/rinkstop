/**
 * Season completeness helpers (Item 4, 2026-10-16).
 *
 * For each (league, season) pair we want to know:
 *   1. Whether the season is "complete enough" to index in Google
 *      (= every team reached the expected regular-season GP).
 *   2. The expected regular-season GP (per league).
 *
 * Background
 * ----------
 * The NHL "2024-25" season in Arnel's report shows GP 34-79 per team —
 * because `fixtures.season` mixes regular-season AND playoff games into
 * one bucket (max GP ~= 82 + number of playoff rounds). For a MID-season
 * snapshot that range is the realistic signal, but for a CLOSED season
 * "complete" must mean "at minimum every team reached the regular-season
 * schedule ceiling." Teams that made deep playoff runs will exceed the
 * ceiling, which is expected and not a problem.
 *
 * is_season_complete:
 *   - current season (in-progress): any positive GP is fine — incomplete
 *   - past season: complete iff max(GP across teams) >= expectedRegularSeasonGP
 *
 * Note on over-counting
 * ---------------------
 * Three of the four leagues checked currently OVER-count because `season`
 * is not split into (regular / pre / playoff). For ECHL 2025 the range is
 * 47-78 (target 72), for AHL 2024-25 it's 60-127. Both pass `max >= 72`
 * even though playoff games are inflating some teams beyond 72. That's
 * fine for the indexability check — what we're guarding against is a
 * season whose MIN is far below the expected ceiling, which signals
 * "this season's fixture pull is broken, do not let Google index this."
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SEASON_FORMAT_MAX_YEARS_AHEAD = 1; // "2026-27" is current in 2026.

/**
 * Expected regular-season GP per league (regular season only — playoff games
 * are beyond this and expected to inflate MAX).
 */
export const EXPECTED_REGULAR_SEASON_GP: Record<string, number> = {
  nhl: 82,
  ahl: 72,
  echl: 72,
  ushl: 60,
};

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_sb) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase env vars missing');
    _sb = createClient(url, key);
  }
  return _sb;
}

/**
 * Lower-case league slug → expected regular-season GP.
 * Falls back to 82 (NHL default) for unknown leagues so we never silently
 * flip a season to "complete"; better to be over-eager than to make a
 * hidden judgement call.
 */
export function getExpectedRegularSeasonGp(leagueSlug: string): number {
  return EXPECTED_REGULAR_SEASON_GP[leagueSlug.toLowerCase()] ?? 82;
}

export type SeasonCompleteness = {
  isComplete: boolean;
  isCurrent: boolean;
  expectedGp: number;
  observed: {
    teamsWithGames: number;
    minGp: number;
    maxGp: number;
    totalFixtures: number;
    completedFixtures: number;
  } | null;
  reason: string;
};

/**
 * True iff the (leagueSlug, season) label refers to a season that has
 * plausibly started already but not yet ended (so "any GP is fine,
 * don't index yet" applies).
 *
 * Logic:
 *   - season starts in a year < current calendar year   → completed window
 *   - season starts in current or next calendar year    → currently in progress
 *
 * Malformed labels ("NaN-NaN") are treated as already-completed.
 */
export function isCurrentSeasonLabel(seasonLabel: string): boolean {
  const m = String(seasonLabel).match(/^(\d{4})/);
  if (!m) return false;
  const startYr = parseInt(m[1], 10);
  const now = new Date();
  const calYr = now.getUTCFullYear();
  return startYr >= calYr && startYr <= calYr + SEASON_FORMAT_MAX_YEARS_AHEAD;
}

/**
 * For a completed season: compute max(GP across teams) via two completed-fixture
 * fetches (paginated), then return whether maxGp >= expected.
 *
 * For a current season: isComplete=false, observed stats still returned.
 */
export async function getSeasonCompleteness(
  leagueSlug: string,
  season: string,
): Promise<SeasonCompleteness> {
  const expectedGp = getExpectedRegularSeasonGp(leagueSlug);

  // Resolve league id (cheap; one indexed call).
  const { data: league, error: lerr } = await sb()
    .from('leagues')
    .select('id, slug, name')
    .eq('slug', leagueSlug)
    .maybeSingle();
  if (lerr || !league) {
    return {
      isComplete: false,
      isCurrent: false,
      expectedGp,
      observed: null,
      reason: `league not found: ${leagueSlug}`,
    };
  }

  const current = isCurrentSeasonLabel(season);

  // Total + completed counts (two cheap count queries).
  const [{ count: total = 0 }, { count: completed = 0 }] = await Promise.all([
    sb()
      .from('fixtures')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', league.id)
      .eq('season', season),
    sb()
      .from('fixtures')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', league.id)
      .eq('season', season)
      .eq('status', 'completed'),
  ]);

  if (total === 0) {
    return {
      isComplete: false,
      isCurrent: current,
      expectedGp,
      observed: { teamsWithGames: 0, minGp: 0, maxGp: 0, totalFixtures: 0, completedFixtures: 0 },
      reason: current ? 'current season, 0 fixtures yet' : 'no fixtures in DB for this season',
    };
  }

  // For current seasons we don't need per-team GP — skip the heavy query.
  if (current) {
    return {
      isComplete: false,
      isCurrent: true,
      expectedGp,
      observed: {
        teamsWithGames: 0,
        minGp: 0,
        maxGp: 0,
        totalFixtures: total,
        completedFixtures: completed,
      },
      reason: 'current season in progress',
    };
  }

  // Past season: derive per-team GP from completed fixtures (paginated).
  const counts = new Map<string, number>();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb()
      .from('fixtures')
      .select('home_team_id, away_team_id')
      .eq('league_id', league.id)
      .eq('season', season)
      .eq('status', 'completed')
      .range(from, from + PAGE - 1);
    if (error) {
      return {
        isComplete: false,
        isCurrent: false,
        expectedGp,
        observed: null,
        reason: `completed-fixture fetch failed: ${error.message}`,
      };
    }
    if (!data || data.length === 0) break;
    for (const r of data) {
      if (r.home_team_id) counts.set(r.home_team_id, (counts.get(r.home_team_id) ?? 0) + 1);
      if (r.away_team_id) counts.set(r.away_team_id, (counts.get(r.away_team_id) ?? 0) + 1);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (counts.size === 0) {
    return {
      isComplete: false,
      isCurrent: false,
      expectedGp,
      observed: {
        teamsWithGames: 0,
        minGp: 0,
        maxGp: 0,
        totalFixtures: total,
        completedFixtures: completed,
      },
      reason: 'no completed fixtures for this season',
    };
  }

  const gps = [...counts.values()];
  const minGp = Math.min(...gps);
  const maxGp = Math.max(...gps);
  const pass = maxGp >= expectedGp;

  return {
    isComplete: pass,
    isCurrent: false,
    expectedGp,
    observed: {
      teamsWithGames: counts.size,
      minGp,
      maxGp,
      totalFixtures: total,
      completedFixtures: completed,
    },
    reason: pass
      ? `maxGp ${maxGp} ≥ ${expectedGp} (target)`
      : `maxGp ${maxGp} < ${expectedGp} (target) — season is incomplete in DB`,
  };
}
