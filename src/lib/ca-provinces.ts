/**
 * ca-provinces.ts
 *
 * Province / state helpers for Canada (and the same shape applies to US states).
 *
 * Why this exists:
 *   The `rinks.province_state` column for Canada rinks was historically written
 *   in two formats: 199 with the full name ("Nova Scotia") and 20 with the
 *   2-letter abbreviation ("NS"). The 2-letter format is the canonical one
 *   (matches the directory's URL slugs and what the country import script
 *   expects), so we migrated the 199 to abbr in June 2026.
 *
 *   This file is the single source of truth for:
 *     1. abbr → full name (display in rink detail titles, breadcrumbs, etc.)
 *     2. abbr → URL slug (for sitemap and directory links)
 *     3. full name → abbr (defensive: if old data ever sneaks back in)
 *
 *   If you add a new province / territory, add it to BOTH the
 *   PROVINCE_FULL_NAMES and PROVINCE_SLUGS maps.
 *
 *   If you change the display name, do it here only — not in any page file.
 */

export type ProvinceAbbr =
  | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT' | 'NU' | 'ON' | 'PE' | 'QC' | 'SK' | 'YT';

/** abbr → full name (display) */
export const PROVINCE_FULL_NAMES: Record<ProvinceAbbr, string> = {
  AB: 'Alberta',
  BC: 'British Columbia',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador',
  NS: 'Nova Scotia',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
  ON: 'Ontario',
  PE: 'Prince Edward Island',
  QC: 'Quebec',
  SK: 'Saskatchewan',
  YT: 'Yukon',
};

/** full name (lowercased) → abbr */
export const PROVINCE_FROM_FULL: Record<string, ProvinceAbbr> = Object.fromEntries(
  Object.entries(PROVINCE_FULL_NAMES).map(([abbr, full]) => [full.toLowerCase(), abbr as ProvinceAbbr]),
);

/** abbr (lowercased) → URL slug */
export const PROVINCE_SLUGS: Record<ProvinceAbbr, string> = {
  AB: 'alberta',
  BC: 'british-columbia',
  MB: 'manitoba',
  NB: 'new-brunswick',
  NL: 'newfoundland-and-labrador',
  NS: 'nova-scotia',
  NT: 'northwest-territories',
  NU: 'nunavut',
  ON: 'ontario',
  PE: 'prince-edward-island',
  QC: 'quebec',
  SK: 'saskatchewan',
  YT: 'yukon',
};

/** slug → abbr */
export const PROVINCE_FROM_SLUG: Record<string, ProvinceAbbr> = Object.fromEntries(
  Object.entries(PROVINCE_SLUGS).map(([abbr, slug]) => [slug, abbr as ProvinceAbbr]),
);

/** abbr → slug, supporting both 'ns' and 'NS' lookups */
export const PROVINCE_FROM_SLUG_OR_ABBR: Record<string, ProvinceAbbr> = (() => {
  const m: Record<string, ProvinceAbbr> = {};
  for (const [abbr, slug] of Object.entries(PROVINCE_SLUGS) as [ProvinceAbbr, string][]) {
    m[slug] = abbr;
    m[abbr.toLowerCase()] = abbr;
  }
  return m;
})();

/**
 * Display name for a province_state value.
 * - 'NS' → 'Nova Scotia'
 * - 'Nova Scotia' → 'Nova Scotia' (idempotent for legacy data)
 * - 'ON' → 'Ontario'
 * - Anything else → returns the input unchanged
 */
export function provinceDisplayName(value: string | null | undefined): string {
  if (!value) return '';
  // Already a known abbr
  if (value in PROVINCE_FULL_NAMES) return PROVINCE_FULL_NAMES[value as ProvinceAbbr];
  // Match full name (case-insensitive)
  const fromFull = PROVINCE_FROM_FULL[value.toLowerCase()];
  if (fromFull) return PROVINCE_FULL_NAMES[fromFull];
  // Unknown — return as-is rather than blanking it
  return value;
}

/** URL slug for a province_state value. Returns the abbr.toLowerCase() as fallback. */
export function provinceSlug(value: string | null | undefined): string {
  if (!value) return '';
  // Already a known abbr
  if (value in PROVINCE_FULL_NAMES) return PROVINCE_SLUGS[value as ProvinceAbbr];
  // Match full name
  const fromFull = PROVINCE_FROM_FULL[value.toLowerCase()];
  if (fromFull) return PROVINCE_SLUGS[fromFull];
  // Fallback
  return value.toLowerCase();
}

/** Normalize any province input to the abbr. Returns the input if unrecognized. */
export function provinceAbbr(value: string | null | undefined): string {
  if (!value) return '';
  if (value in PROVINCE_FULL_NAMES) return value;
  const fromFull = PROVINCE_FROM_FULL[value.toLowerCase()];
  return fromFull || value;
}
