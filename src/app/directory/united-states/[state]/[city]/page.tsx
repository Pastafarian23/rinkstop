import type { Metadata } from 'next';
import { getCityPageData, resolveUSState, resolveCityName } from '@/lib/city-page';
import { cityPageDecision, robotsMeta } from '@/lib/seo';
import CityPageContent from '@/components/CityPageContent';

export const dynamic = 'force-dynamic';

/**
 * US state city page: /directory/united-states/{state}/{city}
 *
 * Tier 1f (2026-07-07): pages with no listings no longer 404 — they render
 * with a noindex meta tag instead. The URL stays alive (so backlinks pass
 * equity, users can still reach the page, and `/claim-your-listing` is the
 * visible CTA), but Google drops it from the index. Empty-but-existing is
 * better for SEO than 404 because:
 *   - 404s cost domain authority over time
 *   - Backlinks to empty URLs become dead-ends (wasted link equity)
 *   - A noindex 200 lets Google apply the right policy itself
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const { abbr, name: stateName } = resolveUSState(stateSlug);
  const cityName = resolveCityName(citySlug);
  const location = `${cityName}, ${stateName}`;

  // Cheap pre-check: if the city has nothing in the DB, noindex immediately.
  // We don't have the full data here (it lives in the page component) but
  // we can use the same data builder — it's idempotent and the supabase
  // roundtrip is already a single shared connection per request.
  const data = await getCityPageData({
    countryName: 'United States',
    countrySlug: 'united-states',
    cityName,
    citySlug,
    regionName: stateName,
    regionSlug: stateSlug,
    regionAbbr: abbr,
  });
  const decision = cityPageDecision(data.teamCount + data.rinkCount, 0, false);

  return {
    title: `${location} Hockey - Rinks & Teams`,
    description: `Find hockey teams, ice rinks, and leagues in ${location}. Discover youth programs and adult leagues near you.`,
    alternates: {
      canonical: `https://rinkstop.com/directory/united-states/${stateSlug}/${citySlug}`,
    },
    robots: robotsMeta(decision),
    openGraph: {
      title: `${location} Hockey`,
      description: `Hockey in ${location}: ice rinks, teams, and leagues.`,
      type: 'website',
    },
  };
}

export default async function USStateCityPage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state: stateSlug, city: citySlug } = await params;
  const { abbr: stateAbbr, name: stateName } = resolveUSState(stateSlug);
  const cityName = resolveCityName(citySlug);

  const data = await getCityPageData({
    countryName: 'United States',
    countrySlug: 'united-states',
    cityName,
    citySlug,
    regionName: stateName,
    regionSlug: stateSlug,
    regionAbbr: stateAbbr,
  });

  // Tier 1f (2026-07-07): render the page even when empty so the URL exists
  // and `notFound()` is no longer used here. The metadata carries the
  // noindex signal, so Google drops the empty page from its index without
  // us returning 404.
  return <CityPageContent data={data} />;
}
