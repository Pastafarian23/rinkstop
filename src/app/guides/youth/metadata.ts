import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Youth Hockey Guides | RinkStop',
  description: 'Guides for parents and young hockey players — equipment, age groups, development models, costs, and what to expect at every level from Learn to Play through Midget.',
  openGraph: {
    title: 'Youth Hockey Guides | RinkStop',
    description: 'Everything a parent or new young player needs to know — equipment, age groups, house vs travel, ADM, and more.',
    type: 'website',
  },
  alternates: { canonical: 'https://rinkstop.com/guides/youth' },
};

export default function YouthGuidesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
