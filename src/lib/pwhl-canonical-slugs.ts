/**
 * The 12 official PWHL franchise slugs (thepwhl.com /en/teams/{slug}).
 *
 * Dependency-free on purpose: src/middleware.ts runs in the Edge runtime and must not
 * import the registry (which uses the database client). A test keeps this list
 * identical to PWHL_FRANCHISES in pwhl-franchises.ts.
 *
 * A canonical franchise slug must never be redirected by a slug-redirect table or by
 * the ASCII-fold fallback, otherwise it can loop with the alias -> canonical redirect.
 */
export const PWHL_CANONICAL_SLUG_LIST: readonly string[] = [
  'boston-fleet',
  'hamilton-havoc',
  'montreal-victoire',
  'new-york-sirens',
  'ottawa-charge',
  'toronto-sceptres',
  'detroit-clutch',
  'minnesota-frost',
  'san-jose-sea-lions',
  'seattle-torrent',
  'vancouver-goldeneyes',
  'vegas-vanguards',
];

export function isPwhlCanonicalSlugPure(slug: string): boolean {
  return PWHL_CANONICAL_SLUG_LIST.includes(slug);
}
