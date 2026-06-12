import type { Metadata } from 'next';
import { getCityPageData, resolveCAProvince, slugToTitle } from '@/lib/city-page';
import CityPageContent from '@/components/CityPageContent';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ province: string; city: string }>;
}): Promise<Metadata> {
  const { province: provinceSlug, city: citySlug } = await params;
  const { name: provinceName } = resolveCAProvince(provinceSlug);
  const cityName = slugToTitle(citySlug);
  const location = `${cityName}, ${provinceName}`;

  return {
    title: `${location} Hockey - Rinks & Teams`,
    description: `Find hockey teams, ice rinks, and leagues in ${location}. Discover youth programs, junior clubs, and adult leagues across the province.`,
    alternates: {
      canonical: `https://rinkstop.com/directory/canada/${provinceSlug}/${citySlug}`,
    },
    openGraph: {
      title: `${location} Hockey`,
      description: `Hockey in ${location}: teams, rinks, and leagues.`,
      type: 'website',
    },
  };
}

export default async function CanadaCityPage({
  params,
}: {
  params: Promise<{ province: string; city: string }>;
}) {
  const { province: provinceSlug, city: citySlug } = await params;
  const { abbr: provinceAbbr, name: provinceName } = resolveCAProvince(provinceSlug);
  const cityName = slugToTitle(citySlug);

  const data = await getCityPageData({
    countryName: 'Canada',
    countrySlug: 'canada',
    cityName,
    citySlug,
    regionName: provinceName,
    regionSlug: provinceSlug,
    regionAbbr: provinceAbbr,
  });

  return <CityPageContent data={data} />;
}
