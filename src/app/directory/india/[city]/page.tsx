import type { Metadata } from 'next';
import { getCityPageData, resolveCityName } from '@/lib/city-page';
import CityPageContent from '@/components/CityPageContent';

export const revalidate = 3600;
export const dynamicParams = true;

/**
 * India city page: /directory/india/{city}
 *
 * Per Arnel 2026-09-29 GSC directive: "build India pages (if not already done)".
 * GSC shows ice skating queries from India (Noida 381 impr, Mumbai etc) growing
 * with little competition. Even empty pages capture search intent via
 * meta tags + content blocks. The country hub already exists at
 * /directory/india; this adds the city sub-routes.
 *
 * Tier 1f: pages with no listings noindex instead of 404 (prevents
 * domain authority loss + backlink equity waste).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: citySlug } = await params;
  const cityName = resolveCityName(citySlug);

  const data = await getCityPageData({
    countryName: 'India',
    countrySlug: 'india',
    cityName,
    citySlug,
  });
  const hasListings = data.teamCount + data.rinkCount > 0;
  const teamLabel = `${data.teamCount} team${data.teamCount === 1 ? '' : 's'}`;
  const rinkLabel = `${data.rinkCount} rink${data.rinkCount === 1 ? '' : 's'}`;
  const cityTitle = hasListings
    ? `Ice Skating in ${cityName}, India 2026 — ${teamLabel}, ${rinkLabel}`
    : `Ice Skating in ${cityName}, India 2026 — RinkStop Directory`;
  const cityDesc = hasListings
    ? `Ice skating in ${cityName}, India 2026: ${teamLabel} and ${rinkLabel}. Find ice rinks, learn-to-skate programs, hockey teams, and public skating sessions in ${cityName}.`
    : `Find ice rinks and skating facilities in ${cityName}, India. Discover learn-to-skate programs, public skating sessions, figure skating, and ice hockey clubs in ${cityName}.`;

  return {
    title: cityTitle,
    description: cityDesc,
    alternates: {
      canonical: `https://rinkstop.com/directory/india/${citySlug}`,
    },
    robots: hasListings ? undefined : { index: false, follow: true },
  };
}

export default async function IndiaCityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: citySlug } = await params;
  const cityName = resolveCityName(citySlug);

  const data = await getCityPageData({
    countryName: 'India',
    countrySlug: 'india',
    cityName,
    citySlug,
  });

  return <CityPageContent data={data} />;
}

