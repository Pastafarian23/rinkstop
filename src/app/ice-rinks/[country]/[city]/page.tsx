import type { Metadata } from 'next';
import { getCityPageData, resolveCityName, slugToTitle } from '@/lib/city-page';
import { robotsMeta } from '@/lib/seo';
import CityPageContent from '@/components/CityPageContent';

export const revalidate = 3600;
export const dynamicParams = true;

/**
 * Country-only city page: /ice-rinks/{country}/{city}
 *
 * Mirrors /directory/united-states/[state]/[city]/page.tsx but without
 * region/state context. The same getCityPageData builder is used; the
 * `regionName` / `regionSlug` / `regionAbbr` opts are left undefined, which
 * means:
 *   - No province_state filter applied to rinks/teams queries (matches
 *     "any rink in this country whose city matches")
 *   - The peer-cities cross-link section is skipped (no region to scope to)
 *   - Breadcrumb stops at country (no region segment)
 *
 * Tier 1f (2026-07-07): empty pages render with noindex instead of 404 so
 * the URL stays alive and backlinks pass equity.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; city: string }>;
}): Promise<Metadata> {
  const { country: countrySlug, city: citySlug } = await params;
  const countryName = slugToTitle(countrySlug);
  const cityName = resolveCityName(citySlug);
  const location = `${cityName}, ${countryName}`;

  const data = await getCityPageData({
    countryName,
    countrySlug,
    cityName,
    citySlug,
  });
  // Tier 1f: same binary gate as the state-scoped variant — pages with no
  // rinks and no teams are noindex. The full uniqueness decision lives in
  // the page component because it has the full data; metadata only uses
  // the count.
  const hasListings = data.teamCount + data.rinkCount > 0;
  const decision = {
    indexable: hasListings,
    reason: hasListings ? 'has listings' : 'no listings',
    uniquenessScore: hasListings ? 50 : 0,
  };

  return {
    title: `${location} Hockey - Rinks & Teams`,
    description: `Find hockey teams, ice rinks, and leagues in ${location}. Discover youth programs and adult leagues near you.`,
    alternates: {
      canonical: `https://rinkstop.com/ice-rinks/${countrySlug}/${citySlug}`,
    },
    robots: robotsMeta(decision),
    openGraph: {
      title: `${location} Hockey`,
      description: `Hockey in ${location}: ice rinks, teams, and leagues.`,
      type: 'website',
    },
  };
}

export default async function CountryCityRinksPage({
  params,
}: {
  params: Promise<{ country: string; city: string }>;
}) {
  const { country: countrySlug, city: citySlug } = await params;
  const countryName = slugToTitle(countrySlug);
  const cityName = resolveCityName(citySlug);

  const data = await getCityPageData({
    countryName,
    countrySlug,
    cityName,
    citySlug,
  });

  // Tier 1f (2026-07-07): render the page even when empty so the URL
  // exists; metadata carries the noindex signal so Google drops it from
  // its index without us returning 404.
  return <CityPageContent data={data} />;
}