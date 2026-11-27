import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { fetchRinkListPage, type RinkListResult } from '@/lib/rinks-query';
import { parsePageParams } from '@/lib/rinks-list';
import RinksIndexClient from './RinksIndexClient';
import { withDefaultOg } from '@/lib/metadata-defaults';
import { getDirectoryCountsCached } from '@/lib/directory-counts';
import { cachedPublicRead, PUBLIC_READ_TAGS } from '@/lib/cached-read';

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
  const counts = await getDirectoryCountsCached();
  const desc = country
    ? `Browse ${n.toLocaleString()} ice rinks and arenas in ${country}. Find public skating, hockey, and curling facilities — with addresses, capacity, and ice size.`
    : `Browse ${counts.rinks.toLocaleString()} ice rinks and arenas across ${counts.countries.toLocaleString()}+ countries and ${counts.cities.toLocaleString()} cities. Find public skating, hockey, and curling facilities worldwide — searchable by city, state, or country.`;
  const title = country
    ? `Ice Rinks in ${country} — ${n.toLocaleString()} Arenas & Facilities`
    : `${counts.rinks.toLocaleString()} Ice Rinks Across ${counts.countries.toLocaleString()} Countries — Find One Near You`;
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

const INITIAL_RINK_PAGE_SIZE = 100;
// Server-side paged read (first page). Further pages load via /api/rinks?offset=…
async function fetchInitialRinks(country?: string | null): Promise<RinkListResult> {
  // 2026-10-23 (perf): this route reads searchParams (dynamic), so the data read is memoized
  // instead of the route revalidate (see src/lib/cached-read.ts). Public directory rows only.
  return cachedPublicRead(
    () => fetchInitialRinksUncached(country),
    [country ?? 'all'],
    300,
    [...PUBLIC_READ_TAGS.directory],
  );
}
async function fetchInitialRinksUncached(country?: string | null): Promise<RinkListResult> {
  try {
    return await fetchRinkListPage({
      country: country ?? null,
      activeOnly: true,
      sort: 'tier',
      page: parsePageParams(String(INITIAL_RINK_PAGE_SIZE), '0'),
    });
  } catch (err) {
    console.error('Rinks initial fetch failed:', err);
    return { count: 0, offset: 0, limit: INITIAL_RINK_PAGE_SIZE, hasMore: false, nextOffset: null, data: [] };
  }
}
export default async function RinksPage({
  searchParams,
}: { searchParams: Promise<{ country?: string }> }) {
  // 2026-10-01 (Arnel data-integrity audit): pull counts for body template literals.
  const counts = await getDirectoryCountsCached();
  const { country } = await searchParams;
  const initial = await fetchInitialRinks(country);
  const initialRinks = initial.data as unknown as Rink[];
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
        numberOfItems: initial.count,
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
      <RinksIndexClient
        initialRinks={initialRinks}
        initialTotal={initial.count}
        initialHasMore={initial.hasMore}
        initialNextOffset={initial.nextOffset}
        country={country ?? null}
      />
      {/* WS16 PR2 — AdSense in-feed ad below the rink list. */}
      <div style={{ maxWidth: '1200px', margin: '1.5rem auto', padding: '0 1rem' }}>
        
      </div>
    </>
  );
}
