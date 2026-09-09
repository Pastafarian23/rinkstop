// /ice-marketplace/[country]/[province]
//
// Province/state-level ice marketplace hub. Lists every city within
// the province that has at least one active rink, with listings
// scoped to the province.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import ProvinceMarketplaceClient from '../../_components/ProvinceMarketplaceClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ country: string; province: string }>;
}

const COUNTRY_NAMES: Record<string, string> = {
  'united-states': 'United States',
  'canada': 'Canada',
  // For Sweden/Finland/etc. we don't have province hubs — use country hub.
};

const US_STATE_FULL: Record<string, string> = {
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
  'district-of-columbia': 'District of Columbia',
};

const CA_PROVINCE_FULL: Record<string, string> = {
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
  const { country: countrySlug, province: provinceSlug } = await params;
  const countryName = COUNTRY_NAMES[countrySlug] || titleCase(countrySlug.replace(/-/g, ' '));
  const isUSorCA = countrySlug === 'united-states' || countrySlug === 'canada';
  const provinceName = isUSorCA
    ? US_STATE_FULL[provinceSlug] || CA_PROVINCE_FULL[provinceSlug] || titleCase(provinceSlug.replace(/-/g, ' '))
    : null;
  const location = provinceName ? `${provinceName}, ${countryName}` : `${titleCase(provinceSlug.replace(/-/g, ' '))}, ${countryName}`;

  return {
    title: `Open Ice Time in ${location} | RinkStop`,
    description: `Find open ice time and hockey practice slots in ${location}. Browse practice ice, tournament slots, and clinic ice from rinks and clubs.`,
    alternates: { canonical: `https://rinkstop.com/ice-marketplace/${countrySlug}/${provinceSlug}` },
    robots: { index: true, follow: true },
  };
}

export default async function ProvinceMarketplacePage({ params }: PageProps) {
  const { country: countrySlug, province: provinceSlug } = await params;
  const countryName = COUNTRY_NAMES[countrySlug] || titleCase(countrySlug.replace(/-/g, ' '));
  const isUSorCA = countrySlug === 'united-states' || countrySlug === 'canada';
  const provinceName = isUSorCA
    ? US_STATE_FULL[provinceSlug] || CA_PROVINCE_FULL[provinceSlug] || titleCase(provinceSlug.replace(/-/g, ' '))
    : null;

  // For non-US/CA this URL shape doesn't make sense (no province layer)
  if (!isUSorCA) {
    notFound();
  }

  // Confirm province has at least one active rink
  const { count: provinceRinkCount } = await supabaseAdmin
    .from('rinks')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .ilike('country', countryName)
    .or(`province_state.ilike.${provinceName},province_state.ilike.${provinceName.slice(0, 2)}`);

  if (!provinceRinkCount || provinceRinkCount === 0) {
    notFound();
  }

  // Listings for the province
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
    .ilike('rink.country', countryName)
    .or(`rink.province_state.eq.${provinceName},rink.province_state.ilike.${provinceName.slice(0, 2)}`)
    .order('start_time', { ascending: true })
    .limit(200);

  const listings = (listingsRaw || []).map((l: any) => ({
    ...l,
    rink: Array.isArray(l.rink) ? l.rink[0] ?? null : l.rink ?? null,
  }));

  return (
    <ProvinceMarketplaceClient
      countrySlug={countrySlug}
      countryName={countryName}
      provinceSlug={provinceSlug}
      provinceName={provinceName}
      provinceRinkCount={provinceRinkCount}
      listings={listings}
    />
  );
}
