import type { Metadata } from 'next';
import StaffDirectory from '@/components/StaffDirectory';

export const metadata: Metadata = {
  title: 'Hockey Scouts Directory',
  description:
    'Browse hockey scouts from NHL, AHL, KHL, and leagues worldwide.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/scouts',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Hockey Scouts Directory',
    description:
      'Browse hockey scouts from NHL, AHL, KHL, and leagues worldwide.',
    url: 'https://rinkstop.com/directory/scouts',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Scouts Directory',
    description:
      'Browse hockey scouts from NHL, AHL, KHL, and leagues worldwide.',
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const revalidate = 3600;
export const dynamicParams = true;

export default function ScoutsPage() {
  return <StaffDirectory role="scout" />;
}
