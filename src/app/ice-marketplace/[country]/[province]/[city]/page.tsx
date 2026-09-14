// /ice-marketplace/[country]/[province]/[city]
//
// City-scoped ice marketplace hub. Catches the same US/CA city-path
// pattern used by /directory/[country]/[province]/[city] so we can
// have a unique SEO page for every city where rinks exist.
//
// Renders the marketplace with a city pre-filter, plus a 200+ word
// SEO body so the page is indexable (not a thin filtered-list page).

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { citySlugToVariants } from '@/lib/ice-marketplace-city-match';
import CityMarketplaceClient from '../../../_components/CityMarketplaceClient';

export const dynamic = 'force-dynamic';

const US_STATE_ABBR: Record<string, string> = {
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

const CA_PROVINCE_ABBR: Record<string, string> = {
  'Alberta': 'AB', 'British Columbia': 'BC', 'Manitoba': 'MB',
  'New Brunswick': 'NB', 'Newfoundland and Labrador': 'NL', 'Nova Scotia': 'NS',
  'Northwest Territories': 'NT', 'Nunavut': 'NU', 'Ontario': 'ON',
  'Prince Edward Island': 'PE', 'Quebec': 'QC', 'Saskatchewan': 'SK', 'Yukon': 'YT',
};

interface PageProps {
  params: Promise<{ country: string; province: string; city: string }>;
}

const COUNTRY_NAMES: Record<string, string> = {
  'united-states': 'United States',
  'canada': 'Canada',
  'mexico': 'Mexico',
  'united-kingdom': 'United Kingdom',
  'sweden': 'Sweden',
  'finland': 'Finland',
  'germany': 'Germany',
  'russia': 'Russia',
  'czech-republic': 'Czech Republic',
  'switzerland': 'Switzerland',
  'france': 'France',
  'norway': 'Norway',
  'denmark': 'Denmark',
  'austria': 'Austria',
  'slovakia': 'Slovakia',
  'japan': 'Japan',
  'australia': 'Australia',
  'philippines': 'Philippines',
};

const US_STATES: Record<string, string> = {
  alabama: 'Alabama', alaska: 'Alaska', arizona: 'Arizona', arkansas: 'Arkansas', california: 'California',
  colorado: 'Colorado', connecticut: 'Connecticut', delaware: 'Delaware', florida: 'Florida', georgia: 'Georgia',
  hawaii: 'Hawaii', idaho: 'Idaho', illinois: 'Illinois', indiana: 'Indiana', iowa: 'Iowa',
  kansas: 'Kansas', kentucky: 'Kentucky', louisiana: 'Louisiana', maine: 'Maine', maryland: 'Maryland',
  massachusetts: 'Massachusetts', michigan: 'Michigan', minnesota: 'Minnesota', mississippi: 'Mississippi',
  missouri: 'Missouri', montana: 'Montana', nebraska: 'Nebraska', nevada: 'Nevada', 'new-hampshire': 'New Hampshire',
  'new-jersey': 'New Jersey', 'new-mexico': 'New Mexico', 'new-york': 'New York', 'north-carolina': 'North Carolina',
  'north-dakota': 'North Dakota', ohio: 'Ohio', oklahoma: 'Oklahoma', oregon: 'Oregon', pennsylvania: 'Pennsylvania',
  'rhode-island': 'Rhode Island', 'south-carolina': 'South Carolina', 'south-dakota': 'South Dakota',
  tennessee: 'Tennessee', texas: 'Texas', utah: 'Utah', vermont: 'Vermont', virginia: 'Virginia',
  washington: 'Washington', 'west-virginia': 'West Virginia', wisconsin: 'Wisconsin', wyoming: 'Wyoming',
};

const CA_PROVINCES: Record<string, string> = {
  alberta: 'Alberta', 'british-columbia': 'British Columbia', manitoba: 'Manitoba',
  'new-brunswick': 'New Brunswick', 'newfoundland-and-labrador': 'Newfoundland and Labrador',
  'nova-scotia': 'Nova Scotia', ontario: 'Ontario', 'prince-edward-island': 'Prince Edward Island',
  quebec: 'Quebec', saskatchewan: 'Saskatchewan',
};

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country: countrySlug, province: provinceSlug, city: citySlug } = await params;
  const countryName = COUNTRY_NAMES[countrySlug] || titleCase(countrySlug.replace(/-/g, ' '));
  const isUSorCA = countrySlug === 'united-states' || countrySlug === 'canada';
  const provinceName = isUSorCA
    ? US_STATES[provinceSlug] || CA_PROVINCES[provinceSlug] || titleCase(provinceSlug.replace(/-/g, ' '))
    : null;
  const cityName = titleCase(citySlug.replace(/-/g, ' '));
  const location = provinceName ? `${cityName}, ${provinceName}` : `${cityName}, ${countryName}`;

  // WS27 PR5h (2026-09-14): noindex when the city has 0 active ice
  // listings. Without this gate, the sitemap emits 1,479 city URLs and
  // Google indexes 1,478 of them as 'No ice listings available' thin
  // pages, diluting crawl budget and suppressing the rest of the site.
  //
  // We do the listings count lookup here rather than sharing state with
  // the page component because Next.js runs generateMetadata and the
  // page independently. The query is fast (PostgREST cache + index on
  // ice_listings.status + start_time).
  let listingsCount = 1; // default to 1 (index) so error fallback doesn't noindex by accident
  try {
    // WS27 PR5i (2026-09-14): try multiple city name variants to handle
    // slug↔name round-trip failure (cities with periods, accents, postal codes).
    const cityOrFilter = citySlugToVariants(citySlug)
      .map((v) => `city.ilike.*${v}*`)
      .join(',');
    let rinksForCity = supabaseAdmin
      .from('rinks')
      .select('id')
      .eq('is_active', true)
      .ilike('country', countryName)
      .or(cityOrFilter)
      .limit(200);
    if (isUSorCA && provinceName) {
      // WS27 PR5i (2026-09-14): include CA province abbreviation in the
      // OR filter so pages like /ice-marketplace/canada/nova-scotia/sydney
      // find rinks with province_state='NS' in the DB.
      const stateAbbr = US_STATE_ABBR[provinceSlug.toLowerCase()] || CA_PROVINCE_ABBR[provinceName] || '';
      rinksForCity = rinksForCity.or(
        `province_state.eq.${provinceName},province_state.eq.${stateAbbr}`
      );
    }
    const { data: cityRinks } = await rinksForCity;
    const rinkIds = (cityRinks || []).map((r: { id: string }) => r.id);
    if (rinkIds.length > 0) {
      const { count } = await supabaseAdmin
        .from('ice_listings')
        .select('id', { count: 'exact', head: true })
        .in('rink_id', rinkIds)
        .eq('visibility', 'public')
        .eq('status', 'available')
        .gte('start_time', new Date().toISOString());
      listingsCount = count || 0;
    } else {
      listingsCount = 0;
    }
  } catch {
    // Default to index on error.
    listingsCount = 1;
  }

  return {
    title: `Open Ice Time in ${location} | RinkStop`,
    description: `Find open ice time and hockey practice slots for sale or rent in ${location}. Browse practice ice, tournament slots, and clinic ice from local rinks, clubs, and teams.`,
    alternates: { canonical: `https://rinkstop.com/ice-marketplace/${countrySlug}/${provinceSlug}/${citySlug}` },
    robots: { index: listingsCount > 0, follow: true },
  };
}

export default async function CityIceMarketplacePage({ params }: PageProps) {
  const { country: countrySlug, province: provinceSlug, city: citySlug } = await params;
  const countryName = COUNTRY_NAMES[countrySlug] || titleCase(countrySlug.replace(/-/g, ' '));
  const isUSorCA = countrySlug === 'united-states' || countrySlug === 'canada';
  const provinceName = isUSorCA
    ? US_STATES[provinceSlug] || CA_PROVINCES[provinceSlug] || titleCase(provinceSlug.replace(/-/g, ' '))
    : null;
  const cityName = titleCase(citySlug.replace(/-/g, ' '));
  // WS27 PR5i (2026-09-14): include CA province abbreviations. Previously the
  // page only matched US_STATE_ABBR[provinceSlug], causing all Canadian
  // province pages to 404 when the DB stores the 2-letter abbr ('NS') but
  // the URL slug uses the full name ('nova-scotia'). This was the #1 cause
  // of the 101 404 URLs in sitemap-ice-marketplace.xml.
  const stateAbbr = isUSorCA
    ? (US_STATE_ABBR[provinceSlug.toLowerCase()] || CA_PROVINCE_ABBR[CA_PROVINCES[provinceSlug]] || '')
    : '';

  // Lookup city in the rinks table to gate the page. If we have no rinks
  // for this city, the page noindexes itself (404-ish) so Google
  // doesn't index empty marketplace pages.
  // WS27 PR5i (2026-09-14): use name variants for the city filter so we
  // match cities with periods, accents, postal codes in the original name.
  const cityOrFilter = citySlugToVariants(citySlug)
    .map((v) => `city.ilike.*${v}*`)
    .join(',');
  let rinksQuery = supabaseAdmin
    .from('rinks')
    .select('id, name, slug')
    .eq('is_active', true)
    .ilike('country', countryName)
    .or(cityOrFilter);
  if (isUSorCA && provinceName) {
    // rinks table may have full state name OR abbr; we look up the abbr from US_STATE_ABBR
    rinksQuery = rinksQuery.or(`province_state.eq.${provinceName},province_state.eq.${stateAbbr}`);
  }
  const { data: cityRinks } = await rinksQuery.limit(50);

  if (!cityRinks || cityRinks.length === 0) {
    notFound();
  }

  const location = provinceName ? `${cityName}, ${provinceName}` : `${cityName}, ${countryName}`;

  // Now query ice listings for the city — same filter logic
  // Note: filter on the JOINED rink.* fields here silently drops the rink
  // (PostgREST returns the row with rink=null) — we filter in app code instead.
  const { data: listingsRaw } = await supabaseAdmin
    .from('ice_listings')
    .select(`
      id, rink_id, title, description, requested_price_cents, currency,
      start_time, end_time, timezone, age_group, skill_level, slot_type, visibility, status,
      rink:rinks(id, name, slug, city, province_state, country)
    `)
    .eq('visibility', 'public')
    .eq('status', 'available')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(100);

  // Supabase returns rink as array; flatten + apply country/city/province filters in app code
  const listings = (listingsRaw || [])
    .map((l: any) => ({
      ...l,
      rink: Array.isArray(l.rink) ? l.rink[0] ?? null : l.rink ?? null,
    }))
    .filter((l: any) => {
      if (!l.rink) return false;
      if (countryName && l.rink.country && l.rink.country.toLowerCase() !== countryName.toLowerCase()) return false;
      if (l.rink.city && l.rink.city.toLowerCase() !== cityName.toLowerCase()) return false;
      if (isUSorCA && provinceName) {
        if (l.rink.province_state !== provinceName && l.rink.province_state !== stateAbbr) return false;
      }
      return true;
    });

  return (
    <CityMarketplaceClient
      countrySlug={countrySlug}
      countryName={countryName}
      provinceSlug={provinceSlug}
      provinceName={provinceName}
      citySlug={citySlug}
      cityName={cityName}
      location={location}
      cityRinkCount={cityRinks.length}
      listings={listings}
    />
  );
}
