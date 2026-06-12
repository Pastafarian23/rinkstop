import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Adult Hockey Guides',
  description: 'Guides for adult hockey newcomers — rules, positions, learn-to-play programs, beer league, and what to expect on the ice.',
  openGraph: {
    title: 'Adult Hockey Guides',
    description: 'For adult newcomers getting into hockey — rules, positions, beer league, and learn-to-play programs.',
    type: 'website',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/adult' },
};

export default function AdultGuidesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
