// src/app/tools/junior-eligibility-checker/page.tsx
//
// Junior Hockey Eligibility Checker. Mirrors the architecture of
// /tools/hockey-glove-size-calculator — server page awaits auth +
// trackPageView, hands off to a client component with the form state.
//
// Inputs: birth year, birth month, current season.
// Output: league-by-league eligibility grid (OHL/WHL/QMJHL/USHL/NCDC/
// NAHL/BCHL/AJHL/NCAA) showing ✅ ELIGIBLE / ⚠️ NEXT YEAR / ❌ AGE-OUT.
//
// Industry data verified 2026-06-29 against:
//   - chl.ca (OHL, WHL, QMJHL 2026 draft rules)
//   - ushl.com (USHL Phase I/II age categories)
//   - ncaa.org (Division I age-based eligibility rule 2026)
//   - bchl.ca (BCHL Junior A 16-20)

import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import JuniorEligibilityCheckerClient from './JuniorEligibilityCheckerClient';
import { trackPageView } from '@/lib/analytics';

export const metadata: Metadata = {
  title: 'Junior Hockey Eligibility Checker (2026) — OHL / WHL / QMJHL / USHL / NCAA',
  description:
    'Is your player eligible for junior hockey? Free checker — enter birth year + month, get a league-by-league eligibility grid for OHL, WHL, QMJHL, USHL, NCDC, NAHL, BCHL, AJHL, and NCAA.',
  alternates: { canonical: 'https://rinkstop.com/tools/junior-eligibility-checker' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Junior Hockey Eligibility Checker (2026) — OHL / WHL / QMJHL / USHL / NCAA',
    description:
      'Free junior hockey eligibility checker. League-by-league grid for OHL, WHL, QMJHL, USHL, NCDC, NAHL, BCHL, AJHL, and NCAA.',
    url: 'https://rinkstop.com/tools/junior-eligibility-checker',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Junior Hockey Eligibility Checker (2026) — OHL / WHL / QMJHL / USHL / NCAA',
    description: 'Free junior hockey eligibility checker for OHL / WHL / QMJHL / USHL / NCAA.',
  },
};

export const dynamic = 'force-dynamic';

export default async function JuniorEligibilityCheckerPage() {
  const { userId } = await auth();
  await trackPageView({
    name: 'tool_viewed',
    userId,
    pathname: '/tools/junior-eligibility-checker',
    props: { tool: 'junior_eligibility_checker' },
  });
  return <JuniorEligibilityCheckerClient />;
}