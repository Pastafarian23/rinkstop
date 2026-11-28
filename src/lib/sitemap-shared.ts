// Shared constants and quality filters used by /sitemap.xml and the
// per-entity sub-sitemaps (/sitemap-rinks.xml, /sitemap-teams.xml, etc.).
// Keep these in sync with src/app/sitemap.ts — sub-sitemaps emit the same
// URLs as the main sitemap, just split by entity type. Same quality
// thresholds = same slugs in/out = zero risk to already-indexed pages.

export const baseUrl = 'https://rinkstop.com';

/**
 * Absolute, URL-safe team detail URL for the sitemap.
 *
 * Some legacy team slugs contain spaces (e.g. "freiburg-ober sud"). A raw
 * space inside a <loc> is not a valid URL, so every slug is percent-encoded.
 * The detail page decodes the path segment, so the encoded URL resolves to
 * the same team. Plain slugs are unchanged by encodeURIComponent.
 */
export function teamSitemapUrl(slug: string): string {
  return `${baseUrl}/directory/teams/${encodeURIComponent(slug)}`;
}

export function isHighQualityTeam(t: any): boolean {
  if (!t.slug) return false;
  return !!(t.country_code || t.home_city || t.league_id || t.division || t.avatar_url || t.website_url);
}

export function isHighQualityRink(r: any): boolean {
  return !!(r.slug && r.city && r.country);
}

export function isHighQualityLeague(l: any): boolean {
  return !!(l.slug && (l.country || l.level || l.website_url));
}

export function isHighQualityPlayer(p: any): boolean {
  if (!(p.first_name || p.last_name)) return false;
  if (!p.team_id) return false;
  return !!(p.position || p.nationality || p.headshot_url);
}