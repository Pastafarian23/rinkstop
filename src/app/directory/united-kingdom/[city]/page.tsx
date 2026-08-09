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

  return {
    title: `${cityName} Hockey - Ice Rinks & Teams`,
    description: `Find hockey teams and ice rinks in ${cityName}, United Kingdom. Discover local EIHL teams, NIHL clubs, and skating facilities.`,
    alternates: {
      canonical: `https://rinkstop.com/directory/united-kingdom/${citySlug}`,
+      languages: {
+        'en': `https://rinkstop.com/directory/united-kingdom/${citySlug}`,
+        'x-default': `https://rinkstop.com/directory/united-kingdom/${citySlug}`,
+      },
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
