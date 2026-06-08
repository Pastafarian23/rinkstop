import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-admin-key');
  if (auth !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia' as any,
  });

  // Idempotent: check if products with our metadata exist
  const existing = await stripe.products.search({
    query: "active:'true' AND metadata['rinkstop_tier']:'true'",
  });
  const existingMap: Record<string, { product_id: string; price_id: string }> = {};
  for (const p of existing.data) {
    const tier = p.metadata?.tier_id;
    if (!tier) continue;
    const prices = await stripe.prices.list({ product: p.id, active: true });
    const recurring = prices.data.find((pr) => pr.recurring);
    if (recurring) existingMap[tier] = { product_id: p.id, price_id: recurring.id };
  }

  const tiers = [
    {
      id: 'supporter',
      name: 'RinkStop Supporter',
      price: 999,
      description: 'Annual supporter membership. Founding Member badge, 1 free claim, unlimited follows.',
    },
    {
      id: 'verified',
      name: 'RinkStop Verified',
      price: 1999,
      description: 'Annual verified membership. Checkmark, unlimited claims, public profile, send/receive DMs with other Verified+ users.',
    },
    {
      id: 'pro',
      name: 'RinkStop Pro',
      price: 9999,
      description: 'Annual pro membership. Featured Listing rotation, lead capture form, bulk claim, analytics dashboard.',
    },
  ];

  const results: Record<string, { product_id: string; price_id: string; created: boolean }> = {};

  for (const t of tiers) {
    if (existingMap[t.id]) {
      results[t.id] = { ...existingMap[t.id], created: false };
      continue;
    }

    const product = await stripe.products.create({
      name: t.name,
      description: t.description,
      metadata: { tier_id: t.id, rinkstop_tier: 'true' },
    });

    const price = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: t.price,
      recurring: { interval: 'year' },
      metadata: { tier_id: t.id },
    });

    results[t.id] = { product_id: product.id, price_id: price.id, created: true };
  }

  return NextResponse.json({ ok: true, tiers: results });
}
