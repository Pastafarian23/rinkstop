import type { Metadata } from 'next';
import DirectoryLandingClient from './DirectoryLandingClient';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Hockey Directory',
  description:
    'Find hockey teams, players, leagues, rinks, and more from every corner of the globe.',
  alternates: {
    canonical: 'https://rinkstop.com/directory',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: withDefaultOg({
    title: 'Hockey Directory',
    description:
      'Find hockey teams, players, leagues, rinks, and more from every corner of the globe.',
    url: 'https://rinkstop.com/directory',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Directory',
    description:
      'Find hockey teams, players, leagues, rinks, and more from every corner of the globe.',
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const revalidate = 3600;
export const dynamicParams = true;

export default function DirectoryPage() {
  return <DirectoryLandingClient />;
}
