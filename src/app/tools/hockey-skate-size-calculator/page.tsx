// src/app/tools/hockey-skate-size-calculator/page.tsx
//
// Interactive skate-sizing tool. Mirrors /tools/hockey-glove-size-calculator
// architecture: server page awaits auth + trackPageView, hands off to a
// client component that holds the form state.
//
// Inputs: US shoe size (women/men/kid radio) + age (for category gate).
// Outputs: skate size, age category (youth/junior/intermediate/senior),
// width recommendation (D vs EE), fit-check card, methodology footer.
//
// Industry data verified against Bauer / CCM sizing charts via Pure Hockey
// and per the day4-shipping-prep.md spec.

import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import SkateSizeCalculatorClient from './SkateSizeCalculatorClient';
import { trackPageView } from '@/lib/analytics';

export const metadata: Metadata = {
  title: 'Hockey Skate Size Calculator (2026) — US Shoe Size → Bauer / CCM | RinkStop',
  description:
    'What size hockey skate does your kid need? Free calculator — enter US shoe size (women, men, kid), get skate size, age category (youth/junior/intermediate/senior), and width recommendation.',
  alternates: { canonical: 'https://rinkstop.com/tools/hockey-skate-size-calculator' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Hockey Skate Size Calculator (2026) — US Shoe Size → Bauer / CCM',
    description:
      'Free skate-sizing tool. US shoe size → skate size, age category, and width (D vs EE). Industry-standard Bauer / CCM sizing.',
    url: 'https://rinkstop.com/tools/hockey-skate-size-calculator',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Skate Size Calculator (2026) — US Shoe Size → Bauer / CCM',
    description: 'Free skate-sizing tool. US shoe size → skate size and width recommendation.',
  },
};

export const dynamic = 'force-dynamic';

export default async function HockeySkateSizeCalculatorPage() {
  const { userId } = await auth();
  await trackPageView({
    name: 'tool_viewed',
    userId,
    pathname: '/tools/hockey-skate-size-calculator',
    props: { tool: 'hockey_skate_size_calculator' },
  });
  return <SkateSizeCalculatorClient />;
}