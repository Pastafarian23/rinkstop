import type { Metadata } from 'next';
import LeaguesIndexClient from './LeaguesIndexClient';

interface League {
  id: string;
  name: string;
  country?: string;
  level?: string;
  website_url?: string;
  claimed_by_tier?: string | null;
  claimed_by_user_id?: string | null;
}

export const metadata: Metadata = {
  title: '240 Hockey Leagues Worldwide — NHL, NCAA, IIHF, Junior & More',
  description:
    'Browse 240 hockey leagues across 57 countries — NHL, AHL, KHL, NCAA, CHL, IIHF, PWHL, and amateur tiers. Find tier, country, level, and contact info for every league in one place.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/leagues',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: '240 Hockey Leagues Worldwide — NHL, NCAA, IIHF, Junior & More',
    description:
      'Browse 240 hockey leagues across 57 countries — NHL, AHL, KHL, NCAA, CHL, IIHF, PWHL, and amateur tiers. Find tier, country, level, and contact info for every league in one place.',
    url: 'https://rinkstop.com/directory/leagues',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '240 Hockey Leagues Worldwide — NHL, NCAA, IIHF, Junior & More',
    description:
      'Browse 240 hockey leagues across 57 countries — NHL, AHL, KHL, NCAA, CHL, IIHF, PWHL, and amateur tiers. Find tier, country, level, and contact info for every league in one place.',
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const revalidate = 3600;
export const dynamicParams = true;

async function fetchInitialLeagues(): Promise<League[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const res = await fetch(`${base}/api/leagues?sort=tier`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return Array.isArray(json) ? json : (json?.data || []);
  } catch (err) {
    console.error('Leagues initial fetch failed:', err);
    return [];
  }
}

export default async function LeaguesPage() {
  const initialLeagues = await fetchInitialLeagues();
  const top = initialLeagues.slice(0, 20);
  const ldJson = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Hockey Leagues Directory',
        description: 'Hockey leagues directory — RinkStop',
        url: 'https://rinkstop.com/directory/leagues',
        isPartOf: { '@type': 'WebSite', name: 'RinkStop', url: 'https://rinkstop.com' },
      },
      {
        '@type': 'ItemList',
        name: 'Hockey Leagues',
        numberOfItems: 240,
        itemListElement: top.map((l, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: l.name,
          url: `https://rinkstop.com/directory/leagues/${l.id}`,
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
      <LeaguesIndexClient initialLeagues={initialLeagues} />
    </>
  );
}
