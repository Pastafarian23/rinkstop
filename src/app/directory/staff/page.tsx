import type { Metadata } from 'next';
import StaffDirectory from '@/components/StaffDirectory';

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
  openGraph: {
    title: 'Hockey Staff Directory',
    description:
      'Browse hockey front-office staff, scouts, and executives from NHL, AHL, KHL, and more.',
    url: 'https://rinkstop.com/directory/staff',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Staff Directory',
    description:
      'Browse hockey front-office staff, scouts, and executives from NHL, AHL, KHL, and more.',
  },
};

// Always render fresh — directory data changes too often to cache statically.
export const dynamic = 'force-dynamic';

export default function StaffPage() {
  return <StaffDirectory role="staff" />;
}
