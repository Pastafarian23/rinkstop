import type { Metadata } from 'next';
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
  claimed_by_tier?: string | null;
  claimed_by_user_id?: string | null;
}

export const metadata: Metadata = {
  title: 'Ice Rinks Directory | RinkStop',
  description:
    'Browse 224 ice rinks from every country. Find public skating, hockey, and curling facilities worldwide.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/rinks',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Ice Rinks Directory | RinkStop',
    description:
      'Browse 224 ice rinks from every country. Find public skating, hockey, and curling facilities worldwide.',
    url: 'https://rinkstop.com/directory/rinks',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ice Rinks Directory | RinkStop',
    description:
      'Browse 224 ice rinks from every country. Find public skating, hockey, and curling facilities worldwide.',
  },
};

// Always render fresh — directory data changes too often to cache statically.
export const dynamic = 'force-dynamic';

async function fetchInitialRinks(): Promise<Rink[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const res = await fetch(`${base}/api/rinks?sort=tier`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return Array.isArray(json) ? json : (json?.data || []);
  } catch (err) {
    console.error('Rinks initial fetch failed:', err);
    return [];
  }
}

export default async function RinksPage() {
  const initialRinks = await fetchInitialRinks();
  return <RinksIndexClient initialRinks={initialRinks} />;
}
