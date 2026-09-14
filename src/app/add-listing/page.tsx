import type { Metadata } from 'next';
import AddListingForm from './AddListingForm';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Add Your Team, League, or Rink',
  description:
    "Submit your hockey team, league, or rink to RinkStop, the world's hockey directory. Free to add — pro, junior, college, amateur, and youth tiers all welcome. Reviewed within 24 hours.",
  alternates: { canonical: 'https://rinkstop.com/add-listing' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Add Your Team, League, or Rink',
    description:
      "Submit your hockey team, league, or rink to RinkStop, the world's hockey directory. Free to add — pro, junior, college, amateur, and youth tiers all welcome.",
    url: 'https://rinkstop.com/add-listing',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Add Your Team, League, or Rink',
    description:
      "Submit your hockey team, league, or rink to RinkStop, the world's hockey directory. Free to add.",
  },
};

export default function AddListingPage() {
  return <AddListingForm />;
}
