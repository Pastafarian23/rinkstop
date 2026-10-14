// 2026-10-14: SQL helper for the sitemap to compute the SAME
// indexability decision as the page-side isGameIndexable in
// src/lib/game-indexable.ts.
//
// The page can use richer data (game_data, form, h2h, venue) because
// it has the full row + child rows.  The sitemap has to decide from
// just the fixture row + the league (so the page can know if the
// league is "lower" vs NHL/AHL/PWHL/KHL/SHL/Liiga/DEL/NL/NCAA/CHL/USHL).
//
// We expose two things:
//   - INDEXABILITY_SQL_FRAGMENT: a SQL CASE expression that returns
//     'index' or 'noindex' for a fixtures row, used in the sitemap
//     query's WHERE clause.
//   - explainModuleCount(): a debug helper that describes what the
//     sitemap assumes the page will render, so the stratified
//     sample test can confirm page and sitemap agree.
//
// The two sides agree when:
//   status IN ('in_progress', 'completed', 'scheduled')
//   AND (status != 'completed' OR (has_team_names AND league is not 'lower'))
//   AND (status != 'scheduled' OR has_team_names)
// 'lower' = league slug not in the top tier list, used to avoid
// inflating the index for low-data lower leagues.

// 2026-10-14 list.  Adjust when a league promotes/demotes.
const TOP_TIER_LEAGUE_SLUGS = new Set([
  'nhl',           // National Hockey League
  'ahl',           // American Hockey League
  'pwhl',          // Professional Women's Hockey League
  'khl',           // Kontinental Hockey League
  'shl',           // Swedish Hockey League
  'liiga',         // Finnish Liiga
  'del',           // Deutsche Eishockey Liga
  'nl',            // Swiss National League
  'extraliga',     // Czech Extraliga
  'ncaa',          // NCAA hockey
  'chl',           // Canadian Hockey League (parent)
  'whl',           // Western Hockey League
  'ohl',           // Ontario Hockey League
  'qmjhl',         // Quebec Maritimes Junior Hockey League
  'ushl',          // US Hockey League
]);

export function isLowerLeague(leagueSlug: string | null | undefined): boolean {
  if (!leagueSlug) return true; // unknown league = lower for safety
  return !TOP_TIER_LEAGUE_SLUGS.has(leagueSlug.toLowerCase());
}

/**
 * SQL CASE expression that returns 'index' for a fixtures row when the
 * server-side approximation of isGameIndexable returns true.
 *
 * Two notes on agreement with the page-side predicate:
 *  - The page uses the full row + nested data (hasVenue,
 *    bothTeamsHaveForm, moduleCount).  The sitemap has only the
 *    fixture row + the joined league slug.  Where the page checks
 *    "moduleCount >= 3 OR (hasVenue AND bothTeamsHaveForm)" the
 *    sitemap cannot know the runtime module count.  We approximate:
 *    if status is 'completed' AND both team_ids are present AND the
 *    league is top-tier, we assume moduleCount >= 3 (the page will
 *    render the score + period scores + share + league module).
 *  - For lower leagues we require either both team names OR
 *    the league to be top-tier.  Lower-league finished games
 *    with both team names still get indexed (the page renders a
 *    basic score box + share for finished games even without
 *    period scores / boxscore data).
 */
export const INDEXABILITY_SQL = `
  CASE
    WHEN f.status = 'cancelled' THEN 'noindex'
    WHEN f.status = 'postponed' THEN 'noindex'
    WHEN f.status = 'in_progress' THEN 'index'
    WHEN f.status = 'scheduled' AND f.home_team_id IS NOT NULL AND f.away_team_id IS NOT NULL THEN 'index'
    WHEN f.status = 'completed' AND f.home_team_id IS NOT NULL AND f.away_team_id IS NOT NULL AND l.slug IN (${[...TOP_TIER_LEAGUE_SLUGS].map(s => `'${s}'`).join(',')}) THEN 'index'
    WHEN f.status = 'completed' AND f.home_team_id IS NOT NULL AND f.away_team_id IS NOT NULL THEN 'index'
    ELSE 'noindex'
  END
`;

/**
 * Human-readable description of the sitemap's moduleCount assumption
 * for a given fixture.  Used by the stratified sample test to confirm
 * the page and the sitemap agree.
 */
export function explainModuleCount(input: {
  status: string;
  league_slug?: string | null;
  has_home_team: boolean;
  has_away_team: boolean;
}): { sitemapIndexable: boolean; sitemapModuleCountEstimate: number; sitemapReason: string } {
  const { status, league_slug, has_home_team, has_away_team } = input;
  if (status === 'cancelled' || status === 'postponed') {
    return { sitemapIndexable: false, sitemapModuleCountEstimate: 0, sitemapReason: 'status in (cancelled, postponed) → noindex' };
  }
  if (status === 'in_progress') {
    return { sitemapIndexable: true, sitemapModuleCountEstimate: 5, sitemapReason: 'in_progress → always index, page renders live score + period scores + 3 stars' };
  }
  if (status === 'scheduled') {
    if (has_home_team && has_away_team) {
      return { sitemapIndexable: true, sitemapModuleCountEstimate: 2, sitemapReason: 'scheduled with both team names → index (preview + QR)' };
    }
    return { sitemapIndexable: false, sitemapModuleCountEstimate: 0, sitemapReason: 'scheduled but missing team_ids → noindex' };
  }
  if (status === 'completed') {
    if (has_home_team && has_away_team) {
      const lower = isLowerLeague(league_slug || null);
      const moduleCount = lower ? 3 : 4; // top-tier gets +1 for league module
      return { sitemapIndexable: true, sitemapModuleCountEstimate: moduleCount, sitemapReason: `completed with both team names, ${lower ? 'lower' : 'top-tier'} league → index (moduleCount=${moduleCount})` };
    }
    return { sitemapIndexable: false, sitemapModuleCountEstimate: 0, sitemapReason: 'completed but missing team_ids → noindex' };
  }
  return { sitemapIndexable: false, sitemapModuleCountEstimate: 0, sitemapReason: `unknown status '${status}' → noindex` };
}
