import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import StateProvincePageContent, { type CityRow } from '@/components/StateProvincePageContent';
import { buildRegionIntro, buildStateFAQs } from '@/lib/state-faq-builder';
import { getStateHockeyFacts } from '@/lib/state-hockey-facts';
import { robotsMeta } from '@/lib/seo';

/**
 * US state page: /directory/united-states/{state}
 *
 * Replaced 2026-07-07 (Tier 1d) to use the shared
 * StateProvincePageContent component. Same depth as the city and
 * country pages — FAQ accordion, FAQ schema, editorial intro, stats,
 * city list, breadcrumb schema. All claims sourced from
 * STATE_HOCKEY_FACTS (lib/state-hockey-facts.ts) or DB.
 */

export const dynamic = 'force-dynamic';

// US state slugs → abbreviation
const US_STATES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new-hampshire': 'NH', 'new-jersey': 'NJ',
  'new-mexico': 'NM', 'new-york': 'NY', 'north-carolina': 'NC', 'north-dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode-island': 'RI', 'south-carolina': 'SC',
  'south-dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west-virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district-of-columbia': 'DC',
};

const STATE_NAMES: Record<string, string> = {
  'al': 'Alabama', 'ak': 'Alaska', 'az': 'Arizona', 'ar': 'Arkansas', 'ca': 'California',
  'co': 'Colorado', 'ct': 'Connecticut', 'de': 'Delaware', 'fl': 'Florida', 'ga': 'Georgia',
  'hi': 'Hawaii', 'id': 'Idaho', 'il': 'Illinois', 'in': 'Indiana', 'ia': 'Iowa',
  'ks': 'Kansas', 'ky': 'Kentucky', 'la': 'Louisiana', 'me': 'Maine', 'md': 'Maryland',
  'ma': 'Massachusetts', 'mi': 'Michigan', 'mn': 'Minnesota', 'ms': 'Mississippi', 'mo': 'Missouri',
  'mt': 'Montana', 'ne': 'Nebraska', 'nv': 'Nevada', 'nh': 'New Hampshire', 'nj': 'New Jersey',
  'nm': 'New Mexico', 'ny': 'New York', 'nc': 'North Carolina', 'nd': 'North Dakota', 'oh': 'Ohio',
  'ok': 'Oklahoma', 'or': 'Oregon', 'pa': 'Pennsylvania', 'ri': 'Rhode Island', 'sc': 'South Carolina',
  'sd': 'South Dakota', 'tn': 'Tennessee', 'tx': 'Texas', 'ut': 'Utah', 'vt': 'Vermont',
  'va': 'Virginia', 'wa': 'Washington', 'wv': 'West Virginia', 'wi': 'Wisconsin', 'wy': 'Wyoming',
  'dc': 'District of Columbia',
};

interface CityData {
  city: string;
  rink_count: number;
  team_count: number;
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const stateAbbr = US_STATES[stateSlug] || stateSlug.toUpperCase();
  const stateName = STATE_NAMES[stateAbbr.toLowerCase()] || stateSlug.replace(/-/g, ' ');

  // Tier 1f (2026-07-07): run the same data query as the page so we can
  // make a noindex decision based on the same numbers. Empty states (e.g.
  // a state with 0 rinks/teams) render with noindex rather than going to
  // 404 — a state URL is still a real estate for /claim-your-listing.
  const { data: rinks } = await supabase
    .from('rinks')
    .select('city')
    .eq('country', 'United States')
    .or(`province_state.eq.${stateAbbr},province_state.eq.${stateName}`)
    .eq('is_active', true)
    .not('city', 'is', null);

  const cityNames = Array.from(new Set((rinks || []).map(r => r.city).filter(Boolean)));
  let totalRinkCount = (rinks || []).length;
  let totalTeamCount = 0;
  if (cityNames.length > 0) {
    const { count: tc } = await supabase
      .from('teams')
      .select('id', { count: 'exact', head: true })
      .eq('country', 'United States')
      .eq('is_active', true)
      .in('city', cityNames);
    totalTeamCount = tc || 0;
  }
  // Tier 1f: binary gate — a state page is indexable if it has cities with
  // listings. The full statePageDecision weights word count too, but the
  // StateProvincePageContent component always renders 500+ words when it
  // has data, so a positive count = a useful page. Pages with 0 cities are
  // noindex (truly empty) — covered by the cityNames.length check.
  const hasContent = cityNames.length > 0 && (totalRinkCount + totalTeamCount) > 0;
  const decision = { indexable: hasContent, reason: hasContent ? 'has content' : 'empty', uniquenessScore: hasContent ? 50 : 0 };

  return {
    title: `${stateName} Hockey - Ice Rinks, Teams & Leagues`,
    description: `Find every hockey rink, team, and league in ${stateName}. Discover youth programs, adult leagues, and NCAA teams near you.`,
    alternates: {
      canonical: `https://rinkstop.com/directory/united-states/${stateSlug}`,
    },
    robots: robotsMeta(decision),
    openGraph: {
      title: `${stateName} Hockey`,
      description: `Hockey in ${stateName}: ice rinks, teams, leagues, and youth programs.`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${stateName} Hockey`,
      description: `Hockey in ${stateName}: ice rinks, teams, leagues, and youth programs.`,
    },
  };
}

export default async function USStatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state: stateSlug } = await params;

  const stateAbbr = US_STATES[stateSlug] || stateSlug.toUpperCase();
  const stateName = STATE_NAMES[stateAbbr.toLowerCase()] || stateSlug.replace(/-/g, ' ');

  // Get rinks in this state. Defensive OR clause recovers rows tagged with
  // the FULL state name (e.g. 'Alabama') rather than the abbreviation.
  // Verified 2026-07-07: 18 rinks across 9 states use full-name tagging.
  const { data: rinks } = await supabase
    .from('rinks')
    .select('city')
    .eq('country', 'United States')
    .or(`province_state.eq.${stateAbbr},province_state.eq.${stateName}`)
    .eq('is_active', true)
    .not('city', 'is', null);

  // Count rinks per city
  const rinkCounts = new Map<string, number>();
  (rinks || []).forEach(r => {
    if (r.city) {
      rinkCounts.set(r.city, (rinkCounts.get(r.city) || 0) + 1);
    }
  });

  // Get teams by city
  const cityNames = Array.from(rinkCounts.keys());
  let teamCounts = new Map<string, number>();

  if (cityNames.length > 0) {
    const { data: teams } = await supabase
      .from('teams')
      .select('city')
      .eq('country', 'United States')
      .eq('is_active', true)
      .in('city', cityNames);

    (teams || []).forEach(t => {
      if (t.city) {
        teamCounts.set(t.city, (teamCounts.get(t.city) || 0) + 1);
      }
    });
  }

  const allCities = new Set<string>([...rinkCounts.keys(), ...teamCounts.keys()]);
  const totalRinkCount = Array.from(rinkCounts.values()).reduce((a, b) => a + b, 0);
  const totalTeamCount = Array.from(teamCounts.values()).reduce((a, b) => a + b, 0);

  const cities: CityRow[] = Array.from(allCities)
    .map(city => ({
      city,
      rink_count: rinkCounts.get(city) || 0,
      team_count: teamCounts.get(city) || 0,
      city_slug: city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }))
    .sort((a, b) => (b.rink_count + b.team_count) - (a.rink_count + a.team_count));

  // Build intro + FAQs from real data
  const faqInput = {
    regionName: stateName,
    regionAbbr: stateAbbr,
    countryName: 'United States',
    cityCount: cities.length,
    rinkCount: totalRinkCount,
    teamCount: totalTeamCount,
    topCities: cities.map(c => ({ city: c.city, rinks: c.rink_count, teams: c.team_count })),
  };

  // Lazy-import removed: static import above
  const facts = getStateHockeyFacts(stateAbbr);

  const intro = buildRegionIntro(faqInput, facts);
  const faqs = buildStateFAQs(faqInput);

  // PR2 (2026-07-08): top leagues for cross-link section. Leagues table
  // has no province_state column, so country is the most granular filter.
  // Same query shape as the rink detail page's "leagues in country" section.
  const { data: topLeagues } = await supabase
    .from('leagues')
    .select('id, name, slug, level, logo_url')
    .eq('country', 'United States')
    .eq('is_active', true)
    .limit(8);

  return (
    <StateProvincePageContent
      regionName={stateName}
      regionAbbr={stateAbbr}
      countryName="United States"
      parentUrl="/directory/united-states"
      parentLabel="United States"
      countryCode="US"
      cities={cities}
      rinkCount={totalRinkCount}
      teamCount={totalTeamCount}
      faqs={faqs}
      intro={intro}
      topLeagues={topLeagues || []}
    />
  );
}