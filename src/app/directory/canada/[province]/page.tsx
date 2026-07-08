import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PROVINCE_FROM_SLUG_OR_ABBR, PROVINCE_FULL_NAMES, PROVINCE_SLUGS, type ProvinceAbbr } from '@/lib/ca-provinces';
import StateProvincePageContent, { type CityRow } from '@/components/StateProvincePageContent';
import { buildRegionIntro, buildProvinceFAQs } from '@/lib/state-faq-builder';
import { getProvinceHockeyFacts } from '@/lib/state-hockey-facts';
import { robotsMeta } from '@/lib/seo';
import HockeyCanadaAd from '@/components/HockeyCanadaAd';

/**
 * Canada province page: /directory/canada/{province}
 *
 * Replaced 2026-07-07 (Tier 1d) to use the shared
 * StateProvincePageContent component. Same depth as the US state
 * route and the city/country pages. Hockey Canada branch names and
 * CHL league references are sourced from PROVINCE_HOCKEY_FACTS
 * (lib/state-hockey-facts.ts) — never fabricated.
 */

export const dynamic = 'force-dynamic';

/** Resolve the URL segment (slug or abbr) to the province abbr + canonical slug. */
function resolveProvince(segment: string): { abbr: ProvinceAbbr; slug: string } | null {
  const abbr = PROVINCE_FROM_SLUG_OR_ABBR[segment.toLowerCase()];
  if (!abbr) return null;
  return { abbr, slug: PROVINCE_SLUGS[abbr] };
}

interface CityData {
  city: string;
  rink_count: number;
  team_count: number;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ province: string }>;
}): Promise<Metadata> {
  const { province: provinceSegment } = await params;
  const resolved = resolveProvince(provinceSegment);
  if (!resolved) return { title: 'Province not found' };
  const provinceName = PROVINCE_FULL_NAMES[resolved.abbr];

  // Tier 1f (2026-07-07): noindex decision for empty provinces. The province
  // page never had a notFound() gate, so this is just adding the robots
  // signal so empty provinces aren't indexed.
  const { data: rinks } = await supabase
    .from('rinks')
    .select('city')
    .eq('country', 'Canada')
    .eq('province_state', resolved.abbr)
    .eq('is_active', true)
    .not('city', 'is', null);
  const { count: teamTotal } = await supabase
    .from('teams')
    .select('id', { count: 'exact', head: true })
    .eq('country', 'Canada')
    .eq('province_state', resolved.abbr)
    .eq('is_active', true);
  const citySet = new Set((rinks || []).map(r => r.city).filter(Boolean));
  // Tier 1f: binary gate — see united-states/[state]/page.tsx for rationale
  const hasContent = citySet.size > 0 && ((rinks || []).length + (teamTotal || 0)) > 0;
  const decision = { indexable: hasContent, reason: hasContent ? 'has content' : 'empty', uniquenessScore: hasContent ? 50 : 0 };

  return {
    title: `Hockey in ${provinceName}`,
    description: `Hockey teams, rinks, and cities in ${provinceName}, Canada. Browse local hockey listings in this province.`,
    alternates: {
      canonical: `https://rinkstop.com/directory/canada/${resolved.slug}`,
    },
    robots: robotsMeta(decision),
    openGraph: {
      title: `Hockey in ${provinceName}`,
      description: `Hockey teams, rinks, and cities in ${provinceName}, Canada.`,
      url: `https://rinkstop.com/directory/canada/${resolved.slug}`,
      siteName: 'RinkStop',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Hockey in ${provinceName}`,
      description: `Hockey teams, rinks, and cities in ${provinceName}, Canada.`,
    },
  };
}

export default async function CanadaProvincePage({
  params,
}: {
  params: Promise<{ province: string }>;
}) {
  const { province: provinceSegment } = await params;

  const resolved = resolveProvince(provinceSegment);
  if (!resolved) return notFound();
  // 301 redirect from abbr form (e.g. /directory/canada/ns) to full-name form (/directory/canada/nova-scotia)
  if (provinceSegment.toLowerCase() !== resolved.slug) {
    redirect(`/directory/canada/${resolved.slug}`);
  }
  const provinceAbbr = resolved.abbr;
  const provinceName = PROVINCE_FULL_NAMES[provinceAbbr];

  // Get rinks in this province
  const { data: rinks } = await supabase
    .from('rinks')
    .select('city')
    .eq('country', 'Canada')
    .eq('province_state', provinceAbbr)
    .eq('is_active', true)
    .not('city', 'is', null);

  // Count rinks per city
  const rinkCounts = new Map<string, number>();
  (rinks || []).forEach(r => {
    if (r.city) {
      rinkCounts.set(r.city, (rinkCounts.get(r.city) || 0) + 1);
    }
  });

  // Get cities that have teams in this province
  const cityNames = Array.from(rinkCounts.keys());
  let teamCounts = new Map<string, number>();

  if (cityNames.length > 0) {
    const { data: teams } = await supabase
      .from('teams')
      .select('city, province_state')
      .eq('country', 'Canada')
      .eq('province_state', provinceAbbr)
      .eq('is_active', true);

    (teams || []).forEach(t => {
      if (t.city) {
        teamCounts.set(t.city, (teamCounts.get(t.city) || 0) + 1);
      }
    });
  }

  // Merge data
  const allCities = new Set<string>([...rinkCounts.keys(), ...teamCounts.keys()]);
  const totalRinkCount = Array.from(rinkCounts.values()).reduce((a, b) => a + b, 0);
  const totalTeamCount = Array.from(teamCounts.values()).reduce((a, b) => a + b, 0);

  const cities: CityRow[] = Array.from(allCities).map(city => ({
    city,
    rink_count: rinkCounts.get(city) || 0,
    team_count: teamCounts.get(city) || 0,
    city_slug: city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
  })).sort((a, b) => (b.rink_count + b.team_count) - (a.rink_count + a.team_count));

  const faqInput = {
    regionName: provinceName,
    regionAbbr: provinceAbbr,
    countryName: 'Canada',
    cityCount: cities.length,
    rinkCount: totalRinkCount,
    teamCount: totalTeamCount,
    topCities: cities.map(c => ({ city: c.city, rinks: c.rink_count, teams: c.team_count })),
  };

  const facts = getProvinceHockeyFacts(provinceAbbr);

  const intro = buildRegionIntro(faqInput, facts);
  const faqs = buildProvinceFAQs(faqInput);

  // PR2 (2026-07-08): top leagues for cross-link section. Leagues table
  // has no province_state column, so country is the most granular filter.
  // Same query shape as the rink detail page's "leagues in country" section.
  const { data: topLeagues } = await supabase
    .from('leagues')
    .select('id, name, slug, level, logo_url')
    .eq('country', 'Canada')
    .eq('is_active', true)
    .limit(8);

  return (
    <>
      {/* Hockey Canada affiliate ad — top placement, matches country + city pages */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
        <HockeyCanadaAd size="300x250" />
      </div>
      <StateProvincePageContent
        regionName={provinceName}
        regionAbbr={provinceAbbr}
        countryName="Canada"
        parentUrl="/directory/canada"
        parentLabel="Canada"
        countryCode="CA"
        showHockeyCanadaAd
        cities={cities}
        rinkCount={totalRinkCount}
        teamCount={totalTeamCount}
        faqs={faqs}
        intro={intro}
        topLeagues={topLeagues || []}
      />
    </>
  );
}