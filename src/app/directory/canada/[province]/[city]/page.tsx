import { getCityPageData, resolveCAProvince, slugToTitle } from '@/lib/city-page';
import CityPageContent from '@/components/CityPageContent';

export const dynamic = 'force-dynamic';

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
