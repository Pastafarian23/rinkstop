import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import PricingContent from './PricingContent';
import { trackPageView, trackEvent } from '@/lib/analytics';
import { supabaseAdmin } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Pricing — RinkStop',
  description:
    'RinkStop pricing — Free, Verified Identity, Identity Plus for individuals; Club Starter, Club Pro, Club Elite, League, Federation for organizations; Business Listing, Business Plus for businesses. One Verified Hockey Identity per person.',
  alternates: { canonical: 'https://rinkstop.com/pricing' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Pricing — RinkStop',
    description:
      'RinkStop pricing — Free, Verified Identity, Identity Plus for individuals; Club Starter, Club Pro, Club Elite, League, Federation for organizations; Business Listing, Business Plus for businesses. One Verified Hockey Identity per person.',
    url: 'https://rinkstop.com/pricing',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — RinkStop',
    description:
      'RinkStop pricing — Free, Verified Identity, Identity Plus for individuals; Club Starter, Club Pro, Club Elite, League, Federation for organizations; Business Listing, Business Plus for businesses. One Verified Hockey Identity per person.',
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

  // Count how many of the first 500 founding-member slots are taken so
  // we can show a live "N of 500 claimed" urgency lever on the page.
  let foundingClaimed = 0;
  let userTier: string | null = null;
  try {
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('is_founding_member', true);
    foundingClaimed = count || 0;
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
    <PricingContent
      foundingClaimed={foundingClaimed}
      foundingCap={500}
      currentUserId={userId}
      currentUserTier={userTier}
      cancelled={cancelled}
    />
  );
}
