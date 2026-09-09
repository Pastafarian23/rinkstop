// /ice-marketplace/[country]
//
// Country-level ice marketplace hub. Catches searches like
// "open ice in Sweden" or "ice rentals in Canada". Lists every
// city within the country that has at least one active rink,
// and the listings are scoped to the country.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import CountryMarketplaceClient from '../_components/CountryMarketplaceClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ country: string }>;
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

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country: countrySlug } = await params;
  const countryName = COUNTRY_NAMES[countrySlug] || titleCase(countrySlug.replace(/-/g, ' '));

  return {
    title: `Open Ice Time in ${countryName} | RinkStop`,
    description: `Find open ice time and hockey practice slots for sale or rent across ${countryName}. Browse practice ice, tournament slots, and clinic ice from local rinks and clubs.`,
    alternates: { canonical: `https://rinkstop.com/ice-marketplace/${countrySlug}` },
    robots: { index: true, follow: true },
  };
}

export default async function CountryMarketplacePage({ params }: PageProps) {
  const { country: countrySlug } = await params;
  const countryName = COUNTRY_NAMES[countrySlug] || titleCase(countrySlug.replace(/-/g, ' '));

  // Confirm country has at least one active rink — otherwise 404
  const { count: countryRinkCount } = await supabaseAdmin
    .from('rinks')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .ilike('country', countryName);

  if (!countryRinkCount || countryRinkCount === 0) {
    notFound();
  }

  // Fetch listings for the country
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
    .order('start_time', { ascending: true })
    .limit(200);

  const listings = (listingsRaw || []).map((l: any) => ({
    ...l,
    rink: Array.isArray(l.rink) ? l.rink[0] ?? null : l.rink ?? null,
  }));

  // City count
  const { data: cityData } = await supabaseAdmin
    .from('rinks')
    .select('city')
    .eq('is_active', true)
    .ilike('country', countryName)
    .limit(2000);
  const citySet = new Set<string>();
  (cityData || []).forEach((r: any) => {
    if (r.city) citySet.add(r.city);
  });

  return (
    <CountryMarketplaceClient
      countrySlug={countrySlug}
      countryName={countryName}
      countryRinkCount={countryRinkCount}
      cityCount={citySet.size}
      listings={listings}
    />
  );
}
