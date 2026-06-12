import { permanentRedirect } from 'next/navigation';
import { slugToCountry, countryToSlug } from '@/lib/country-page';

interface Props {
  params: Promise<{ country: string; city: string }>;
}

/**
 * Legacy /hockey/[country]/[city] route — RETIRED.
 *
 * The /directory/{country} and /directory/{country}/{province-or-state}/{city}
 * routes are the canonical homes. The old route used 2-letter ISO codes
 * (e.g. /hockey/us/chicago) and skipped the province/state level, so we
 * can't always 308 to a single equivalent URL.
 *
 * Strategy: redirect to the country's directory page with the city name
 * preserved as a query param. The country page already supports a `?city=`
 * filter (and falls back to a search), so users land on the right content.
 *
 * Example: /hockey/us/chicago → /directory/united-states?city=chicago
 */
export default async function HockeyCityPage({ params }: Props) {
  const { country, city } = await params;
  const countryName = slugToCountry(country);
  const fullSlug = countryToSlug(countryName);

  if (!countryName) {
    permanentRedirect('/directory');
  }
  permanentRedirect(`/directory/${fullSlug}?city=${encodeURIComponent(city)}`);
}
