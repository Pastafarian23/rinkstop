import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getCityPageData, resolveCAProvince, slugToTitle } from '@/lib/city-page';
import CityPageContent from '@/components/CityPageContent';
import { PROVINCE_SLUGS, type ProvinceAbbr } from '@/lib/ca-provinces';
import { cityPageDecision, robotsMeta } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/**
 * Canadian province city page: /directory/canada/{province}/{city}
 *
 * Tier 1f (2026-07-07): empty pages now noindex instead of 404. See
 * united-states/[state]/[city]/page.tsx for the rationale. Note: this
 * route never had a `notFound()` gate on empty data (the orphan version
 * was permissive), so the change here is only adding the robots signal.
 */
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

  const data = await getCityPageData({
    countryName: 'Canada',
    countrySlug: 'canada',
    cityName,
    citySlug,
    regionName: provinceName,
    regionSlug: canonicalSlug,
    regionAbbr: resolved.abbr,
  });
  const decision = cityPageDecision(data.teamCount + data.rinkCount, 0, false);

  return {
    title: `${location} Hockey - Rinks & Teams`,
    description: `Find hockey teams, ice rinks, and leagues in ${location}. Discover youth programs, junior clubs, and adult leagues across the province.`,
    alternates: {
      canonical: `https://rinkstop.com/directory/canada/${canonicalSlug}/${citySlug}`,
    },
    robots: robotsMeta(decision),
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
