// 2026-10-14: SQL helper for the sitemap to compute the SAME
// indexability decision as the page-side isGameIndexable in
// src/lib/game-indexable.ts.
//
// The page uses REAL module data (form, H2H, next, same-day, recap).
// The sitemap has to decide from just the fixture row + the joined
// league slug, so it applies SQL approximations that match the
// page's check closely:
//
//   status in ('in_progress')                          → always index
//   status in ('cancelled','postponed')                → never index
//   status='scheduled' AND both team_ids present        → index
//     (we can't count H2H/next/same-day modules in SQL
//      without subqueries, so we assume the page will have
//      the basic preview + countdown + same-day-league
//      modules — the page's own isGameIndexable is the
//      ground truth)
//   status='completed' AND both team_ids present        → index
//     (same reasoning — completed games almost always have
//      form + h2h + next games for top-tier teams)
//
// Agreement between page and sitemap is verified by
// scripts/_check-predicate-agreement.cjs.  Any disagreement
// indicates the page rejected (noindex) what the sitemap
// included or vice versa, and the operator can refine the SQL.

const TOP_TIER_LEAGUE_SLUGS = new Set([
  'nhl','ahl','pwhl','khl','shl','liiga','del','nl',
  'extraliga','ncaa','chl','whl','ohl','qmjhl','ushl',
]);

export function isLowerLeague(leagueSlug: string | null | undefined): boolean {
  if (!leagueSlug) return true;
  return !TOP_TIER_LEAGUE_SLUGS.has(leagueSlug.toLowerCase());
}

export const INDEXABILITY_SQL = `
  CASE
    WHEN f.status = 'cancelled' THEN 'noindex'
    WHEN f.status = 'postponed' THEN 'noindex'
    WHEN f.status = 'in_progress' THEN 'index'
    WHEN f.status = 'scheduled' AND f.home_team_id IS NOT NULL AND f.away_team_id IS NOT NULL THEN 'index'
    WHEN f.status = 'completed' AND f.home_team_id IS NOT NULL AND f.away_team_id IS NOT NULL THEN 'index'
    ELSE 'noindex'
  END
`;

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
    return { sitemapIndexable: true, sitemapModuleCountEstimate: 5, sitemapReason: 'in_progress → always index' };
  }
  if (status === 'scheduled') {
    if (has_home_team && has_away_team) {
      return { sitemapIndexable: true, sitemapModuleCountEstimate: 2, sitemapReason: 'scheduled with both team names → index (page is ground truth)' };
    }
    return { sitemapIndexable: false, sitemapModuleCountEstimate: 0, sitemapReason: 'scheduled but missing team_ids → noindex' };
  }
  if (status === 'completed') {
    if (has_home_team && has_away_team) {
      const lower = isLowerLeague(league_slug || null);
      const moduleCount = lower ? 3 : 4;
      return { sitemapIndexable: true, sitemapModuleCountEstimate: moduleCount, sitemapReason: `completed with both team names, ${lower ? 'lower' : 'top-tier'} league → index (page is ground truth)` };
    }
    return { sitemapIndexable: false, sitemapModuleCountEstimate: 0, sitemapReason: 'completed but missing team_ids → noindex' };
  }
  return { sitemapIndexable: false, sitemapModuleCountEstimate: 0, sitemapReason: `unknown status '${status}' → noindex` };
}
