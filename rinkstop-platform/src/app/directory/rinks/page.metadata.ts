import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rinks | RinkStop',
  description: 'Find ice rinks and arenas worldwide. View rink capacity, location, contact info, and upcoming events.',
  openGraph: {
    title: 'Rinks | RinkStop — The World\'s Hockey Directory',
    description: 'Find ice rinks and arenas worldwide. View rink capacity, location, and upcoming events.',
    images: [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
  },
};