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
  claimed_by_tier?: string | null;
  claimed_by_user_id?: string | null;
}

async function getRinkCount(): Promise<number> {
  try {
    const { count } = await supabase.from('rinks').select('id', { count: 'exact', head: true }).eq('is_active', true);
    return count || 0;
  } catch { return 0; }
}

export async function generateMetadata(): Promise<Metadata> {
  const n = await getRinkCount();
  const desc = `Browse ${n.toLocaleString()} ice rinks from every country. Find public skating, hockey, and curling facilities worldwide.`;
  return {
    title: 'Ice Rinks Directory',
    description: desc,
    alternates: { canonical: 'https://rinkstop.com/directory/rinks' },
    robots: { index: true, follow: true },
    openGraph: {
      title: 'Ice Rinks Directory',
      description: desc,
      url: 'https://rinkstop.com/directory/rinks',
      siteName: 'RinkStop',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Ice Rinks Directory',
      description: desc,
    },
  };
}

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
