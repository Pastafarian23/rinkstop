// /ice-marketplace/[country]/[city]
//
// City-scoped ice marketplace hub for non-US/CA countries (Sweden,
// Finland, etc.). US/CA cities use the [country]/[province]/[city]
// route. This route catches the "no province" form: /ice-marketplace/sweden/stockholm.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import CityMarketplaceClient from '../../_components/CityMarketplaceClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ country: string; city: string }>;
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
  const { country: countrySlug, city: citySlug } = await params;
  const countryName = COUNTRY_NAMES[countrySlug] || titleCase(countrySlug.replace(/-/g, ' '));
  const cityName = titleCase(citySlug.replace(/-/g, ' '));
  const location = `${cityName}, ${countryName}`;

  return {
    title: `Open Ice Time in ${location} | RinkStop`,
    description: `Find open ice time and hockey practice slots for sale or rent in ${location}. Browse practice ice, tournament slots, and clinic ice from local rinks and clubs.`,
    alternates: { canonical: `https://rinkstop.com/ice-marketplace/${countrySlug}/${citySlug}` },
    robots: { index: true, follow: true },
  };
}

export default async function CountryCityIceMarketplacePage({ params }: PageProps) {
  const { country: countrySlug, city: citySlug } = await params;
  const countryName = COUNTRY_NAMES[countrySlug] || titleCase(countrySlug.replace(/-/g, ' '));
  const cityName = titleCase(citySlug.replace(/-/g, ' '));

  // If someone hits /ice-marketplace/united-states/new-york/... they
  // should get the [province] route, not this one. The catch-all
  // here is for countries without provinces.
  if (countrySlug === 'united-states' || countrySlug === 'canada') {
    notFound();
  }

  const { data: cityRinks } = await supabaseAdmin
    .from('rinks')
    .select('id, name, slug')
    .eq('is_active', true)
    .ilike('city', cityName)
    .ilike('country', countryName)
    .limit(50);

  if (!cityRinks || cityRinks.length === 0) {
    notFound();
  }

  const location = `${cityName}, ${countryName}`;

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
    .ilike('rink.city', cityName)
    .ilike('rink.country', countryName)
    .order('start_time', { ascending: true })
    .limit(100);

  const listings = (listingsRaw || []).map((l: any) => ({
    ...l,
    rink: Array.isArray(l.rink) ? l.rink[0] ?? null : l.rink ?? null,
  }));

  return (
    <CityMarketplaceClient
      countrySlug={countrySlug}
      countryName={countryName}
      provinceSlug={null}
      provinceName={null}
      citySlug={citySlug}
      cityName={cityName}
      location={location}
      cityRinkCount={cityRinks.length}
      listings={listings}
    />
  );
}
