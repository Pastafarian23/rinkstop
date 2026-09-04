import type { Metadata } from 'next';
import HighlightsContent from './HighlightsContent';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Hockey Highlights',
  description:
    'Watch hockey highlights from NHL, AHL, KHL, NCAA, and leagues worldwide.',
  alternates: { canonical: 'https://rinkstop.com/highlights' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Hockey Highlights',
    description: 'Watch hockey highlights from NHL, AHL, KHL, NCAA, and leagues worldwide.',
    url: 'https://rinkstop.com/highlights',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Highlights',
    description: 'Watch hockey highlights from NHL, AHL, KHL, NCAA, and leagues worldwide.',
  },
};

export default function HighlightsPage() {
  return <HighlightsContent />;
}
