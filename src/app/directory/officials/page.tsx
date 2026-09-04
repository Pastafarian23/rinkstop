import type { Metadata } from 'next';
import StaffDirectory from '@/components/StaffDirectory';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Hockey Officials Directory',
  description:
    'Browse hockey referees and linesmen from NHL, IIHF, and leagues worldwide.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/officials',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: withDefaultOg({
    title: 'Hockey Officials Directory',
    description:
      'Browse hockey referees and linesmen from NHL, IIHF, and leagues worldwide.',
    url: 'https://rinkstop.com/directory/officials',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Officials Directory',
    description:
      'Browse hockey referees and linesmen from NHL, IIHF, and leagues worldwide.',
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const revalidate = 3600;
export const dynamicParams = true;

export default function OfficialsPage() {
  return <StaffDirectory role="official" />;
}
