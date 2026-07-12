import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import Stripe from 'stripe';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { supabaseAdmin } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';
import { TierName, TIER_TO_TRACK, MAX_CLAIMS_PER_TIER } from '@/lib/pricing';

// Tier-upgrade is a high-intent checkout endpoint, but legitimate users often
// browse 3-5+ tiers before picking one. Old limit (5 per 10 min) blocked users
// after a few comparisons. Bumped to 30 per 10 min so a user exploring all
// tier options in one session isn't blocked; bot abuse is still throttled.
const RATE_LIMIT = { maxRequests: 30, windowMs: 10 * 60 * 1000 };

function subscriptionIsActive(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' as any })
  : null;

/**
 * Tier to track-specific price env var mapping.
 * Each track has its own Stripe price ID (separate products).
 *
 * Federation has no Stripe product (contact sales only).
 * New tiers (verified_identity, identity_plus, club_*, league, business_listing,
 * business_plus) will return 503 "tier_not_configured" until their Stripe
 * products are created and the env var is set in Vercel.
 */
const TIER_TO_PRICE_ENV: Record<TierName, string> = {
  free: '',
  verified_identity: 'STRIPE_PRICE_VERIFIED_IDENTITY',
  identity_plus: 'STRIPE_PRICE_IDENTITY_PLUS',
  club_starter: 'STRIPE_PRICE_CLUB_STARTER',
  club_pro: 'STRIPE_PRICE_CLUB_PRO',
  club_elite: 'STRIPE_PRICE_CLUB_ELITE',
  league: 'STRIPE_PRICE_LEAGUE',
  federation: '', // contact sales - no Stripe product
  business_listing: 'STRIPE_PRICE_BUSINESS_LISTING',
  business_plus: 'STRIPE_PRICE_BUSINESS_PLUS',
};

// Tier rank for downgrade prevention (within each track)
const TIER_RANK: Record<TierName, number> = {
  free: 0,
  verified_identity: 1,
  identity_plus: 2,
  club_starter: 1,
  club_pro: 2,
  club_elite: 3,
  league: 4,
  federation: 5,
  business_listing: 1,
  business_plus: 2,
};

export async function POST(req: NextRequest) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = session.userId
    ? await resolveCanonicalUserId(session.userId, userEmail)
    : null;

  // Guest checkout: anonymous users can now start a Stripe Checkout session.
  // Stripe will collect their email on the hosted page; the webhook (see
  // /api/webhooks/stripe/route.ts) creates the Clerk account + magic link
  // after payment completes.
  const isGuest = !userId;

  const ip = getClientIP(req);
  const result = await checkRateLimit(`tier-upgrade:${ip}`, RATE_LIMIT);
  maybeCleanup();
  if (!result.allowed) {
    const res = NextResponse.json(
      { error: 'rate_limited', retryAfter: result.retryAfter },
      { status: 429 }
    );
    return applyRateLimitHeaders(res, result);
  }

  if (!stripe) {
    const res = NextResponse.json(
      { error: 'stripe_not_configured', message: 'STRIPE_SECRET_KEY not set in environment' },
      { status: 503 }
    );
    return applyRateLimitHeaders(res, result);
  }

  let body: { tier?: string | null; track?: string | null; original_pathname?: string | null };
  try {
    body = await req.json();
  } catch {
    const res = NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    return applyRateLimitHeaders(res, result);
  }

  const requestedTier = typeof body.tier === 'string' ? body.tier : '';
  const requestedTrack = typeof body.track === 'string' ? body.track : null;

  // `original_pathname` lets us round-trip the user back to where they started
  // (e.g. /dashboard/claims?entity=rink&id=...) AFTER the magic-link sign-in
  // lands them in their dashboard. Validated as a relative path to prevent
  // open-redirect attacks.
  const rawOriginalPath =
    typeof body.original_pathname === 'string' ? body.original_pathname : null;
  const originalPathname =
    rawOriginalPath &&
    rawOriginalPath.startsWith('/') &&
    !rawOriginalPath.startsWith('//') &&
    !rawOriginalPath.startsWith('/\\') &&
    !rawOriginalPath.toLowerCase().includes('javascript:')
      ? rawOriginalPath.slice(0, 500)
      : null;

  // Federation has no Stripe product (contact sales only) — short-circuit with 303 redirect.
  // League is also contact-sales but DOES have a Stripe price (lower-friction purchase).
  if (requestedTier === 'federation') {
    const res = NextResponse.json(
      { error: 'federation_contact_sales', url: '/partner?source=tier-upgrade-api' },
      { status: 303 }
    );
    return applyRateLimitHeaders(res, result);
  }

  const tier = requestedTier as TierName;
  if (!tier || !(tier in TIER_TO_PRICE_ENV)) {
    const res = NextResponse.json(
      { error: 'invalid_tier', allowed: Object.keys(TIER_TO_PRICE_ENV).filter(t => t !== 'free' && t !== 'federation') },
      { status: 400 }
    );
    return applyRateLimitHeaders(res, result);
  }

  const priceEnv = TIER_TO_PRICE_ENV[tier];
  const priceId = process.env[priceEnv];
  if (!priceId) {
    const res = NextResponse.json(
      {
        error: 'tier_not_configured',
        message: `${priceEnv} env var not set. Create the Stripe product and set the env var on Vercel.`,
        tier,
        expectedEnvVar: priceEnv,
      },
      { status: 503 }
    );
    return applyRateLimitHeaders(res, result);
  }

  // Server-side funnel event: user reached the Stripe checkout start.
  await trackEvent({
    name: 'checkout_started',
    userId: userId ?? null,
    pathname: '/pricing',
    props: { tier, track: TIER_TO_TRACK[tier], priceEnv, is_guest: isGuest },
  });

  // Profile lookup, downgrade guard, and Stripe Customer creation only run for
  // signed-in users. Guests bypass these — Stripe will collect the email on
  // the hosted page, and the webhook (see /api/webhooks/stripe/route.ts)
  // creates the Clerk account + profile post-payment.
  let customerId: string | undefined;
  if (!isGuest && userId) {
    // Look up profile for downgrade guard
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, email, display_name, tier, stripe_subscription_id, subscription_status')
      .eq('user_id', userId)
      .maybeSingle();

    // GUARD: Reject downgrades. Self-serve cancel/downgrade is intentionally not supported.
    const currentTier = (profile?.tier || 'free') as TierName | 'free';
    const currentUserTrack = TIER_TO_TRACK[currentTier as TierName] ?? 'personal';
    const requestedUserTrack = TIER_TO_TRACK[tier] ?? 'personal';

    // Cross-track upgrades allowed, but downgrades within track blocked
    if (profile?.stripe_subscription_id) {
      const isActive = subscriptionIsActive(profile.subscription_status);
      const currentRank = TIER_RANK[currentTier as TierName] ?? 0;
      const requestedRank = TIER_RANK[tier] ?? 0;

      // Block downgrade if same track and requested rank <= current
      if (isActive && currentUserTrack === requestedUserTrack && requestedRank <= currentRank) {
        const res = NextResponse.json(
          {
            error: 'downgrade_not_self_serve',
            message: 'To change or cancel your paid membership, please contact support@rinkstop.com. We respond within 24 hours.',
          },
          { status: 403 }
        );
        return applyRateLimitHeaders(res, result);
      }
    }

    if (profileErr) {
      console.error('profile lookup err', profileErr);
      const res = NextResponse.json({ error: 'profile_lookup_failed' }, { status: 500 });
      return applyRateLimitHeaders(res, result);
    }

    customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { clerk_user_id: userId },
        ...(profile?.email ? { email: profile.email } : {}),
        ...(profile?.display_name ? { name: profile.display_name } : {}),
      });
      customerId = customer.id;
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', userId);
    }
  }

  const origin = req.headers.get('origin') || `https://${req.headers.get('host')}`;

  // Stripe Checkout Session parameters.
  //   - Signed-in: pass `customer` (existing or new); no `customer_email`.
  //   - Guest: omit `customer` (Stripe creates one); metadata carries is_guest=true
  //     so the webhook knows to create the Clerk account post-payment.
  const sessionMetadata: Record<string, string> = {
    tier,
    track: TIER_TO_TRACK[tier],
  };
  if (userId) sessionMetadata.clerk_user_id = userId;
  if (isGuest) sessionMetadata.is_guest = 'true';
  if (originalPathname) sessionMetadata.original_pathname = originalPathname;

  const subscriptionMetadata: Record<string, string> = {
    tier,
    track: TIER_TO_TRACK[tier],
  };
  if (userId) subscriptionMetadata.clerk_user_id = userId;
  if (isGuest) subscriptionMetadata.is_guest = 'true';

  const checkoutSessionParams: any = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/welcome?tier=${tier}&session_id={CHECKOUT_SESSION_ID}${originalPathname ? `&next=${encodeURIComponent(originalPathname)}` : ''}`,
    cancel_url: `${origin}/pricing?cancelled=1`,
    metadata: sessionMetadata,
    subscription_data: { metadata: subscriptionMetadata },
    allow_promotion_codes: true,
  };
  if (customerId) checkoutSessionParams.customer = customerId;

  const checkoutSession = await stripe.checkout.sessions.create(checkoutSessionParams);

  console.log(`[conversion] checkout_started user_id=${userId ?? 'guest'} tier=${tier} track=${TIER_TO_TRACK[tier]} customer_id=${customerId ?? 'stripe-created'} session_id=${checkoutSession.id}`);

  const res = NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id, tier, track: TIER_TO_TRACK[tier] });
  return applyRateLimitHeaders(res, result);
}