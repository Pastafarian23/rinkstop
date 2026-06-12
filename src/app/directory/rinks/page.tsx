import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import RinksIndexClient from './RinksIndexClient';

interface Rink {
  id: string;
  name: string;
  slug?: string;
  city?: string;
  province_state?: string;
  country?: string;
  capacity?: number;
  ice_size?: string;
  static_map_url?: string | null;
}

async function getRinkCount(country?: string | null): Promise<number> {
  try {
    let q = supabase.from('rinks').select('id', { count: 'exact', head: true }).eq('is_active', true);
    if (country) q = q.eq('country', country);
    const { count } = await q;
    return count || 0;
  } catch { return 0; }
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ country?: string }> }): Promise<Metadata> {
  const { country } = await searchParams;
  const n = await getRinkCount(country);
  const desc = country
    ? `Browse ${n.toLocaleString()} ice rinks and arenas in ${country}. Find public skating, hockey, and curling facilities.`
    : `Browse ${n.toLocaleString()} ice rinks from every country. Find public skating, hockey, and curling facilities worldwide.`;
  const title = country ? `Ice Rinks in ${country}` : 'Ice Rinks Directory';
  return {
    title,
    description: desc,
    alternates: { canonical: country ? `https://rinkstop.com/directory/rinks?country=${encodeURIComponent(country)}` : 'https://rinkstop.com/directory/rinks' },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description: desc,
      url: country ? `https://rinkstop.com/directory/rinks?country=${encodeURIComponent(country)}` : 'https://rinkstop.com/directory/rinks',
      siteName: 'RinkStop',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
    },
  };
}

// Always render fresh — directory data changes too often to cache statically.
export const dynamic = 'force-dynamic';

async function fetchInitialRinks(country?: string | null): Promise<Rink[]> {
  try {
    let q = supabase
      .from('rinks')
      .select('id, name, slug, city, province_state, country, capacity, ice_size, static_map_url')
      .eq('is_active', true)
      .order('name')
      .limit(500);
    if (country) q = q.eq('country', country);
    const { data, error } = await q;
    if (error) {
      console.error('Rinks initial fetch failed:', error);
      return [];
    }
    return (data || []) as Rink[];
  } catch (err) {
    console.error('Rinks initial fetch failed:', err);
    return [];
  }
}

export default async function RinksPage({ searchParams }: { searchParams: Promise<{ country?: string }> }) {
  const { country } = await searchParams;
  const initialRinks = await fetchInitialRinks(country);
  return <RinksIndexClient initialRinks={initialRinks} country={country ?? null} />;
}
