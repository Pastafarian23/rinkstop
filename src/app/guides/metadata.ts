import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hockey Guides',
  description: 'In-depth hockey guides covering technique, training, equipment buying, and the sport for beginners and experienced players alike. From stick fitting to nutrition to youth hockey pathways.',
  openGraph: {
    title: 'Hockey Guides',
    description: 'Technique, training, equipment, and everything in between.',
    type: 'website',
  },
  alternates: { canonical: 'https://rinkstop.com/guides' },
};

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return children;
}