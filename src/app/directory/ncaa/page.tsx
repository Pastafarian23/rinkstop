import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  // 2026-09-03 Gap 1: rewrote title with year + keyword + value props.
  // Old title was bare ("NCAA College Hockey", 18 chars).
  title: 'NCAA College Hockey 2026-27 — D1 Teams',
  description:
    'NCAA Division 1 college hockey 2026-27: men\'s and women\'s teams, conferences (Big Ten, NCHC, ECAC, Hockey East), scores, schedules, and rosters.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/college',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'NCAA College Hockey 2026-27',
    description:
      'NCAA Division 1 college hockey 2026-27: men\'s and women\'s teams, conferences, scores, schedules, and rosters.',
    url: 'https://rinkstop.com/directory/college',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NCAA College Hockey 2026-27',
    description:
      'NCAA Division 1 college hockey 2026-27: men\'s and women\'s teams, conferences, scores, and schedules.',
  },
};

export default function NCAARedirect(): never {
  redirect('/directory/college');
}
