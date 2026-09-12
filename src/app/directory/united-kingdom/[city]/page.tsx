import type { Metadata } from 'next';
import { getCityPageData, resolveCityName } from '@/lib/city-page';
import CityPageContent from '@/components/CityPageContent';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: citySlug } = await params;
  const cityName = resolveCityName(citySlug);

  // 2026-09-12 WS26 GSC CTR pass: tighten title + add counts.
  // Old: "${cityName} Hockey - Ice Rinks & Teams" (no counts, no year, no "Ice" keyword).
  // New: include team + rink counts when listings exist (page body uses
  // the same `data` so we read once and share).
  const data = await getCityPageData({
    countryName: 'United Kingdom',
    countrySlug: 'united-kingdom',
    cityName,
    citySlug,
  });
  const hasListings = data.teamCount + data.rinkCount > 0;
  const cityTitle = hasListings
    ? `Ice Hockey in ${cityName}, UK 2026 — ${data.teamCount} Teams, ${data.rinkCount} Rinks`
    : `${cityName} Hockey — RinkStop Directory`;
  const cityDesc = hasListings
    ? `Ice hockey in ${cityName}, United Kingdom 2026: ${data.teamCount} teams and ${data.rinkCount} rinks. Discover local EIHL teams, NIHL clubs, and skating facilities.`
    : `Find hockey teams and ice rinks in ${cityName}, United Kingdom. Discover local EIHL teams, NIHL clubs, and skating facilities.`;

  return {
    title: cityTitle,
    description: cityDesc,
    alternates: {
      canonical: `https://rinkstop.com/directory/united-kingdom/${citySlug}`,
    },
  };
}

export default async function UKCityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: citySlug } = await params;
  const cityName = resolveCityName(citySlug);

  const data = await getCityPageData({
    countryName: 'United Kingdom',
    countrySlug: 'united-kingdom',
    cityName,
    citySlug,
  });

  return <CityPageContent data={data} />;
}
