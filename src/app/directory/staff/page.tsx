import type { Metadata } from 'next';
import StaffDirectory from '@/components/StaffDirectory';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Hockey Staff Directory',
  description:
    'Browse hockey front-office staff, scouts, and executives from NHL, AHL, KHL, and more.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/staff',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: withDefaultOg({
    title: 'Hockey Staff Directory',
    description:
      'Browse hockey front-office staff, scouts, and executives from NHL, AHL, KHL, and more.',
    url: 'https://rinkstop.com/directory/staff',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Staff Directory',
    description:
      'Browse hockey front-office staff, scouts, and executives from NHL, AHL, KHL, and more.',
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const revalidate = 3600;
export const dynamicParams = true;

export default function StaffPage() {
  return <StaffDirectory role="staff" />;
}
