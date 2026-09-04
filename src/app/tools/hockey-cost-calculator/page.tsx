import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import HockeyCostCalculatorClient from './HockeyCostCalculatorClient';
import { trackPageView } from '@/lib/analytics';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Youth Hockey Cost Calculator (2026) — Free Estimate by Level & State',
  description:
    'How much does youth hockey really cost per year? Free calculator with real 2026 data — House, Travel (A/AA), AAA. Covers registration, equipment, ice time, tournaments, travel, and hidden costs. Compare costs by state.',
  alternates: { canonical: 'https://rinkstop.com/tools/hockey-cost-calculator' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Youth Hockey Cost Calculator (2026) — Free Estimate by Level & State',
    description:
      'How much does youth hockey really cost? Free calculator with real 2026 data — House, Travel, AAA. By state, by age, by level.',
    url: 'https://rinkstop.com/tools/hockey-cost-calculator',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Youth Hockey Cost Calculator (2026) — Free Estimate by Level & State',
    description:
      'Free calculator with real 2026 data — House, Travel, AAA. By state, by age, by level.',
  },
};

export const dynamic = 'force-dynamic';

export default async function HockeyCostCalculatorPage() {
  const { userId } = await auth();
  await trackPageView({
    name: 'tool_viewed',
    userId,
    pathname: '/tools/hockey-cost-calculator',
    props: { tool: 'hockey_cost_calculator' },
  });
  return <HockeyCostCalculatorClient />;
}
