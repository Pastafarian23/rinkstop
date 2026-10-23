import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import PricingContent from './PricingContent';
import SocialProof from '@/components/SocialProof';
import { trackPageView, trackEvent } from '@/lib/analytics';
import { supabaseAdmin } from '@/lib/supabase';
import { cachedPublicRead, PUBLIC_READ_TAGS } from '@/lib/cached-read';
import { withDefaultOg } from '@/lib/metadata-defaults';
import { getDirectoryCountsCached } from '@/lib/directory-counts';

export const metadata: Metadata = {
  // WS27 PR1: opt out of root layout's title template (`%s | RinkStop`) so the
  // rendered <title> is just `Pricing — RinkStop` instead of the prior
  // `Pricing — RinkStop | RinkStop` duplication. Per-page absolute titles also
  // avoid brand-spam flags in SERPs.
  title: { absolute: 'Pricing — RinkStop' },
  description:
    'RinkStop pricing — Free, Hockey Passport, Hockey Passport Plus for individuals; Organization Plus, Organization Pro, Organization Elite, Organization Enterprise for organizations. One Verified Hockey Identity per person.',
  alternates: { canonical: 'https://rinkstop.com/pricing' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Pricing — RinkStop',
    description:
      'RinkStop pricing — Free, Hockey Passport, Hockey Passport Plus for individuals; Organization Plus, Organization Pro, Organization Elite, Organization Enterprise for organizations. One Verified Hockey Identity per person.',
    url: 'https://rinkstop.com/pricing',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — RinkStop',
    description:
      'RinkStop pricing — Free, Hockey Passport, Hockey Passport Plus for individuals; Organization Plus, Organization Pro, Organization Elite, Organization Enterprise for organizations. One Verified Hockey Identity per person.',
  },
};

export const dynamic = 'force-dynamic';

export default async function FoundingMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string; tier?: string }>;
}) {
  const { userId } = await auth();
  const params = await searchParams;
  const cancelled = params.cancelled === '1';

  // Server-side referer-based default tier (Pricing analysis 2026-07-10):
  // When a visitor lands on /pricing from a directory detail page without an
  // explicit ?tier= param, default to the cheapest tier that covers that entity
  // type so they see one card highlighted, not all 8.
  let utmTier = params.tier || null;
  if (!utmTier) {
    const h = await headers();
    const refHeader = h.get('x-rinkstop-referer') || h.get('referer') || '';
    if (/\/directory\/rinks\//.test(refHeader)) utmTier = 'business_listing';
    else if (/\/directory\/teams\//.test(refHeader)) utmTier = 'club_starter';
    else if (/\/directory\/leagues\//.test(refHeader)) utmTier = 'club_starter';
    else if (/\/directory\/players\//.test(refHeader)) utmTier = 'verified_identity';
    else if (/\/claim-your-listing/.test(refHeader)) utmTier = 'business_listing';
  }

  const pathname = '/pricing';

  // Track pricing page view + sign the user in so we can correlate downstream
  // checkout events to this impression.
  await trackPageView({
    name: 'pricing_viewed',
    userId,
    pathname,
    props: { cancelled, utmTier },
  });

  // If they came back from a cancelled Stripe checkout, log the abandonment
  // server-side. Stripe sends users to /pricing?cancelled=1 when they hit
  // the "back" button on the checkout page. This is a true funnel event
  // — they reached the checkout start but did not complete.
  if (cancelled) {
    await trackEvent({
      name: 'checkout_abandoned',
      userId,
      pathname,
    });
  }

  // Pull live counts so the dataset-license card stays accurate.
  const counts = await getDirectoryCountsCached();

  // Count how many of the first 500 founding-member slots are taken so
  // we can show a live "N of 500 claimed" urgency lever on the page.
  let foundingClaimed = 0;
  let userTier: string | null = null;
  try {
    // 2026-10-23 (perf): the page reads `searchParams`, so Next.js treats the
    // route as dynamic and its `revalidate` is silently ignored.
    //
    // Only the PUBLIC part is cached (how many founding members exist). The
    // per-user tier lookup below is deliberately NOT cached — caching it would
    // serve one signed-in user's tier to every other visitor, including
    // signed-out ones. That is the exact failure mode the cached-read safety
    // contract warns about.
    const foundingCount = await cachedPublicRead(
      async () => {
        const { count } = await supabaseAdmin
          .from('profiles')
          .select('user_id', { count: 'exact', head: true })
          .eq('is_founding_member', true);
        return count || 0;
      },
      ['founding-member-count'],
      300,
      [...PUBLIC_READ_TAGS.directory],
    );
    foundingClaimed = foundingCount;
    if (userId) {
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('tier, is_founding_member')
        .eq('user_id', userId)
        .maybeSingle();
      userTier = p?.tier || null;
    }
  } catch {
    // best-effort
  }

  return (
    <>
      <PricingContent
        foundingClaimed={foundingClaimed}
        foundingCap={500}
        currentUserId={userId}
        currentUserTier={userTier}
        cancelled={cancelled}
        rinkCount={counts.rinks}
        teamCount={counts.teams}
        leagueCount={counts.leagues}
        playerCount={counts.players}
      />
      {/* Server component — renders after the client PricingContent. */}
      <SocialProof variant="compact" />
    </>
  );
}
