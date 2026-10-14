// 2026-10-14 (Phase 2 + 3): isGameIndexable — single source of truth
// for "is this game page thin / should Google not index it".
//
// Used by:
//   - src/app/directory/games/[id]/page.tsx  (generateMetadata)
//   - src/app/directory/nhl/games/[slug]/page.tsx (generateMetadata)
//   - src/app/api/sitemap-games.xml/route.ts  (omit thin games from sitemap)
//
// Inputs are the data the page already has.  We deliberately keep the
// predicate shape stable so a thin version of it can be re-implemented
// in pure SQL (see _indexable-sitemap-candidates.sql) for the sitemap
// generator that runs on Supabase without a Next.js context.

export interface IndexableGame {
  /** Did the page render the venue block (linked highights with a venue, or a venue_details row)? */
  hasVenue?: boolean;
  /** Did both teams have at least one recent game in the form section? */
  bothTeamsHaveForm?: boolean;
  /** How many of the page modules rendered (h2h, form, period scores, etc.)? */
  moduleCount?: number;
  /** Optional: explicit "this is a finished game with no broken data" signal. */
  isFinal?: boolean;
}

/**
 * Returns true if a game page has enough content to justify a Google
 * indexing pass.  Conservative: when in doubt, return false (the
 * page is noindex+follow and we tell Google the canonical points at
 * the [id] URL or the [slug] URL).
 *
 * Thresholds (match MEMORY.md visual-QC rules):
 *  - finished games:  indexable if moduleCount >= 3 OR (hasVenue AND bothTeamsHaveForm)
 *  - in-progress:     always indexable (live scores are valuable)
 *  - scheduled:       indexable if moduleCount >= 2 (preview/team-context)
 *  - cancelled:       not indexable (thin)
 *  - postponed:       not indexable
 *  - missing data:    not indexable
 */
export function isGameIndexable(g: IndexableGame & { status?: string } = {}): boolean {
  const status = g.status || (g.isFinal ? 'completed' : undefined);
  if (!status) return false;
  if (status === 'cancelled' || status === 'postponed') return false;
  if (status === 'in_progress') return true;
  if (status === 'scheduled') return (g.moduleCount ?? 0) >= 2;
  // completed
  if (g.hasVenue && g.bothTeamsHaveForm) return true;
  return (g.moduleCount ?? 0) >= 3;
}
