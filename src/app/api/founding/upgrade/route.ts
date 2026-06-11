import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { checkRateLimit, getClientIP, applyRateLimitHeaders } from '@/lib/rateLimit';

// Lazy Stripe init so build doesn't fail when env vars are missing at build time
function getStripe() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });
}

const PRICE_IDS: Record<string, string | undefined> = {
  fan:      process.env.STRIPE_PRICE_FOUNDING_FAN,
  player:   process.env.STRIPE_PRICE_FOUNDING_PLAYER,
  coach:    process.env.STRIPE_PRICE_FOUNDING_COACH,
  scout:    process.env.STRIPE_PRICE_FOUNDING_SCOUT,
  business: process.env.STRIPE_PRICE_FOUNDING_BUSINESS,
  team:     process.env.STRIPE_PRICE_FOUNDING_TEAM,
  league:   process.env.STRIPE_PRICE_FOUNDING_LEAGUE,
  rink:     process.env.STRIPE_PRICE_FOUNDING_RINK,
};

// Per-user rate limit: 5 checkout creations per hour. Prevents a signed-in user
// from spamming the endpoint and generating junk Stripe sessions.
const USER_RL = { maxRequests: 5, windowMs: 60 * 60 * 1000 };

export async function POST(req: NextRequest) {
  // 1) Auth required (closes H1 from security audit — anyone on internet could create sessions)
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  // 2) Per-user rate limit (defense-in-depth alongside per-IP rate limit)
  const rl = await checkRateLimit(`founding_upgrade:${userId}`, USER_RL);
  if (!rl.allowed) {
    const res = NextResponse.json(
      { error: 'Too many checkout attempts. Try again later.' },
      { status: 429 }
    );
    res.headers.set('Retry-After', String(rl.retryAfter || 3600));
    return applyRateLimitHeaders(res, rl);
  }

  try {
    const { entityId, entityType, successUrl, cancelUrl } = await req.json();

    // Detailed error for missing price configuration
    if (!PRICE_IDS[entityType]) {
      const missing = Object.entries(PRICE_IDS)
        .filter(([, v]) => !v)
        .map(([k]) => `STRIPE_PRICE_FOUNDING_${k.toUpperCase()}`);
      console.error('[Founding checkout] Missing price env vars:', missing.join(', '));
      return NextResponse.json({
        error: 'Stripe price not configured',
        missingPrices: missing,
        entityType,
      }, { status: 400 });
    }

    if (!entityId || !entityType) {
      return NextResponse.json({ error: 'Missing entityId or entityType' }, { status: 400 });
    }

    // 3) Pull email from Clerk — never trust the request body (closes H3 from audit:
    //    attacker could pass any email and have Stripe send the receipt to a victim).
    //    Falls back to none if the user has no primary email, in which case Stripe
    //    collects the email at checkout time.
    const user = await currentUser();
    const customerEmail = user?.emailAddresses?.[0]?.emailAddress;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';

    const sessionParams: Record<string, unknown> = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[entityType], quantity: 1 }],
      success_url: `${successUrl || `${baseUrl}/directory/${entityType}s/${entityId}`}?upgrade=success&type=founding`,
      cancel_url: cancelUrl || `${baseUrl}/directory/${entityType}s/${entityId}?upgrade=cancelled`,
      metadata: {
        entityId,
        entityType,
        type: `founding_${entityType}`,
        callerUserId: userId,  // 4) Provenance: who's actually paying
      },
      // Per-user idempotency so a retry doesn't create a duplicate session
      // (Stripe deduplicates by key, and the body will be the same).
    };

    if (customerEmail) sessionParams.customer_email = customerEmail;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(
      sessionParams,
      { idempotencyKey: `founding_${userId}_${entityId}_${entityType}` }
    );
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe founding checkout]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
