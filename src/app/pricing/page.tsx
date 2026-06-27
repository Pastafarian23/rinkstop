import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import PricingContent from './PricingContent';
import { trackPageView, trackEvent } from '@/lib/analytics';
import { supabaseAdmin } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Pricing — RinkStop',
  description:
    'RinkStop pricing — Free, Roster, Roster+, Pro, Business tiers, and Enterprise plans for the global hockey directory. Founding Member badge available for the first 500 paid members.',
  alternates: { canonical: 'https://rinkstop.com/pricing' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Pricing — RinkStop',
    description:
      'RinkStop pricing — Free, Roster, Roster+, Pro, Business tiers, and Enterprise plans for the global hockey directory. Founding Member badge available for the first 500 paid members.',
    url: 'https://rinkstop.com/pricing',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — RinkStop',
    description:
      'RinkStop pricing — Free, Roster, Roster+, Pro, Business tiers, and Enterprise plans for the global hockey directory. Founding Member badge available for the first 500 paid members.',
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
  const utmTier = params.tier || null;
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
