// /lib/ice-marketplace-city-match.ts
//
// Shared helper for matching URL city slugs to rinks.city values.
//
// Background: the sitemap generator (src/app/sitemap-ice-marketplace.xml)
// uses cityToSlug(city) to produce the URL segment. The reverse —
// titleCase(slug.replace(/-/g, ' ')) — is lossy for cities with periods,
// accents, postal codes, or non-ASCII chars. Examples from Sept 14 audit:
//
//   'St. Petersburg'         → slug 'st-petersburg'    → reverse 'St Petersburg'
//   'São Bernardo do Campo'  → 's-o-bernardo-do-campo-sp-09760-280'
//                            → reverse 'S O Bernardo Do Campo Sp 09760 280'
//
// The page routes naively do `ilike('city', cityName)` — but the cityName
// is the lossy reverse, so no match → notFound().
//
// This helper produces a list of plausible name variants that the page
// route can OR-join to find the actual rinks for a given slug. We
// intentionally do NOT try to be exhaustive — variants that don't help
// in practice would slow the query. Instead we try the common patterns
// observed in the 101 404s from the audit:
//
//   1. Direct titleCase(slug.replace(/-/g, ' '))
//   2. Same with 'St' → 'St.' (period) restoration
//   3. Drop a leading single-letter "word" that came from accented chars
//      (e.g. 'S O Bernardo' = original 'São Bernardo')
//   4. Strip trailing "[State] [Postal]" suffixes
//   5. Strip trailing '[State-or-Region]' descriptors

export function citySlugToVariants(citySlug: string): string[] {
  const out = new Set<string>();
  const base = citySlug.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  if (!base) return [];

  // 1. Title-cased base.
  const title = base.replace(/\b\w/g, (c) => c.toUpperCase());
  out.add(title);

  // 2. Restore period after "St" — common for "St. Petersburg", "St. Louis", etc.
  out.add(title.replace(/\bSt\b/g, 'St.'));

  // 3. Drop a leading 1-letter "word" caused by accent stripping
  //    (e.g. 'S O Bernardo' came from 'São Bernardo').
  const parts = title.split(' ');
  if (parts.length > 1 && parts[0].length === 1) {
    out.add(parts.slice(1).join(' '));
  }

  // 4. Strip trailing "[State] [Postal]" or "[State] [Postal] [Postal2]".
  //    e.g. 'Moscow Kozhukhovskaya' is the original, but slug includes the
  //    postal in some cases.
  const strippedPostal = title
    .replace(/\s+[A-Z]{2,3}\s+\d{3,6}(\s+\d{2,6})?$/, '')
    .trim();
  if (strippedPostal && strippedPostal !== title) {
    out.add(strippedPostal);
  }

  // 5. Strip trailing "[State-or-Region]" descriptor (e.g. "Moscow Oblast").
  const strippedRegion = title.replace(/\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/, '').trim();
  if (strippedRegion && strippedRegion !== title && strippedRegion.length >= 3) {
    out.add(strippedRegion);
  }

  return Array.from(out);
}
