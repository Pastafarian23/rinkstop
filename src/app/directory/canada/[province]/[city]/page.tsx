import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getCityPageData, resolveCAProvince, slugToTitle } from '@/lib/city-page';
import CityPageContent from '@/components/CityPageContent';
import { PROVINCE_SLUGS, type ProvinceAbbr } from '@/lib/ca-provinces';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ province: string; city: string }>;
}): Promise<Metadata> {
  const { province: provinceSlug, city: citySlug } = await params;
  const resolved = resolveCAProvince(provinceSlug);
  if (!resolved) return { title: 'Province not found' };
  const provinceName = resolved.name;
  const canonicalSlug = PROVINCE_SLUGS[resolved.abbr as ProvinceAbbr] || provinceSlug;
  const cityName = slugToTitle(citySlug);
  const location = `${cityName}, ${provinceName}`;

  return {
    title: `${location} Hockey - Rinks & Teams`,
    description: `Find hockey teams, ice rinks, and leagues in ${location}. Discover youth programs, junior clubs, and adult leagues across the province.`,
    alternates: {
      canonical: `https://rinkstop.com/directory/canada/${canonicalSlug}/${citySlug}`,
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
  const resolved = resolveCAProvince(provinceSlug);
  if (!resolved) notFound();
  const canonicalSlug = PROVINCE_SLUGS[resolved.abbr as ProvinceAbbr] || provinceSlug;
  // 301 redirect from abbr form (e.g. /directory/canada/ns/halifax) to full-name form
  if (provinceSlug.toLowerCase() !== canonicalSlug) {
    redirect(`/directory/canada/${canonicalSlug}/${citySlug}`);
  }
  const provinceAbbr = resolved.abbr;
  const provinceName = resolved.name;
  const cityName = slugToTitle(citySlug);

  const data = await getCityPageData({
    countryName: 'Canada',
    countrySlug: 'canada',
    cityName,
    citySlug,
    regionName: provinceName,
    regionSlug: canonicalSlug,
    regionAbbr: provinceAbbr,
  });

  return <CityPageContent data={data} />;
}
