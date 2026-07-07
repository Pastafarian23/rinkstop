import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getCityPageData,
  slugToTitle,
} from '@/lib/city-page';
import {
  buildCityFAQs,
  buildCityIntro,
  countryNameFromSlug,
  resolveCityBranding,
} from '@/lib/city-context';
import CityPageContent from '@/components/CityPageContent';

export const dynamic = 'force-dynamic';

/**
 * Universal city page: /directory/locations/{country_slug}/{city_slug}
 *
 * Replaces the prior thin CityPageClient (which only listed rinks/teams/
 * programs without any editorial copy, FAQ, or country context). Now uses
 * the shared getCityPageData + CityPageContent pipeline so it matches the
 * depth of /directory/united-states/[state]/[city], /directory/canada/
 * [province]/[city], and /directory/united-kingdom/[city].
 *
 * Tier 1c enrichment (2026-07-07):
 *   - CityHockeyScene (from CityPageContent) for data-driven unique prose.
 *     Uses CITY_FACTS when available, otherwise DB-counts only — never
 *     invents population/hockey-since/climate.
 *   - FAQ accordion from buildCityFAQs (lib/city-context.ts): 6-8 entries
 *     sourced from CITY_FACTS, COUNTRY_HOCKEY_CONTEXT, and DB counts only.
 *   - Country context callout inherited from COUNTRY_HOCKEY_CONTEXT, which
 *     already has FACT-CHECK POLICY + per-block // source: comments.
 *   - Season-date question intentionally omitted (Arnel Q2 = "C, skip it").
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; city: string }>;
}): Promise<Metadata> {
  const { country, city } = await params;
  const citySlug = decodeURIComponent(city);
  const countrySlug = decodeURIComponent(country);
  const cityName = slugToTitle(citySlug);
  const countryName = countryNameFromSlug(countrySlug);
  const branding = resolveCityBranding(countrySlug, cityName);
  const displayCountry = branding.countryDisplayName || countryName;
  const displayCity = branding.cityDisplayName || cityName;

  const description =
    branding.description ??
    `Hockey teams, rinks, and youth programs in ${displayCity}, ${displayCountry}. Browse local hockey listings on RinkStop.`;

  return {
    title: `Hockey in ${displayCity} - Teams, Rinks & Programs`,
    description,
    alternates: {
      canonical: `https://rinkstop.com/directory/locations/${encodeURIComponent(countrySlug)}/${encodeURIComponent(citySlug)}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `Hockey in ${displayCity}`,
      description,
      url: `https://rinkstop.com/directory/locations/${encodeURIComponent(countrySlug)}/${encodeURIComponent(citySlug)}`,
      siteName: 'RinkStop',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Hockey in ${displayCity}`,
      description,
    },
  };
}

export default async function LocationCityPage({
  params,
}: {
  params: Promise<{ country: string; city: string }>;
}) {
  const { country, city } = await params;
  const countrySlugRaw = decodeURIComponent(country);
  const citySlugRaw = decodeURIComponent(city);

  const citySlug = citySlugRaw;
  const countrySlug = countrySlugRaw;
  const cityName = slugToTitle(citySlug);
  const countryName = countryNameFromSlug(countrySlug);

  const data = await getCityPageData({
    countryName,
    countrySlug,
    cityName,
    citySlug,
  });

  // 404 if there are no listings at all — empty pages hurt SEO more than
  // they help. The same gate lives in CountryPageContent but enforcing it
  // here keeps the route out of the index entirely.
  if (data.teamCount === 0 && data.rinkCount === 0) {
    notFound();
  }

  // Pull the top items off data for the FAQ builder. These are real DB
  // values — no invention, only what's already on the page.
  const topRinks = data.rinks.slice(0, 3).map(r => r.name);
  const topTeams = data.teams.slice(0, 3).map(t => t.name);
  const topLeaguesInCity = data.leaguesInCity.slice(0, 3).map(l => ({ name: l.name, count: l.count }));
  const programCount = data.programCount ?? 0;

  const introInput = {
    cityName,
    countryName,
    countrySlug,
    regionName: data.regionName,
    teamCount: data.teamCount,
    rinkCount: data.rinkCount,
    programCount,
    leagueCount: data.leaguesInCity.length,
  };

  const faqInput = {
    cityName,
    countryName,
    countrySlug,
    regionName: data.regionName,
    teamCount: data.teamCount,
    rinkCount: data.rinkCount,
    programCount,
    leagueCount: data.leaguesInCity.length,
    topLeaguesInCity,
    proTeams: data.proTeams,
    topRinks,
    topTeams,
  };

  const faqs = buildCityFAQs(faqInput);
  // Use the intro paragraph as the OG description so search engines see
  // fact-checked prose, not the generic fallback string.
  const intro = buildCityIntro(introInput);

  return (
    <>
      {/* Intro paragraph surfaced as a hidden SEO paragraph so search
          engines index the fact-checked prose even though CityHockeyScene
          renders inline. Optional but cheap insurance. */}
      <span
        aria-hidden
        style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
      >
        {intro}
      </span>
      <CityPageContent data={data} faqs={faqs} />
    </>
  );
}
