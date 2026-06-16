import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import PricingContent from './PricingContent';
import { trackPageView, trackEvent } from '@/lib/analytics';
import { supabaseAdmin } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Pricing — RinkStop',
  description:
    'RinkStop pricing — Free, Supporter, Verified, and Pro plans for the global hockey directory. Founding Member badge available for the first 500 paid members.',
  alternates: { canonical: 'https://rinkstop.com/pricing' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Pricing — RinkStop',
    description:
      'RinkStop pricing — Free, Supporter, Verified, and Pro plans for the global hockey directory. Founding Member badge available for the first 500 paid members.',
    url: 'https://rinkstop.com/pricing',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — RinkStop',
    description:
      'RinkStop pricing — Free, Supporter, Verified, and Pro plans for the global hockey directory. Founding Member badge available for the first 500 paid members.',
  },
};

export const dynamic = 'force-dynamic';

export default async function FoundingMemberPage() {
  const { userId } = await auth();
  const pathname = '/pricing';

  // Track pricing page view + sign the user in so we can correlate downstream
  // checkout events to this impression.
  await trackPageView({
    name: 'pricing_viewed',
    userId,
    pathname,
  });

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
    />
  );
}
