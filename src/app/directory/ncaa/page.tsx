import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NCAA College Hockey | RinkStop',
  description:
    'NCAA Division 1 college hockey teams, players, conferences, and game schedules. Find your favorite college hockey program.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/college',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'NCAA College Hockey | RinkStop',
    description:
      'NCAA Division 1 college hockey teams, players, conferences, and game schedules. Find your favorite college hockey program.',
    url: 'https://rinkstop.com/directory/college',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NCAA College Hockey | RinkStop',
    description:
      'NCAA Division 1 college hockey teams, players, conferences, and game schedules.',
  },
};

export default function NCAARedirect(): never {
  redirect('/directory/college');
}
