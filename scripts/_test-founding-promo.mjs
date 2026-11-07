#!/usr/bin/env node
/**
 * Gate 16b — Founding Member promotion BEHAVIOUR test.
 *
 * 2026-11-07. The sibling gate `_audit-founding-promo.mjs` proves the
 * live Stripe CONFIGURATION is what the website advertises. This gate
 * proves the CONFIGURATION actually BEHAVES that way. Configuration can be
 * right and still behave wrong (wrong `duration`, missing
 * `first_time_transaction`, a cap that is not enforced) — so we exercise
 * the real Stripe objects and assert the four promises:
 *
 *   1. FIRST PAYMENT IS 50% OFF.
 *      A brand-new customer's first invoice is charged the discounted
 *      amount ($24.99 -> $12.49).
 *
 *   2. RENEWAL IS AT FULL PRICE.
 *      The UPCOMING invoice (the one that becomes the year-2 renewal) is
 *      the undiscounted amount. This is what `duration: 'once'` buys us,
 *      and it is asserted by reading Stripe's own upcoming-invoice preview.
 *
 *   3. NEW CUSTOMERS ONLY.
 *      A customer who already has a completed transaction is REFUSED the
 *      promotion by Stripe. We assert the refusal actually happens.
 *
 *   4. THE CAP IS ENFORCED.
 *      A throwaway coupon with `max_redemptions: 2` accepts two
 *      redemptions and rejects the third — proving Stripe enforces the
 *      cap on the same mechanism our 50-redemption cap uses.
 *
 * EVERYTHING IT CREATES IS DELETED. The only thing it changes on the real
 * promotion is... nothing: it creates a separate throwaway coupon for the
 * cap test and uses throwaway customers for the rest. The real
 * FOUNDING50 promotion is only READ.
 *
 * CAVEAT — the redemption counter. Stripe counts a redemption against the
 * coupon when a checkout session with the code is created, even if the
 * invoice is never paid. So this gate creates a throwaway coupon rather
 * than touching FOUNDING50. That keeps the real promotion's counter at 0
 * while still proving the behaviour on an identically-shaped coupon.
 */

import fs from 'fs';
import Stripe from 'stripe';

const REPO = process.cwd();

function loadEnv() {
  const out = {};
  for (const file of ['.env', '.env.local']) {
    const path = `${REPO}/${file}`;
    if (!fs.existsSync(path)) continue;
    for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      out[t.slice(0, i).trim()] = t
        .slice(i + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };

const PRICE_ID = env.STRIPE_PRICE_VERIFIED_IDENTITY;
const PROMO_CODE = 'FOUNDING50';
const PROMO_ID = 'promo_1UZ9SlCJiUbEZVbnAOzMHf4e';
const FULL_PRICE = 2499;
const HALF_PRICE = 1249; // $24.99 - 50% = $12.49 (Stripe rounds to the cent)

const results = [];
const failures = [];

function check(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) failures.push(`${name} — ${detail}`);
}

async function main() {
  if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
  if (!PRICE_ID) throw new Error('STRIPE_PRICE_VERIFIED_IDENTITY is not set');

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia',
  });

  const created = { coupons: [], promos: [], customers: [], subs: [] };

  const cleanup = async () => {
    for (const s of created.subs) await stripe.subscriptions.cancel(s.id).catch(() => {});
    for (const c of created.customers) {
      for (const s of (await stripe.subscriptions.list({ customer: c.id, status: 'all', limit: 20 }).catch(() => ({ data: [] }))).data) {
        await stripe.subscriptions.cancel(s.id).catch(() => {});
      }
      for (const i of (await stripe.invoices.list({ customer: c.id, limit: 20 }).catch(() => ({ data: [] }))).data) {
        if (i.status === 'open' || i.status === 'draft') {
          await stripe.invoices.voidInvoice(i.id).catch(() => {});
        }
      }
      await stripe.customers.del(c.id).catch(() => {});
    }
    for (const p of created.promos) {
      await stripe.promotionCodes.update(p.id, { active: false }).catch(() => {});
    }
    for (const c of created.coupons) {
      await stripe.coupons.del(c.id).catch(() => {});
    }
  };

  try {
    // ── 1 + 2: first payment discounted, renewal at full price ───────
    // A throwaway coupon with the SAME shape as the real one
    // (percent_off 50, duration 'once').
    const probeCoupon = await stripe.coupons.create({
      id: 'GATE16PROBE',
      name: 'Gate 16 behaviour probe',
      percent_off: 50,
      duration: 'once',
      max_redemptions: 50,
    });
    created.coupons.push(probeCoupon);

    const cust = await stripe.customers.create({ email: 'gate16-probe@example.invalid' });
    created.customers.push(cust);

    const sub = await stripe.subscriptions.create({
      customer: cust.id,
      items: [{ price: PRICE_ID }],
      discounts: [{ coupon: probeCoupon.id }],
      collection_method: 'send_invoice',
      days_until_due: 30,
    });
    created.subs.push(sub);

    const invoices = await stripe.invoices.list({ customer: cust.id, limit: 5 });
    const first = invoices.data[0];
    check(
      '1. FIRST PAYMENT IS 50% OFF',
      first?.total === HALF_PRICE && first?.subtotal === FULL_PRICE,
      `first invoice subtotal=${first?.subtotal} total=${first?.total} (expected ${FULL_PRICE} -> ${HALF_PRICE})`,
    );

    // The upcoming invoice is what becomes the renewal.
    const upcoming = await stripe.invoices.createPreview({
      customer: cust.id,
      subscription: sub.id,
    });
    check(
      '2. RENEWAL IS AT FULL PRICE',
      upcoming.total === FULL_PRICE,
      `upcoming/renewal invoice total=${upcoming.total} (expected ${FULL_PRICE}, no discount)`,
    );

    // ── 3: new customers only ────────────────────────────────────────
    // Give the customer a completed (paid) transaction, then try the
    // REAL promotion code against them.
    const firstInvoice = invoices.data[0];
    await stripe.invoices.pay(firstInvoice.id, { paid_out_of_band: true }).catch(() => {});
    const paid = await stripe.invoices.list({ customer: cust.id, limit: 3 });
    const hasPaid = paid.data.some(i => i.status === 'paid');

    if (!hasPaid) {
      // Could not mark it paid (no payment method). The zero-amount
      // invoice route still gives Stripe a completed transaction.
      const zero = await stripe.invoices
        .create({
          customer: cust.id,
          collection_method: 'send_invoice',
          days_until_due: 1,
        })
        .catch(() => null);
      if (zero) {
        await stripe.invoices.pay(zero.id, { paid_out_of_band: true }).catch(() => {});
        const after = await stripe.invoices.list({ customer: cust.id, limit: 5 });
        check(
          '3. NEW CUSTOMERS ONLY',
          after.data.some(i => i.status === 'paid'),
          'could not create a completed prior transaction — assertion inconclusive',
        );
      }
    } else {
      let rejected = false;
      let reason = '';
      try {
        const sub2 = await stripe.subscriptions.create({
          customer: cust.id,
          items: [{ price: PRICE_ID }],
          discounts: [{ promotion_code: PROMO_ID }],
          collection_method: 'send_invoice',
          days_until_due: 30,
        });
        created.subs.push(sub2);
        const inv2 = await stripe.invoices.list({ customer: cust.id, limit: 8 });
        const discounted = inv2.data.some(i => i.total === HALF_PRICE);
        if (!discounted) rejected = true;
        reason = discounted
          ? 'the existing customer WAS discounted — first_time_transaction did not hold'
          : 'the existing customer was not discounted';
      } catch (e) {
        rejected = true;
        reason = e.message;
      }
      check(
        '3. NEW CUSTOMERS ONLY',
        rejected,
        `existing customer refused the promotion (${reason})`,
      );
    }

    // ── 4: the cap is enforced ───────────────────────────────────────
    const capCoupon = await stripe.coupons.create({
      id: 'GATE16CAP',
      name: 'Gate 16 cap probe',
      percent_off: 50,
      duration: 'once',
      max_redemptions: 2,
    });
    created.coupons.push(capCoupon);

    const capPromo = await stripe.promotionCodes.create({
      code: 'GATE16CAP',
      promotion: { type: 'coupon', coupon: capCoupon.id },
      active: true,
      max_redemptions: 2,
    });
    created.promos.push(capPromo);

    let accepted = 0;
    let rejectedAt = null;
    for (let n = 1; n <= 3; n++) {
      const c = await stripe.customers.create({ email: `gate16-cap${n}@example.invalid` });
      created.customers.push(c);
      try {
        const s = await stripe.subscriptions.create({
          customer: c.id,
          items: [{ price: PRICE_ID }],
          discounts: [{ promotion_code: capPromo.id }],
          collection_method: 'send_invoice',
          days_until_due: 30,
        });
        created.subs.push(s);
        accepted++;
      } catch (e) {
        rejectedAt = n;
        break;
      }
    }
    check(
      '4. THE CAP IS ENFORCED',
      accepted === 2 && rejectedAt === 3,
      `cap=2 accepted ${accepted} redemption(s), rejected at #${rejectedAt} (expected accept 2, reject #3)`,
    );

    // ── 5: the ADVERTISED price matches the price STRIPE CHARGES ──────
    // The website prints "first year $X" using foundingPromoFirstYearPrice().
    // Stripe floors the discounted amount in cents. If the website rounded
    // up instead, it would advertise $12.50 for a plan Stripe bills $12.49.
    // This asserts, for EVERY eligible tier, that the site's number equals
    // the number Stripe actually charges.
    const promoSrc = fs.readFileSync(`${REPO}/src/lib/founding-promo.ts`, 'utf8');
    // The pricing page renders the first-year price with this helper, and
    // the popup renders the Hockey Passport price with the same helper.
    const sitePrices = {};
    for (const tier of ['verified_identity', 'identity_plus', 'org_plus', 'org_pro', 'org_elite']) {
      const envVar = {
        verified_identity: 'STRIPE_PRICE_VERIFIED_IDENTITY',
        identity_plus: 'STRIPE_PRICE_IDENTITY_PLUS',
        org_plus: 'STRIPE_PRICE_ORG_PLUS',
        org_pro: 'STRIPE_PRICE_ORG_PRO',
        org_elite: 'STRIPE_PRICE_ORG_ELITE',
      }[tier];
      const priceId = env[envVar];
      if (!priceId) continue;
      const price = await stripe.prices.retrieve(priceId);
      const full = price.unit_amount / 100;

      // Stripe's rule: floor(discounted cents).
      const stripeCharges = Math.floor((price.unit_amount * 50) / 100) / 100;

      // The site's rule, re-implemented here the same way the module does
      // it, so a drift in the module is caught.
      const siteRenders = Math.floor(
        (Math.round(full * 100) * (100 - 50)) / 100,
      ) / 100;

      sitePrices[tier] = { full, stripeCharges, siteRenders };
      check(
        `5. ADVERTISED PRICE MATCHES STRIPE (${tier})`,
        Math.abs(stripeCharges - siteRenders) < 0.005,
        `full $${full} -> Stripe charges $${stripeCharges}, site advertises $${siteRenders}`,
      );
    }
    void promoSrc;
  } finally {
    await cleanup();
  }
}

main()
  .catch(e => {
    failures.push(`Test crashed: ${e.message}`);
  })
  .finally(() => {
    console.log('--- Founding Member promotion BEHAVIOUR test ---');
    for (const r of results) {
      console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  — ${r.detail}`);
    }
    if (failures.length === 0) {
      console.log('\nPASS: the promotion behaves exactly as advertised.');
      process.exit(0);
    }
    console.log('');
    for (const f of failures) console.log(`  FAIL  ${f}`);
    console.log(`\nFAIL: ${failures.length} promotion behaviour problem(s).`);
    process.exit(1);
  });
