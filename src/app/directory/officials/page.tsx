import type { Metadata } from 'next';
import StaffDirectory from '@/components/StaffDirectory';

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
  openGraph: {
    title: 'Hockey Officials Directory',
    description:
      'Browse hockey referees and linesmen from NHL, IIHF, and leagues worldwide.',
    url: 'https://rinkstop.com/directory/officials',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Officials Directory',
    description:
      'Browse hockey referees and linesmen from NHL, IIHF, and leagues worldwide.',
  },
};

// Always render fresh — directory data changes too often to cache statically.
export const dynamic = 'force-dynamic';

export default function OfficialsPage() {
  return <StaffDirectory role="official" />;
}
