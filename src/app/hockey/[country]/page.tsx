import { permanentRedirect } from 'next/navigation';
import { slugToCountry, countryToSlug } from '@/lib/country-page';

interface Props {
  params: Promise<{ country: string }>;
}

/**
 * Legacy /hockey/[country] route — RETIRED.
 *
 * The /directory/{country} page is the canonical home for per-country
 * hockey content. The old route used 2-letter ISO codes (e.g. /hockey/us)
 * while the new directory uses full country slugs (/directory/united-states).
 *
 * Map the 2-letter code to the full slug, then 308-redirect. For
 * country codes that don't map, fall back to /directory so users don't
 * get a dead-end.
 */
export default async function HockeyCountryPage({ params }: Props) {
  const { country } = await params;
  const countryName = slugToCountry(country);
  const fullSlug = countryToSlug(countryName);

  // slugToCountry is a loose fallback: if the input is already a full
  // country name slug (e.g. "united-states"), it returns that name. If
  // the input is a 2-letter code (e.g. "us"), it maps to "United States".
  // Either way, we get a valid country name and can convert to the
  // canonical full-slug.
  if (!countryName || countryName === 'us' || countryName === 'ca') {
    // Should never happen after slugToCountry, but defensive.
    permanentRedirect('/directory');
  }
  permanentRedirect(`/directory/${fullSlug}`);
}
