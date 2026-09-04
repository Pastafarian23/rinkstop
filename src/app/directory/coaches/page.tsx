import type { Metadata } from 'next';
import StaffDirectory from '@/components/StaffDirectory';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Hockey Coaches Directory',
  description:
    'Browse hockey coaches from NHL, AHL, KHL, NCAA, junior, and youth leagues worldwide.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/coaches',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: withDefaultOg({
    title: 'Hockey Coaches Directory',
    description:
      'Browse hockey coaches from NHL, AHL, KHL, NCAA, junior, and youth leagues worldwide.',
    url: 'https://rinkstop.com/directory/coaches',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Coaches Directory',
    description:
      'Browse hockey coaches from NHL, AHL, KHL, NCAA, junior, and youth leagues worldwide.',
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const revalidate = 3600;
export const dynamicParams = true;

export default function CoachesPage() {
  return <StaffDirectory role="coach" />;
}
