import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    SUPPORTER: process.env.STRIPE_PRICE_TIER_SUPPORTER || 'MISSING',
    VERIFIED: process.env.STRIPE_PRICE_TIER_VERIFIED || 'MISSING',
    PRO: process.env.STRIPE_PRICE_TIER_PRO || 'MISSING',
  });
}
