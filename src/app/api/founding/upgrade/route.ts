import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(req: NextRequest) {
  try {
    const { entityId, entityType, successUrl, cancelUrl, customerEmail } = await req.json();

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

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';

    const sessionParams: Record<string, unknown> = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[entityType], quantity: 1 }],
      success_url: `${successUrl || `${baseUrl}/directory/${entityType}s/${entityId}`}?upgrade=success&type=founding`,
      cancel_url: cancelUrl || `${baseUrl}/directory/${entityType}s/${entityId}?upgrade=cancelled`,
      metadata: { entityId, entityType, type: `founding_${entityType}` },
    };

    if (customerEmail) sessionParams.customer_email = customerEmail;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Stripe founding checkout]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}