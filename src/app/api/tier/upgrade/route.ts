import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { supabaseAdmin } from '@/lib/supabase';

const RATE_LIMIT = { maxRequests: 5, windowMs: 10 * 60 * 1000 };

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' as any })
  : null;

type TierId = 'supporter' | 'verified' | 'pro';

const TIER_TO_PRICE_ENV: Record<TierId, string> = {
  supporter: 'STRIPE_PRICE_TIER_SUPPORTER',
  verified: 'STRIPE_PRICE_TIER_VERIFIED',
  pro: 'STRIPE_PRICE_TIER_PRO',
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ip = getClientIP(req);
  const result = checkRateLimit(`tier-upgrade:${ip}`, RATE_LIMIT);
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

  let body: { tier?: string };
  try {
    body = await req.json();
  } catch {
    const res = NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    return applyRateLimitHeaders(res, result);
  }

  const tier = body.tier as TierId;
  if (!tier || !(tier in TIER_TO_PRICE_ENV)) {
    const res = NextResponse.json(
      { error: 'invalid_tier', allowed: Object.keys(TIER_TO_PRICE_ENV) },
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

  // Look up or create a Stripe customer for this Clerk user
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id, email, display_name')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileErr) {
    console.error('profile lookup err', profileErr);
    const res = NextResponse.json({ error: 'profile_lookup_failed' }, { status: 500 });
    return applyRateLimitHeaders(res, result);
  }

  let customerId = profile?.stripe_customer_id;
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

  const origin = req.headers.get('origin') || `https://${req.headers.get('host')}`;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=1&tier=${tier}`,
    cancel_url: `${origin}/founding-member?cancelled=1`,
    metadata: { clerk_user_id: userId, tier },
    subscription_data: { metadata: { clerk_user_id: userId, tier } },
    allow_promotion_codes: true,
  });

  const res = NextResponse.json({ url: session.url, sessionId: session.id, tier });
  return applyRateLimitHeaders(res, result);
}
