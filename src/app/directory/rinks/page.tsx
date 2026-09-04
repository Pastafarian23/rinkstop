import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import RinksIndexClient from './RinksIndexClient';
import { withDefaultOg } from '@/lib/metadata-defaults';

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
    ? `Browse ${n.toLocaleString()} ice rinks and arenas in ${country}. Find public skating, hockey, and curling facilities — with addresses, capacity, and ice size.`
    : `Browse 1,917 ice rinks and arenas across 57 countries and 833 cities. Find public skating, hockey, and curling facilities worldwide — searchable by city, state, or country.`;
  const title = country
    ? `Ice Rinks in ${country} — ${n.toLocaleString()} Arenas & Facilities`
    : '1,917 Ice Rinks Across 57 Countries — Find One Near You';
  return {
    title,
    description: desc,
    alternates: { canonical: country ? `https://rinkstop.com/directory/rinks?country=${encodeURIComponent(country)}` : 'https://rinkstop.com/directory/rinks' },
    robots: { index: true, follow: true },
    openGraph: withDefaultOg({
      title,
      description: desc,
      url: country ? `https://rinkstop.com/directory/rinks?country=${encodeURIComponent(country)}` : 'https://rinkstop.com/directory/rinks',
      siteName: 'RinkStop',
      type: 'website',
    }),
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
    },
  };
}

// ISR-cached for 1 hour (2026-07-22 perf pass).
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
  const top = initialRinks.slice(0, 20);
  const ldJson = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Ice Rinks Directory',
        description: 'Ice rinks and arenas directory — RinkStop',
        url: 'https://rinkstop.com/directory/rinks',
        isPartOf: { '@type': 'WebSite', name: 'RinkStop', url: 'https://rinkstop.com' },
      },
      {
        '@type': 'ItemList',
        name: 'Ice Rinks',
        numberOfItems: 1917,
        itemListElement: top.map((r, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: r.name,
          url: `https://rinkstop.com/directory/rinks/${r.slug || r.id}`,
        })),
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />
      <RinksIndexClient initialRinks={initialRinks} country={country ?? null} />
      {/* WS16 PR2 — AdSense in-feed ad below the rink list. */}
      <div style={{ maxWidth: '1200px', margin: '1.5rem auto', padding: '0 1rem' }}>
        
      </div>
    </>
  );
}
