import type { Metadata } from 'next';
import CountryPageClient from './CountryPageClient';

interface LeagueEntry { id: string; name: string }
interface CityEntry {
  city: string;
  name: string;
  description: string;
  team_count: number;
  rink_count: number;
  program_count: number;
}

interface CountryData {
  country: string;
  content: {
    name: string;
    flag: string;
    description: string;
    cities: Record<string, { name: string; description: string }>;
  } | null;
  cities: CityEntry[];
}

export const revalidate = 3600;
export const dynamicParams = true;

async function fetchCountryData(country: string): Promise<CountryData | null> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const res = await fetch(`${base}/api/locations/${encodeURIComponent(country)}`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return (json?.data as CountryData) || null;
  } catch (err) {
    console.error('Country initial fetch failed:', err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country } = await params;
  const decoded = decodeURIComponent(country);
  // Lightly pre-fetch to enrich the metadata
  const data = await fetchCountryData(decoded);
  const name = data?.content?.name ?? decoded;
  const description =
    data?.content?.description ??
    `Hockey teams, rinks, and youth programs in ${name}. Browse cities and venues across ${name}.`;
  return {
    title: `Hockey in ${name}`,
    description,
    alternates: {
      canonical: `https://rinkstop.com/directory/locations/${country}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `Hockey in ${name}`,
      description,
      url: `https://rinkstop.com/directory/locations/${country}`,
      siteName: 'RinkStop',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Hockey in ${name}`,
      description,
    },
  };
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;
  const decoded = decodeURIComponent(country);
  const initialData = await fetchCountryData(decoded);
  return <CountryPageClient country={decoded} initialData={initialData} />;
}
