import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import Stripe from 'stripe';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { supabaseAdmin } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';
import { TierName, TIER_TO_TRACK, canonicalTier } from '@/lib/pricing';
import {
  FOUNDING_PROMO_CODE,
  FOUNDING_PROMO_PROMOTION_CODE_ID,
  isFoundingPromoEligibleTier,
} from '@/lib/founding-promo';
import { tierRank } from '@/lib/tier';
import { isIdentityVerified } from '@/lib/identity-verified';
import { emitIdentityVerifyRecommended } from '@/lib/notifications/emit';

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
 * Organization Enterprise has no Stripe product (contact sales only).
 * Tiers without a configured env var return 503 "tier_not_configured" until
 * the Stripe product is created and the env var is set in Vercel.
 */
const TIER_TO_PRICE_ENV: Record<TierName, string> = {
  free: '',
  verified_identity: 'STRIPE_PRICE_VERIFIED_IDENTITY',
  identity_plus: 'STRIPE_PRICE_IDENTITY_PLUS',
  org_free: '',
  org_plus: 'STRIPE_PRICE_ORG_PLUS',
  org_pro: 'STRIPE_PRICE_ORG_PRO',
  org_elite: 'STRIPE_PRICE_ORG_ELITE',
  org_enterprise: '', // contact sales - no Stripe product
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

  let body: { tier?: string | null; track?: string | null; original_pathname?: string | null; entity?: string | null; entity_id?: string | null; entity_name?: string | null };
  try {
    body = await req.json();
  } catch {
    const res = NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    return applyRateLimitHeaders(res, result);
  }

  const requestedTier = typeof body.tier === 'string' ? body.tier : '';
  const requestedTrack = typeof body.track === 'string' ? body.track : null;

  // WS14 PR1 — fire-and-forget identity-verify recommendation when a signed-in
  // unverified user attempts to upgrade. Best-effort, never blocks the request.
  // Gated on (a) signed in, (b) target tier is identity-tracked (identity_plus
  // + club_* + league), (c) user is not already verified. No-op for guest checkouts
  // (Stripe handles identity docs separately for those) and for verified users.
  if (userId && !isGuest) {
    const TRACKS_REQUIRING_IDENTITY = new Set([
      'identity_plus',
      'org_plus', 'org_pro', 'org_elite',
    ]);
    if (TRACKS_REQUIRING_IDENTITY.has(requestedTier)) {
      void (async () => {
        try {
          const verified = await isIdentityVerified(userId);
          if (!verified) {
            await emitIdentityVerifyRecommended(
              userId,
              `tier_upgrade:${requestedTier}`,
              requestedTier.replace(/_/g, ' '),
            );
          }
        } catch (err) {
          console.error('[tier/upgrade] emit identity-verify recommended failed:', err);
        }
      })();
    }
  }

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

  // Resume context: when the user clicks "Upgrade to claim" on a listing page,
  // the success_url should send them back to the claim form with their saved
  // draft, so they don't have to re-pick the listing. Validated strictly:
  //   - entity must be a known claim type
  //   - entity_id must be a non-empty string
  //   - entity_name is optional (cosmetic, used in the URL for analytics)
  const requestedEntity = typeof body.entity === 'string' ? body.entity : null;
  const requestedEntityId = typeof body.entity_id === 'string' && body.entity_id.trim() ? body.entity_id.trim() : null;
  const requestedEntityName = typeof body.entity_name === 'string' ? body.entity_name.slice(0, 200) : null;
  const resumeToClaims =
    requestedEntity &&
    ['rink', 'team', 'player'].includes(requestedEntity) &&
    requestedEntityId
      ? {
          entity: requestedEntity,
          entityId: requestedEntityId,
          entityName: requestedEntityName,
        }
      : null;

  // Organization Enterprise has no Stripe product (contact sales only) —
  // short-circuit with 303 redirect.
  if (requestedTier === 'org_enterprise' || requestedTier === 'federation') {
    const res = NextResponse.json(
      { error: 'enterprise_contact_sales', url: '/partner?source=tier-upgrade-api' },
      { status: 303 }
    );
    return applyRateLimitHeaders(res, result);
  }

  // Accept legacy tier names from older links/UI (canonicalize before use).
  const tier = canonicalTier(requestedTier);
  if (!tier || !(tier in TIER_TO_PRICE_ENV)) {
    const res = NextResponse.json(
      { error: 'invalid_tier', allowed: Object.keys(TIER_TO_PRICE_ENV).filter(t => t !== 'free' && t !== 'org_enterprise') },
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
      .select('stripe_customer_id, email, display_name, tier, org_tier, stripe_subscription_id, stripe_org_subscription_id, subscription_status')
      .eq('user_id', userId)
      .maybeSingle();

    // GUARD: Reject downgrades. Self-serve cancel/downgrade is intentionally not supported.
    //
    // The requested tier is compared against the column that owns its track:
    //   personal tier  -> profiles.tier
    //   org tier       -> profiles.org_tier
    // A personal subscription and an org subscription are independent, so an
    // org downgrade must not be judged against the personal tier (and vice
    // versa) — otherwise buying org_pro would lock the personal tier.
    const currentTier = (profile?.tier || 'free') as TierName;
    const currentOrgTier = (profile?.org_tier || 'org_free') as TierName;
    const requestedUserTrack = TIER_TO_TRACK[tier] ?? 'personal';

    // The downgrade guard is per track: it only applies when the user
    // already has an ACTIVE subscription on the SAME track as the requested
    // tier. A personal Passport never blocks an org purchase, and an org
    // subscription never blocks a personal Passport purchase.
    const existingSubscriptionId =
      requestedUserTrack === 'organization'
        ? (profile as any)?.stripe_org_subscription_id
        : profile?.stripe_subscription_id;

    if (existingSubscriptionId) {
      const isActive = subscriptionIsActive(profile.subscription_status);
      const currentRank =
        requestedUserTrack === 'organization'
          ? tierRank(currentOrgTier)
          : tierRank(currentTier);
      const requestedRank = tierRank(tier);

      // Block downgrade if same track and requested rank <= current
      if (isActive && requestedRank <= currentRank) {
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

  // ── FOUNDING MEMBER PROMOTION ──────────────────────────────────────
  // 50% off the first annual payment, first 50 new customers only.
  //
  // Stripe enforces the hard parts:
  //   - the coupon is `duration: 'once'`, so it applies to the FIRST invoice
  //     only and the renewal is charged at full price with no extra code;
  //   - the promotion code has `restrictions.first_time_transaction = true`,
  //     so Stripe refuses to apply it to a customer that has already paid
  //     us — that is the NEW CUSTOMERS ONLY rule, enforced server-side by
  //     Stripe rather than by a heuristic on our side.
  //
  // We apply the code automatically so the customer does not have to know it
  // exists or type it. Stripe treats `discounts` and `allow_promotion_codes`
  // as mutually exclusive, so when the promotion applies we send `discounts`
  // (code pre-applied, still visible and removable on the hosted page) and
  // when it does not we send `allow_promotion_codes` so the customer can
  // still enter a code themselves.
  //
  // Gating here:
  //   - only the eligible PAID tiers (free tiers cost nothing; enterprise is
  //     contact-sales with no Stripe price);
  //   - only when the customer is new — for signed-in users we check that
  //     they have no existing Stripe customer with a completed transaction.
  let foundingPromoApplied = false;
  const promoEligibleTier = isFoundingPromoEligibleTier(tier);

  // New-customer check for SIGNED-IN users. An existing Stripe customer who
  // has already completed a transaction is not a new customer and must not
  // receive the founding discount. Guests have no Stripe customer yet —
  // Stripe creates one during checkout and applies its own
  // `first_time_transaction` restriction, so we do not pre-check them.
  let isNewCustomer = isGuest;
  if (promoEligibleTier && customerId) {
    try {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 1,
      });
      const charges = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 1,
      });
      isNewCustomer = subs.data.length === 0 && charges.data.length === 0;
    } catch (err) {
      // If we cannot determine prior activity, do NOT grant the promo —
      // a wrong discount is a refund, whereas a missing discount is a
      // support ticket we can honour manually.
      console.error('[tier/upgrade] new-customer check failed:', err);
      isNewCustomer = false;
    }
  }

  if (promoEligibleTier && isNewCustomer) {
    foundingPromoApplied = true;
  }

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
  if (foundingPromoApplied) sessionMetadata.founding_promo = FOUNDING_PROMO_CODE;

  const subscriptionMetadata: Record<string, string> = {
    tier,
    track: TIER_TO_TRACK[tier],
  };
  if (userId) subscriptionMetadata.clerk_user_id = userId;
  if (isGuest) subscriptionMetadata.is_guest = 'true';
  if (foundingPromoApplied) subscriptionMetadata.founding_promo = FOUNDING_PROMO_CODE;

  const checkoutSessionParams: any = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    // Default success: /dashboard/welcome (shows next steps + badge).
    // Resume flow: when the user clicked "Upgrade to claim" on a listing,
    // we send them straight back to /dashboard/claims?resume=1 so the form
    // auto-submits their saved draft. They never have to re-pick the listing.
    success_url: resumeToClaims
      ? `${origin}/dashboard/claims?entity=${resumeToClaims.entity}&id=${encodeURIComponent(resumeToClaims.entityId)}${resumeToClaims.entityName ? `&name=${encodeURIComponent(resumeToClaims.entityName)}` : ''}&resume=1&session_id={CHECKOUT_SESSION_ID}`
      : `${origin}/dashboard/welcome?tier=${tier}&session_id={CHECKOUT_SESSION_ID}${originalPathname ? `&next=${encodeURIComponent(originalPathname)}` : ''}`,
    cancel_url: `${origin}/pricing?cancelled=1${resumeToClaims ? `&entity=${resumeToClaims.entity}&id=${encodeURIComponent(resumeToClaims.entityId)}` : ''}`,
    metadata: sessionMetadata,
    subscription_data: { metadata: subscriptionMetadata },
  };

  // Auto-apply the Founding Member discount for eligible new customers.
  //
  // Stripe: "You may only specify one of these parameters:
  // allow_promotion_codes, discounts." So the two are MUTUALLY EXCLUSIVE.
  //
  //   - discount applied  -> `discounts` (the code is pre-applied; the
  //     customer sees the discounted total on the hosted page)
  //   - no discount       -> `allow_promotion_codes: true`, so the customer
  //     can still type a code themselves
  //
  // We set `discounts` when the promotion applies. The code remains
  // pre-applied AND visible/editable on the Stripe-hosted page, so a
  // customer who somehow already transacted sees Stripe's own rejection
  // rather than a silently wrong price. Stripe re-validates
  // `first_time_transaction` and the 50-redemption cap at completion, so a
  // race on the last redemption degrades to "no discount" rather than an
  // over-discount.
  if (foundingPromoApplied) {
    const promoId = process.env.STRIPE_PROMO_CODE_FOUNDING50 || FOUNDING_PROMO_PROMOTION_CODE_ID;
    if (promoId) {
      checkoutSessionParams.discounts = [{ promotion_code: promoId }];
    } else {
      foundingPromoApplied = false;
    }
  }

  if (!checkoutSessionParams.discounts) {
    checkoutSessionParams.allow_promotion_codes = true;
  }
  if (customerId) checkoutSessionParams.customer = customerId;

  const checkoutSession = await stripe.checkout.sessions.create(checkoutSessionParams);

  console.log(`[conversion] checkout_started user_id=${userId ?? 'guest'} tier=${tier} track=${TIER_TO_TRACK[tier]} customer_id=${customerId ?? 'stripe-created'} session_id=${checkoutSession.id} founding_promo=${foundingPromoApplied ? 'applied' : 'no'}`);

  const res = NextResponse.json({
    url: checkoutSession.url,
    sessionId: checkoutSession.id,
    tier,
    track: TIER_TO_TRACK[tier],
    foundingPromo: foundingPromoApplied,
  });
  return applyRateLimitHeaders(res, result);
}
