// src/app/tools/hockey-goalie-gear-sizer/page.tsx
//
// Hockey Goalie Gear Sizer. Multi-piece output:
//   - Leg pads (ATK = ankle-to-knee)
//   - Blocker (hand length)
//   - Catch glove (hand length)
//   - Chest protector (height + age + weight)
//   - Goalie stick (paddle length + size category)
//
// Mirrors /tools/hockey-glove-size-calculator architecture: server page
// awaits auth + trackPageView, hands off to a client component with the
// form state.
//
// Industry data verified 2026-06-30 against:
//   - bauer.com/pages/size-guide-goalie-pads (ATK table)
//   - purehockey.com/c/how-to-fit-a-goalie-blocker (hand-length chart)
//   - goaliemonkey.com/bauer-goalie-chest-protector-prodigy-youth-24
//     (Bauer chest protector 2024 sizing)
//   - goaliecoaches.com/goalie-stick-sizing-guide (stick paddle table)
//   - truenorthgoaltending.com (cross-verified glove/blocker chart)
//   - goaliemonkey.com/learn/goalie-leg-pad-sizing-chart (cross-verified ATK)

import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import GoalieGearSizerClient from './GoalieGearSizerClient';
import { trackPageView } from '@/lib/analytics';
import { withDefaultOg } from '@/lib/metadata-defaults';

export const metadata: Metadata = {
  title: 'Hockey Goalie Gear Sizer (2026) — Pads, Blocker, Glove, Chest, Stick',
  description:
    'Free hockey goalie gear calculator — enter height, weight, age, and optional ATK / hand length to size pads, blocker, catch glove, chest protector, and stick. Bauer / CCM verified 2026.',
  alternates: { canonical: 'https://rinkstop.com/tools/hockey-goalie-gear-sizer' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Hockey Goalie Gear Sizer (2026) — Pads, Blocker, Glove, Chest, Stick',
    description:
      'Free hockey goalie gear calculator. Pads, blocker, catch glove, chest protector, and stick — by height, weight, age, ATK, and hand length.',
    url: 'https://rinkstop.com/tools/hockey-goalie-gear-sizer',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Goalie Gear Sizer (2026) — Pads, Blocker, Glove, Chest, Stick',
    description: 'Free hockey goalie gear calculator — pads, blocker, glove, chest, stick.',
  },
};

export const dynamic = 'force-dynamic';

export default async function HockeyGoalieGearSizerPage() {
  const { userId } = await auth();
  await trackPageView({
    name: 'tool_viewed',
    userId,
    pathname: '/tools/hockey-goalie-gear-sizer',
    props: { tool: 'hockey_goalie_gear_sizer' },
  });
  return <GoalieGearSizerClient />;
}