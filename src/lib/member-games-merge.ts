/**
 * Merge the viewer's own private-team games (from /api/scores/mine) into the
 * public games list. Pure, so it can be tested without a browser.
 *
 * - The public list is never altered or re-ordered except to interleave the
 *   viewer's games by scheduled time.
 * - A game already in the public list (same id) is not duplicated.
 * - The text search (q) is applied to the member games here, because the member
 *   endpoint does not see the search box.
 */
export type MergeableGame = {
  id: string;
  scheduled_at: string;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

export function mergeMemberGames<T extends MergeableGame>(
  publicGames: readonly T[],
  memberGames: readonly T[],
  q: string,
): T[] {
  if (memberGames.length === 0) return publicGames as T[];
  const have = new Set(publicGames.map((g) => g.id));
  const needle = q.trim().toLowerCase();
  const extra = memberGames.filter((g) => {
    if (have.has(g.id)) return false;
    if (!needle) return true;
    return (
      (g.home_team?.name || '').toLowerCase().includes(needle) ||
      (g.away_team?.name || '').toLowerCase().includes(needle)
    );
  });
  if (extra.length === 0) return publicGames as T[];
  return [...publicGames, ...extra].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );
}
