import type { Metadata } from 'next';
import StaffDirectory from '@/components/StaffDirectory';

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
  openGraph: {
    title: 'Hockey Coaches Directory',
    description:
      'Browse hockey coaches from NHL, AHL, KHL, NCAA, junior, and youth leagues worldwide.',
    url: 'https://rinkstop.com/directory/coaches',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Coaches Directory',
    description:
      'Browse hockey coaches from NHL, AHL, KHL, NCAA, junior, and youth leagues worldwide.',
  },
};

// Always render fresh — directory data changes too often to cache statically.
export const dynamic = 'force-dynamic';

export default function CoachesPage() {
  return <StaffDirectory role="coach" />;
}
