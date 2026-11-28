/**
 * One country predicate for the Teams directory, shared by /api/teams (every
 * page and Load more) and the server-rendered first page. Using the same rule
 * keeps the displayed count, the paged list and the first page in agreement.
 *
 * A team matches when its country_code equals the ISO code. A team with no
 * country_code falls back to its home_country text, but only when the filter
 * was given as a full country name (for example "Canada"). A 2-letter filter
 * matches country_code only.
 *
 * Before this predicate, the first page matched on home_country as well, but
 * the count and Load more did not. One team with country_code NULL and
 * home_country 'Canada' showed on the first page and was missing from the count
 * (130 shown against a server count of 129).
 */
export function teamCountryOr(iso: string, rawCountry: string | null | undefined): string {
  const raw = (rawCountry ?? '').trim();
  const isFullName = raw.length > 0 && raw.length !== 2;
  if (!isFullName) return `country_code.eq.${iso}`;
  // Full names come from the directory dropdown: plain letters, spaces, hyphens,
  // apostrophes. Anything else is dropped from the fallback so it cannot break
  // the PostgREST filter syntax.
  const safe = raw.replace(/[^A-Za-z .'-]/g, '');
  if (!safe) return `country_code.eq.${iso}`;
  return `country_code.eq.${iso},and(country_code.is.null,home_country.ilike.${safe})`;
}
