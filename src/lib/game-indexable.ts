/**
 * src/lib/game-indexable.ts
 *
 * Predicate: should a game page be indexed by search engines?
 *
 * A game page is considered "thin" (noindex) when it lacks the core data
 * modules that make it useful — venue, team form, head-to-head, next-game,
 * or same-day context.  A page with fewer than 3 modules is not useful to
 * a search user and risks an AdSense thin-content review rejection.
 *
 * The same logic is applied in generateMetadata (server-side, build/ISR
 * time) and optionally in a runtime ThinPageNoindex client component.
 */

export interface IndexabilityInputs {
  hasVenue: boolean;
  bothTeamsHaveForm: boolean;
  moduleCount: number;
}

/**
 * Returns true when the game page has enough data to be indexable.
 * Callers: generateMetadata in page.tsx (server) and ThinPageNoindex (client).
 */
export function isGameIndexable({
  hasVenue,
  bothTeamsHaveForm,
  moduleCount,
}: IndexabilityInputs): boolean {
  return bothTeamsHaveForm && moduleCount >= 3 && hasVenue;
}

/**
 * SQL predicate fragment for sitemap queries.
 * Matches isGameIndexable(): venue IS NOT NULL + both teams have form rows.
 * Include ONLY rows where all indexability conditions are met.
 */
export const INDEXABILITY_SQL = `
  venue_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM fixtures f1 WHERE f1.home_team_id = fixtures.home_team_id AND f1.status = 'completed' AND f1.id != fixtures.id LIMIT 1)
  AND EXISTS (SELECT 1 FROM fixtures f2 WHERE f2.away_team_id = fixtures.away_team_id AND f2.status = 'completed' AND f2.id != fixtures.id LIMIT 1)
  AND EXISTS (
    SELECT 1 FROM fixtures mod1
    WHERE mod1.league_id = fixtures.league_id
      AND mod1.status = 'completed'
      AND mod1.id != fixtures.id
      AND (mod1.home_team_id = fixtures.home_team_id OR mod1.away_team_id = fixtures.home_team_id)
    LIMIT 1
  )
  AND EXISTS (
    SELECT 1 FROM fixtures mod2
    WHERE mod2.league_id = fixtures.league_id
      AND mod2.status = 'completed'
      AND mod2.id != fixtures.id
      AND (mod2.home_team_id = fixtures.away_team_id OR mod2.away_team_id = fixtures.away_team_id)
    LIMIT 1
  )
  AND (
    SELECT COUNT(*)
    FROM fixtures mod_modules
    WHERE mod_modules.league_id = fixtures.league_id
      AND mod_modules.scheduled_at >= NOW() - INTERVAL '7 days'
      AND mod_modules.id != fixtures.id
  ) >= 3
`;
