import type { Metadata } from 'next';
import DirectoryLandingClient from './DirectoryLandingClient';

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
  openGraph: {
    title: 'Hockey Directory',
    description:
      'Find hockey teams, players, leagues, rinks, and more from every corner of the globe.',
    url: 'https://rinkstop.com/directory',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Directory',
    description:
      'Find hockey teams, players, leagues, rinks, and more from every corner of the globe.',
  },
};

// Always render fresh — directory data changes too often to cache statically.
export const dynamic = 'force-dynamic';

export default function DirectoryPage() {
  return <DirectoryLandingClient />;
}
