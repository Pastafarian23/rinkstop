import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teams Directory | RinkStop',
  description: 'Browse thousands of hockey teams from NHL, AHL, KHL, and leagues worldwide. Find team rosters, logos, arenas, and more.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/teams',
  },
  openGraph: {
    title: 'Teams | RinkStop — The World\'s Hockey Directory',
    description: 'Browse thousands of hockey teams from NHL, AHL, KHL, and leagues worldwide.',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
};