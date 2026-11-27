/**
 * Public URLs for the league hierarchy shown on team profiles.
 *
 * Verified 2026-11-27: `/directory/leagues/<slug>` serves league pages
 * (HTTP 200 on the live site). The bare `/leagues/<slug>` path does not
 * exist and returned 404. There is no `/organizations/<slug>` route in the
 * app, so organizations are shown as plain text.
 */
export function leagueHref(slug: string | null | undefined): string | null {
  const s = (slug ?? '').trim();
  return s ? `/directory/leagues/${encodeURIComponent(s)}` : null;
}
