// src/app/tools/hockey-glove-size-calculator/page.tsx
//
// Interactive glove-sizing tool. Mirrors /tools/hockey-stick-size-calculator
// architecture: server page awaits auth + trackPageView, hands off to a
// client component that holds the form state.
//
// Two input modes:
//   (A) Height-based: parent enters kid's height (no measurement needed)
//   (B) Measurement-based: parent measures fingertip-to-elbow
//
// Outputs: glove size (inches), recommended age band, fit-check card,
// position nudge for goalies/defensemen, methodology footer.
//
// Industry data: Bauer, Pure Hockey, Game Time Sports, Peranis charts
// (4+ sources agree on the lookup tables).

import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import GloveSizeCalculatorClient from './GloveSizeCalculatorClient';
import { trackPageView } from '@/lib/analytics';

export const metadata: Metadata = {
  title: 'Hockey Glove Size Calculator (2026) — Find the Right Glove by Height or Measurement',
  description:
    'What size hockey glove does your kid need? Free calculator with two modes — height-based OR arm measurement (fingertip to elbow). Industry-standard Bauer / Pure Hockey sizing.',
  alternates: { canonical: 'https://rinkstop.com/tools/hockey-glove-size-calculator' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Hockey Glove Size Calculator (2026) — Find the Right Glove by Height or Measurement',
    description:
      'Free hockey glove sizing tool. Two modes: by height or by arm measurement. Industry-standard Bauer / Pure Hockey sizing.',
    url: 'https://rinkstop.com/tools/hockey-glove-size-calculator',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Glove Size Calculator (2026) — Find the Right Glove by Height or Measurement',
    description:
      'Free hockey glove sizing tool. Two modes: by height or by arm measurement.',
  },
};

export const dynamic = 'force-dynamic';

export default async function HockeyGloveSizeCalculatorPage() {
  const { userId } = await auth();
  await trackPageView({
    name: 'tool_viewed',
    userId,
    pathname: '/tools/hockey-glove-size-calculator',
    props: { tool: 'hockey_glove_size_calculator' },
  });
  return <GloveSizeCalculatorClient />;
}
