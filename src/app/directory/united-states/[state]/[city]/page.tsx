import type { Metadata } from 'next';
import { getCityPageData, resolveUSState, slugToTitle } from '@/lib/city-page';
import CityPageContent from '@/components/CityPageContent';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const { abbr, name: stateName } = resolveUSState(stateSlug);
  const cityName = slugToTitle(citySlug);
  const location = `${cityName}, ${stateName}`;

  return {
    title: `${location} Hockey - Rinks & Teams`,
    description: `Find hockey teams, ice rinks, and leagues in ${location}. Discover youth programs and adult leagues near you.`,
    alternates: {
      canonical: `https://rinkstop.com/directory/united-states/${stateSlug}/${citySlug}`,
    },
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
  const cityName = slugToTitle(citySlug);

  const data = await getCityPageData({
    countryName: 'United States',
    countrySlug: 'united-states',
    cityName,
    citySlug,
    regionName: stateName,
    regionSlug: stateSlug,
    regionAbbr: stateAbbr,
  });

  return <CityPageContent data={data} />;
}
