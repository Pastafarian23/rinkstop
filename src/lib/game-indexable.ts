// 2026-10-14: isGameIndexable — single source of truth for "is
// this game page worth indexing?".  Now uses REAL data:
//
//   - status must be in_progress, scheduled, or completed.
//   - both teams' form must exist (non-null from getTeamForm).
//   - at least 3 of: H2H > 0, home next game exists, away next
//     game exists, same-day games > 0, completed result, upcoming
//     (scheduled within 7 days so a "countdown" makes sense).
//
// Cancelled and postponed never indexable.
//
// Used by:
//   - src/app/directory/games/[id]/page.tsx  (generateMetadata)
//   - src/app/directory/nhl/games/[slug]/page.tsx (generateMetadata)
//   - src/app/sitemap-games.xml/route.ts      (the page can decide
//     this from its fetched data; the sitemap applies the same
//     SQL-equivalent — see src/lib/game-indexable-sql.ts).
//
// The page and the sitemap MUST agree.  When the page builds the
// indexability check from real module data, the SQL sitemap must
// surface the same condition.  The agreement is verified by
// scripts/_check-predicate-agreement.cjs.

export interface IndexableGame {
  status?: string;
  /** bothTeamsHaveForm = both getTeamForm() calls returned non-null. */
  bothTeamsHaveForm: boolean;
  /** At least 3 of these must be true for the page to be indexable. */
  hasH2H?: boolean;
  hasHomeNextGame?: boolean;
  hasAwayNextGame?: boolean;
  hasSameDayGames?: boolean;
  isCompletedWithScore?: boolean;
  isUpcomingWithinWeek?: boolean;
}

export function isGameIndexable(g: IndexableGame): boolean {
  if (!g.status) return false;
  if (g.status === 'cancelled' || g.status === 'postponed') return false;
  if (g.status === 'in_progress') return true; // live games always index
  if (!g.bothTeamsHaveForm) return false;     // thin if no form
  if (g.status === 'scheduled') {
    // scheduled needs form + at least 3 module signals
    const moduleCount = [
      g.hasH2H,
      g.hasHomeNextGame,
      g.hasAwayNextGame,
      g.hasSameDayGames,
      g.isUpcomingWithinWeek, // scheduled+upcoming (countdown-able)
      g.isCompletedWithScore, // typically false for scheduled
    ].filter(Boolean).length;
    return moduleCount >= 3;
  }
  if (g.status === 'completed') {
    if (g.isCompletedWithScore) {
      // Completed with score + form + at least 3 signals.
      const moduleCount = [
        g.hasH2H,
        g.hasHomeNextGame,
        g.hasAwayNextGame,
        g.hasSameDayGames,
        true, // completed result itself counts
        g.isUpcomingWithinWeek, // typically false
      ].filter(Boolean).length;
      return moduleCount >= 3;
    }
    return false; // completed without a score is thin
  }
  return false;
}
