import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
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

async function getRinkCount(): Promise<number> {
  try {
    const { count } = await supabase.from('rinks').select('id', { count: 'exact', head: true }).eq('is_active', true);
    return count || 0;
  } catch { return 0; }
}

export async function generateMetadata(): Promise<Metadata> {
  const n = await getRinkCount();
  const desc = `Browse ${n.toLocaleString()} ice rinks and arenas on the interactive hockey map. Filter by country, league, and rink type.`;
  return {
    title: 'Hockey Rinks & Arenas Map',
    description: desc,
    alternates: { canonical: 'https://rinkstop.com/directory/map' },
    robots: { index: true, follow: true },
    openGraph: {
      title: 'Hockey Rinks & Arenas Map',
      description: desc,
      url: 'https://rinkstop.com/directory/map',
      siteName: 'RinkStop',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Hockey Rinks & Arenas Map',
      description: desc,
    },
  };
}

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
