import type { Metadata } from 'next';
import { getCityPageData, resolveCityName, slugToTitle } from '@/lib/city-page';
import { robotsMeta } from '@/lib/seo';
import CityPageContent from '@/components/CityPageContent';
import { withDefaultOg } from '@/lib/metadata-defaults';

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

  // 2026-09-12 WS26 GSC CTR pass: tighten title + add counts.
  // Old: "${location} Hockey - Rinks & Teams" (no counts, no year, no "Ice" keyword).
  // New: include team + rink counts when listings exist.
  const cityTitle = hasListings
    ? `Ice Hockey in ${location} 2026 — ${data.teamCount} Teams, ${data.rinkCount} Rinks`
    : `${location} Hockey — RinkStop Directory`;
  const cityDesc = hasListings
    ? `Ice hockey in ${location} 2026: ${data.teamCount} teams across ${data.leaguesInCity?.length ?? 0} leagues and ${data.rinkCount} rinks. Browse youth programs and adult leagues near you.`
    : `Find hockey teams, ice rinks, and leagues in ${location}. Discover youth programs and adult leagues near you.`;

  return {
    title: cityTitle,
    description: cityDesc,
    alternates: {
      canonical: `https://rinkstop.com/ice-rinks/${countrySlug}/${citySlug}`,
    },
    robots: robotsMeta(decision),
    openGraph: withDefaultOg({
      title: cityTitle,
      description: cityDesc,
      type: 'website',
    }),
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