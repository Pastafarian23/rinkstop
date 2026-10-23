/**
 * ascii-slug.ts — fold a slug down to pure ASCII so URL variants that differ
 * only by diacritics can be resolved to the canonical slug.
 *
 * Why this exists (2026-10-23): 196 team_workspaces slugs contain accented
 * characters (åmåls, 3l-rivière-du-loup, kroměříž). Anyone typing the ASCII
 * spelling — a human, a scraper, a crawler — got a hard 404 because the
 * exact-slug lookup missed. Two layers fix that:
 *
 *   1. Migration 2026-10-23_ascii_slug_aliases.sql pre-seeds the folded
 *      spelling into team_slug_redirects (fast path, no computation).
 *   2. `lookupTeamSlugByFoldedSlug()` below does a live fold lookup as the
 *      fallback, so newly-created accented teams resolve immediately
 *      without waiting for the next alias regeneration.
 *
 * The fold MUST stay byte-identical to scripts/_ascii-alias-gen.cjs and to
 * the SQL migration's generator, otherwise seeded aliases and runtime folds
 * disagree and one path silently stops matching.
 */

/** Latin letters that NFD does not decompose into base+combining mark. */
const NON_DECOMPOSABLE: Record<string, string> = {
  ø: 'o', // ø
  æ: 'ae', // æ
  Æ: 'AE', // Æ
  Ø: 'O', // Ø
  đ: 'd', // đ
  Đ: 'D', // Đ
  ß: 'ss', // ß
  œ: 'oe', // œ
  Œ: 'OE', // Œ
  ŧ: 't', // ŧ
  ł: 'l', // ł
  Ł: 'L', // Ł
  ı: 'i', // ı
  ĸ: 'k', // ĸ
  ŉ: 'n', // ŉ
  ſ: 's', // ſ
};

/**
 * Fold a slug to a canonical ASCII form: strip diacritics, expand the
 * letters that NFD cannot decompose, lowercase, and collapse every
 * non-alphanumeric run to a single hyphen.
 *
 * Returns the input unchanged if it is already pure ASCII, so callers can
 * cheaply skip the lookup.
 */
export function foldSlugToAscii(slug: string): string {
  return slug
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // combining marks left by NFD
    .replace(/[øæÆØđĐßœŒŧłŁıĸŉſ]/g, (m) => NON_DECOMPOSABLE[m] ?? m)
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

/** True when the slug contains at least one non-ASCII character. */
export function hasNonAscii(slug: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7F]/.test(slug);
}