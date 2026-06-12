import type { Metadata } from 'next';
import AddListingForm from './AddListingForm';

export const metadata: Metadata = {
  title: 'Add Your Team, League, or Rink',
  description:
    "Submit your hockey team, league, or rink to the world's hockey directory. Free to add.",
  alternates: { canonical: 'https://rinkstop.com/add-listing' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Add Your Team, League, or Rink',
    description:
      "Submit your hockey team, league, or rink to the world's hockey directory. Free to add.",
    url: 'https://rinkstop.com/add-listing',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Add Your Team, League, or Rink',
    description:
      "Submit your hockey team, league, or rink to the world's hockey directory.",
  },
};

export default function AddListingPage() {
  return <AddListingForm />;
}
