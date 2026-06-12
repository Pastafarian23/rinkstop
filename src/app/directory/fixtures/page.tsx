import type { Metadata } from 'next';
import FixturesClient from './FixturesClient';

export const metadata: Metadata = {
  title: 'Hockey Fixtures & Schedule',
  description:
    'Upcoming hockey games, schedules, and fixtures from leagues worldwide.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/fixtures',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Hockey Fixtures & Schedule',
    description:
      'Upcoming hockey games, schedules, and fixtures from leagues worldwide.',
    url: 'https://rinkstop.com/directory/fixtures',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Fixtures & Schedule',
    description:
      'Upcoming hockey games, schedules, and fixtures from leagues worldwide.',
  },
};

// Always render fresh — fixtures data is time-sensitive and must not be cached.
export const dynamic = 'force-dynamic';

async function fetchInitialFixtures(): Promise<any[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const res = await fetch(`${base}/api/fixtures`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch (err) {
    console.error('Fixtures initial fetch failed:', err);
    return [];
  }
}

export default async function FixturesPage() {
  const initialFixtures = await fetchInitialFixtures();
  return <FixturesClient initialFixtures={initialFixtures} />;
}
