import type { Metadata } from 'next';
import LocationsIndexClient from './LocationsIndexClient';

interface CountryEntry {
  country: string;
  name: string;
  flag: string;
  description: string;
  team_count: number;
  rink_count: number;
  program_count: number;
  leagues: { id: string; name: string }[];
}

export const metadata: Metadata = {
  title: 'Hockey Locations by Country & City',
  description:
    'Browse hockey teams, rinks, and youth programs by country and city worldwide. From NHL arenas to emerging markets in Southeast Asia.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/locations',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Hockey Locations by Country & City',
    description:
      'Browse hockey teams, rinks, and youth programs by country and city worldwide.',
    url: 'https://rinkstop.com/directory/locations',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Locations by Country & City',
    description:
      'Browse hockey teams, rinks, and youth programs by country and city worldwide.',
  },
};

export const revalidate = 3600;
export const dynamicParams = true;

async function fetchInitialCountries(): Promise<CountryEntry[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const res = await fetch(`${base}/api/locations/countries`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch (err) {
    console.error('Locations initial fetch failed:', err);
    return [];
  }
}

export default async function LocationsIndexPage() {
  const initialCountries = await fetchInitialCountries();
  return <LocationsIndexClient initialCountries={initialCountries} />;
}
