import { NextRequest, NextResponse } from 'next/server';

// One-time admin route: returns the live Stripe price IDs + amounts for
// verification. Gated by ONETIME_SECRET env var (no Clerk auth, since the
// secret is 32 random bytes and the route is deleted immediately after use).
//
// After running, delete this route file AND unset the env var via
// `curl -X DELETE -H "Authorization: Bearer $TOKEN" \
//   https://api.vercel.com/v9/projects/$PROJ/env/$ONETIME_ENV_ID`.

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const provided = url.searchParams.get('secret');
  const expected = process.env.ONETIME_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'ONETIME_SECRET env var not set' }, { status: 500 });
  }
  if (provided !== expected) {
    return NextResponse.json({ error: 'invalid secret' }, { status: 403 });
  }

  // Return only the env keys we need (no broad leak)
  return NextResponse.json({
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || null,
    STRIPE_PRICE_TIER_SUPPORTER: process.env.STRIPE_PRICE_TIER_SUPPORTER || null,
    STRIPE_PRICE_TIER_VERIFIED: process.env.STRIPE_PRICE_TIER_VERIFIED || null,
    STRIPE_PRICE_TIER_PRO: process.env.STRIPE_PRICE_TIER_PRO || null,
    STRIPE_PRICE_VERIFIED: process.env.STRIPE_PRICE_VERIFIED || null,
    STRIPE_PRICE_ELITE: process.env.STRIPE_PRICE_ELITE || null,
    // Founding tier price ids (already known)
    STRIPE_PRICE_FOUNDING_FAN: process.env.STRIPE_PRICE_FOUNDING_FAN || null,
    STRIPE_PRICE_FOUNDING_PLAYER: process.env.STRIPE_PRICE_FOUNDING_PLAYER || null,
    STRIPE_PRICE_FOUNDING_COACH: process.env.STRIPE_PRICE_FOUNDING_COACH || null,
    STRIPE_PRICE_FOUNDING_SCOUT: process.env.STRIPE_PRICE_FOUNDING_SCOUT || null,
    STRIPE_PRICE_FOUNDING_BUSINESS: process.env.STRIPE_PRICE_FOUNDING_BUSINESS || null,
    STRIPE_PRICE_FOUNDING_TEAM: process.env.STRIPE_PRICE_FOUNDING_TEAM || null,
    STRIPE_PRICE_FOUNDING_LEAGUE: process.env.STRIPE_PRICE_FOUNDING_LEAGUE || null,
    STRIPE_PRICE_FOUNDING_RINK: process.env.STRIPE_PRICE_FOUNDING_RINK || null,
  });
}
