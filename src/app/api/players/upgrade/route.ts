import { NextRequest, NextResponse } from 'next/server';

// Lazy Stripe init so build doesn't fail when env vars are missing at build time
function getStripe() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia',
  });
}

const PRICE_IDS: Record<string, string> = {
  verified: process.env.STRIPE_PRICE_VERIFIED!,
  elite: process.env.STRIPE_PRICE_ELITE!,
};

export async function POST(req: NextRequest) {
  try {
    const { playerId, tier, successUrl, cancelUrl, customerEmail } = await req.json();

    if (!playerId || !tier || !PRICE_IDS[tier]) {
      return NextResponse.json({ error: 'Invalid tier or playerId' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';

    const sessionParams: Record<string, unknown> = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[tier],
          quantity: 1,
        },
      ],
      success_url: `${successUrl || `${baseUrl}/directory/players/${playerId}`}?upgrade=success&tier=${tier}`,
      cancel_url: cancelUrl || `${baseUrl}/directory/players/${playerId}?upgrade=cancelled`,
      metadata: {
        playerId,
        tier,
        type: `player_${tier}`,
      },
      subscription_data: {
        metadata: {
          playerId,
          tier,
          type: `player_${tier}`,
        },
      },
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe checkout]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}