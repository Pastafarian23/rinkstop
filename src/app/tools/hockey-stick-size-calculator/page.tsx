// src/app/tools/hockey-stick-size-calculator/page.tsx
//
// Interactive stick-sizing tool. Mirrors /tools/hockey-cost-calculator
// architecture: server page awaits auth + trackPageView, hands off to a
// client component that holds the form state.
//
// Inputs: height, weight, position, skill level
// Outputs: stick length (inches), flex rating, recommended curve family,
// junior vs senior flag, "where to buy" CTA.

import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import StickSizeCalculatorClient from './StickSizeCalculatorClient';
import { trackPageView } from '@/lib/analytics';

export const metadata: Metadata = {
  title: 'Hockey Stick Size Calculator (2026) — Length, Flex & Curve by Position',
  description:
    'What size hockey stick do you need? Free calculator with length, flex, and curve recommendations by height, weight, position, and skill level. Industry-standard chin-to-nose rule + weight-based flex.',
  alternates: { canonical: 'https://rinkstop.com/tools/hockey-stick-size-calculator' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Hockey Stick Size Calculator (2026) — Length, Flex & Curve by Position',
    description:
      'Free stick-sizing tool. Length, flex, and curve recommendations by height, weight, position, and skill level.',
    url: 'https://rinkstop.com/tools/hockey-stick-size-calculator',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Stick Size Calculator (2026) — Length, Flex & Curve by Position',
    description:
      'Free stick-sizing tool. Length, flex, and curve recommendations by height, weight, position, and skill level.',
  },
};

export const dynamic = 'force-dynamic';

export default async function HockeyStickSizeCalculatorPage() {
  const { userId } = await auth();
  await trackPageView({
    name: 'tool_viewed',
    userId,
    pathname: '/tools/hockey-stick-size-calculator',
    props: { tool: 'hockey_stick_size_calculator' },
  });
  return <StickSizeCalculatorClient />;
}