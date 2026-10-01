/**
 * src/lib/team-slug.ts
 *
 * Arnel 2026-10-01 — cross-link from /standings to /directory/teams/[slug].
 *
 * The standings page has team_name strings from HL (e.g. "Montréal Canadiens",
 * "Providence Bruins") but the team pages live at /directory/teams/{slug}.
 *
 * Strategy:
 *   1. For NHL, use the canonical map (32 teams, already implemented in
 *     nhl-teams-canonical.ts). Returns canonical NhlTeamCanonical object.
 *   2. For other leagues, normalize the team_name into a slug and link
 *     directly. The slug is a deterministic lowercase-hyphenated form.
 *
 * Slug generation (non-NHL):
 *   - Lowercase
 *   - Replace accented chars (é → e, ü → u, etc.)
 *   - Replace apostrophes + non-alphanumeric with hyphens
 *   - Collapse multiple hyphens, trim leading/trailing
 *
 * Returns { href, slug, exact? } where exact=true means the link was
 * resolved via the canonical NHL map (always lands on a real page).
 * For non-NHL, exact=false and the href may 404 if the slug doesn't
 * match a real team page. To avoid broken links, the caller can wrap
 * with a try/catch or use a fallback.
 */

import { NHL_TEAMS_CANONICAL, type NhlTeamCanonical } from '@/lib/nhl-teams-canonical';

const NFD = /[\u0300-\u036f]/g;

export function normalizeTeamName(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(NFD, '')
    .replace(/['']/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

export function teamSlug(name: string): string {
  return normalizeTeamName(name).replace(/\s+/g, '-');
}

export function resolveNhlTeam(teamName: string): NhlTeamCanonical | undefined {
  const norm = normalizeTeamName(teamName);
  // Try exact normalized-name match
  for (const t of NHL_TEAMS_CANONICAL) {
    if (normalizeTeamName(t.name) === norm) return t;
  }
  // Fallback: short-name match (e.g. "Bruins" vs "Boston Bruins")
  for (const t of NHL_TEAMS_CANONICAL) {
    if (normalizeTeamName(t.shortName + ' ' + t.city) === norm) return t;
  }
  return undefined;
}

export function standingsTeamHref(leagueName: string | null | undefined, teamName: string): string {
  if (!teamName) return '/standings';

  // NHL path: try canonical map
  if (leagueName === 'NHL') {
    const norm = normalizeTeamName(teamName);
    for (const t of NHL_TEAMS_CANONICAL) {
      if (normalizeTeamName(t.name) === norm) {
        return `/directory/nhl/teams/${t.slug}`;
      }
    }
    // Fallback: try slugify
    return `/directory/nhl/teams/${teamSlug(teamName)}`;
  }

  // Generic path: link to /directory/teams/{slug}
  return `/directory/teams/${teamSlug(teamName)}`;
}