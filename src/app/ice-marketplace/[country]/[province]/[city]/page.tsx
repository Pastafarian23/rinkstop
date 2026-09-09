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
import CityMarketplaceClient from '../../../_components/CityMarketplaceClient';

export const dynamic = 'force-dynamic';

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

  return {
    title: `Open Ice Time in ${location} | RinkStop`,
    description: `Find open ice time and hockey practice slots for sale or rent in ${location}. Browse practice ice, tournament slots, and clinic ice from local rinks, clubs, and teams.`,
    alternates: { canonical: `https://rinkstop.com/ice-marketplace/${countrySlug}/${provinceSlug}/${citySlug}` },
    robots: { index: true, follow: true },
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

  // Lookup city in the rinks table to gate the page. If we have no rinks
  // for this city, the page noindexes itself (404-ish) so Google
  // doesn't index empty marketplace pages.
  let rinksQuery = supabaseAdmin
    .from('rinks')
    .select('id, name, slug')
    .eq('is_active', true)
    .ilike('city', cityName);
  if (countryName) rinksQuery = rinksQuery.ilike('country', countryName);
  if (isUSorCA && provinceName) {
    // rinks table may have full state name OR abbr; we have the full name
    rinksQuery = rinksQuery.or(`province_state.ilike.${provinceName},province_state.ilike.${provinceName.slice(0, 2)}`);
  }
  const { data: cityRinks } = await rinksQuery.limit(50);

  if (!cityRinks || cityRinks.length === 0) {
    notFound();
  }

  const location = provinceName ? `${cityName}, ${provinceName}` : `${cityName}, ${countryName}`;

  // Now query ice listings for the city — same filter logic
  let listingsQuery = supabaseAdmin
    .from('ice_listings')
    .select(`
      id, rink_id, title, description, requested_price_cents, currency,
      start_time, end_time, timezone, age_group, skill_level, slot_type, visibility, status,
      rink:rinks(id, name, slug, city, province_state, country)
    `)
    .eq('visibility', 'public')
    .eq('status', 'available')
    .gte('start_time', new Date().toISOString())
    .ilike('rink.city', cityName);
  if (countryName) listingsQuery = listingsQuery.ilike('rink.country', countryName);
  if (isUSorCA && provinceName) {
    listingsQuery = listingsQuery.or(`rink.province_state.ilike.${provinceName},rink.province_state.ilike.${provinceName.slice(0, 2)}`);
  }
  const { data: listingsRaw } = await listingsQuery.order('start_time', { ascending: true }).limit(100);

  // Supabase returns rink as array; flatten
  const listings = (listingsRaw || []).map((l: any) => ({
    ...l,
    rink: Array.isArray(l.rink) ? l.rink[0] ?? null : l.rink ?? null,
  }));

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
