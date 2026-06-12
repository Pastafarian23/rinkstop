import type { Metadata } from 'next';
import MapClient from './MapClient';

interface MapRink {
  id: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  slug: string;
}

export const metadata: Metadata = {
  title: 'Hockey Rinks & Arenas Map',
  description:
    'Browse 224 ice rinks and arenas on the interactive hockey map. Filter by country, league, and rink type.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/map',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Hockey Rinks & Arenas Map',
    description:
      'Browse 224 ice rinks and arenas on the interactive hockey map. Filter by country, league, and rink type.',
    url: 'https://rinkstop.com/directory/map',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Rinks & Arenas Map',
    description:
      'Browse 224 ice rinks and arenas on the interactive hockey map. Filter by country, league, and rink type.',
  },
};

// Always render fresh — map data and listings change too often to cache statically.
export const dynamic = 'force-dynamic';

async function fetchInitialRinks(): Promise<MapRink[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const res = await fetch(`${base}/api/rinks/map`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch (err) {
    console.error('Map initial fetch failed:', err);
    return [];
  }
}

export default async function MapPage() {
  const initialRinks = await fetchInitialRinks();
  return <MapClient initialRinks={initialRinks} />;
}
