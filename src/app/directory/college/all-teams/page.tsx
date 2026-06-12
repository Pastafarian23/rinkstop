import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'College Hockey Directory',
  description:
    'NCAA Division 1, Division 3, and ACHA college hockey teams, players, conferences, and game schedules.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/college',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'College Hockey Directory',
    description:
      'NCAA Division 1, Division 3, and ACHA college hockey teams, players, conferences, and game schedules.',
    url: 'https://rinkstop.com/directory/college',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'College Hockey Directory',
    description:
      'NCAA Division 1, Division 3, and ACHA college hockey teams, players, conferences, and game schedules.',
  },
};

export default function AllTeamsRedirect() {
  redirect('/directory/college');
}
