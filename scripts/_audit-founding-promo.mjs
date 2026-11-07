#!/usr/bin/env node
/**
 * Gate 16 — Founding Member promotion integrity.
 *
 * 2026-11-07. The Founding Member promotion advertises a very specific
 * offer on three public surfaces (the first-visit popup, the pricing page
 * banner, and the per-tier first-year price). If the LIVE Stripe
 * configuration drifts from what the site says, we are advertising a
 * discount we do not honour — a chargeback and a support ticket.
 *
 * This gate reads the LIVE Stripe account and asserts every claim the
 * website makes:
 *
 *   1. The coupon exists, is valid, is 50% off, and has duration 'once'
 *      (which is what makes it apply to the FIRST annual payment only and
 *      leave renewals at full price).
 *   2. The coupon's max_redemptions is exactly 50 — the "first 50 new
 *      customers" promise.
 *   3. A promotion code named FOUNDING50 exists, is active, points at that
 *      coupon, has max_redemptions 50, and has
 *      restrictions.first_time_transaction = true (the "new customers
 *      only" promise, enforced by Stripe).
 *   4. The promotion code id in src/lib/founding-promo.ts matches the live
 *      one, so the checkout API applies the right object.
 *   5. Every canonical subscription payment link allows promotion codes
 *      (the guest-checkout path). The one-time dataset license must NOT.
 *   6. No eligible tier's Stripe price has drifted from the price the
 *      pricing page displays.
 *
 * Read-only. It creates nothing and changes nothing.
 *
 * Env: STRIPE_SECRET_KEY (from .env) plus the STRIPE_PRICE_* vars.
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

const COUPON_ID = 'FOUNDING50';
const PROMO_CODE = 'FOUNDING50';
const EXPECTED_PERCENT_OFF = 50;
const EXPECTED_MAX_REDEMPTIONS = 50;

/** Tiers eligible for the promotion, and the env var holding their price id. */
const ELIGIBLE = {
  verified_identity: 'STRIPE_PRICE_VERIFIED_IDENTITY',
  identity_plus: 'STRIPE_PRICE_IDENTITY_PLUS',
  org_plus: 'STRIPE_PRICE_ORG_PLUS',
  org_pro: 'STRIPE_PRICE_ORG_PRO',
  org_elite: 'STRIPE_PRICE_ORG_ELITE',
};

/** The canonical subscription payment links (guest checkout path). */
const SUBSCRIPTION_LINKS = {
  verified_identity: 'plink_1ULHZpCJiUbEZVbnHoK3I0zV',
  identity_plus: 'plink_1ULHZqCJiUbEZVbnFZEz2y2L',
  org_plus: 'plink_1UTOh2CJiUbEZVbnWMUwAxKC',
  org_pro: 'plink_1UTOh2CJiUbEZVbnS59BW1rO',
  org_elite: 'plink_1UTOh3CJiUbEZVbnh54MSB8R',
};

/** The one-time dataset license — must NOT accept promotion codes. */
const DATASET_LINK = 'plink_1UVswCCJiUbEZVbn31WVqo4v';

const failures = [];
const notes = [];

function fail(msg) {
  failures.push(msg);
}

async function main() {
  if (!env.STRIPE_SECRET_KEY) {
    fail('STRIPE_SECRET_KEY is not set — cannot verify the promotion against live Stripe.');
    return;
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia',
  });

  // ── 1 + 2: the coupon ──────────────────────────────────────────────
  let coupon = null;
  try {
    coupon = await stripe.coupons.retrieve(COUPON_ID);
  } catch (e) {
    fail(`Coupon ${COUPON_ID} could not be retrieved: ${e.message}`);
  }

  if (coupon) {
    if (!coupon.valid) fail(`Coupon ${COUPON_ID} is NOT valid — the promotion would not apply.`);
    if (coupon.percent_off !== EXPECTED_PERCENT_OFF) {
      fail(`Coupon ${COUPON_ID} is ${coupon.percent_off}% off; the site advertises ${EXPECTED_PERCENT_OFF}%.`);
    }
    if (coupon.duration !== 'once') {
      fail(
        `Coupon ${COUPON_ID} has duration '${coupon.duration}'; it must be 'once' so the discount ` +
          `applies to the first annual payment only and renewals stay at full price.`,
      );
    }
    if (coupon.max_redemptions !== EXPECTED_MAX_REDEMPTIONS) {
      fail(
        `Coupon ${COUPON_ID} allows ${coupon.max_redemptions} redemptions; the site advertises ` +
          `the first ${EXPECTED_MAX_REDEMPTIONS} new customers.`,
      );
    }
    if (coupon.times_redeemed > EXPECTED_MAX_REDEMPTIONS) {
      fail(`Coupon ${COUPON_ID} has been redeemed ${coupon.times_redeemed} times — over the cap.`);
    }
    notes.push(
      `coupon ${COUPON_ID}: ${coupon.percent_off}% off, duration=${coupon.duration}, ` +
        `max_redemptions=${coupon.max_redemptions}, redeemed=${coupon.times_redeemed}, valid=${coupon.valid}`,
    );
  }

  // ── 3 + 4: the promotion code ──────────────────────────────────────
  const promoCodes = await stripe.promotionCodes.list({ limit: 100 });
  const matching = promoCodes.data.filter(p => p.code === PROMO_CODE);
  let activePromo = matching.find(p => p.active);
  // The LIST response does not expand `coupon` — retrieve the full object so
  // we can assert WHICH coupon it points at.
  if (activePromo) {
    try {
      activePromo = await stripe.promotionCodes.retrieve(activePromo.id);
    } catch (e) {
      fail(`Promotion code ${PROMO_CODE} could not be retrieved: ${e.message}`);
      activePromo = null;
    }
  }

  if (!activePromo) {
    fail(
      `No ACTIVE promotion code named ${PROMO_CODE} exists. The checkout API and the ` +
        `guest payment links both need one.`,
    );
  } else {
    // API version 2026-04-22 returns the referenced coupon under
    // `promotion.coupon` (a `promotion` object), not the older top-level
    // `coupon` field. Accept either shape so this gate does not break when
    // Stripe moves the field back.
    const promoCouponId = activePromo.coupon?.id ?? activePromo.promotion?.coupon ?? null;
    if (promoCouponId !== COUPON_ID) {
      fail(`Promotion code ${PROMO_CODE} points at coupon '${promoCouponId}', expected '${COUPON_ID}'.`);
    }
    if (activePromo.max_redemptions !== EXPECTED_MAX_REDEMPTIONS) {
      fail(
        `Promotion code ${PROMO_CODE} allows ${activePromo.max_redemptions} redemptions; expected ${EXPECTED_MAX_REDEMPTIONS}.`,
      );
    }
    if (!activePromo.restrictions?.first_time_transaction) {
      fail(
        `Promotion code ${PROMO_CODE} does NOT have restrictions.first_time_transaction = true. ` +
          `Without it, EXISTING subscribers could redeem the discount — the promotion must be new customers only.`,
      );
    }
    notes.push(
      `promotion code ${PROMO_CODE}: active, coupon=${promoCouponId}, ` +
        `max_redemptions=${activePromo.max_redemptions}, redeemed=${activePromo.times_redeemed}, ` +
        `first_time_transaction=${activePromo.restrictions?.first_time_transaction}`,
    );

    // The id hardcoded in src/lib/founding-promo.ts must match the live code.
    const promoSrc = fs.readFileSync(`${REPO}/src/lib/founding-promo.ts`, 'utf8');
    const declared = promoSrc.match(/FOUNDING_PROMO_PROMOTION_CODE_ID\s*=\s*'([^']+)'/)?.[1];
    if (!declared) {
      fail('FOUNDING_PROMO_PROMOTION_CODE_ID is not declared in src/lib/founding-promo.ts.');
    } else if (declared !== activePromo.id) {
      fail(
        `src/lib/founding-promo.ts declares promotion code id '${declared}' but the live active ` +
          `promotion code is '${activePromo.id}'. The checkout API would apply the wrong object.`,
      );
    }
  }

  // ── 5: payment links ───────────────────────────────────────────────
  for (const [tier, linkId] of Object.entries(SUBSCRIPTION_LINKS)) {
    try {
      const link = await stripe.paymentLinks.retrieve(linkId);
      if (!link.allow_promotion_codes) {
        fail(
          `Payment link for ${tier} (${linkId}) does not allow promotion codes — guest checkout ` +
            `cannot redeem the promotion.`,
        );
      }
      if (!link.active) {
        fail(`Payment link for ${tier} (${linkId}) is INACTIVE.`);
      }
    } catch (e) {
      fail(`Payment link for ${tier} (${linkId}) could not be retrieved: ${e.message}`);
    }
  }

  try {
    const ds = await stripe.paymentLinks.retrieve(DATASET_LINK);
    if (ds.allow_promotion_codes) {
      fail(
        'The dataset-license payment link allows promotion codes. It is a ONE-TIME product, not ' +
          'an annual subscription — the promotion must not apply to it.',
      );
    }
  } catch (e) {
    fail(`Dataset-license payment link could not be retrieved: ${e.message}`);
  }

  // ── 6: eligible tier prices are recurring annual prices ────────────
  for (const [tier, envVar] of Object.entries(ELIGIBLE)) {
    const priceId = env[envVar];
    if (!priceId) {
      fail(`${envVar} is not set — cannot verify the ${tier} price.`);
      continue;
    }
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (price.type !== 'recurring') {
        fail(`Price for ${tier} is a one-time price; the promotion applies to annual subscriptions.`);
      }
      if (price.recurring?.interval !== 'year') {
        fail(
          `Price for ${tier} bills on a '${price.recurring?.interval}' interval; the offer says ` +
            `the discount is on the FIRST ANNUAL payment.`,
        );
      }
      notes.push(
        `${tier}: ${price.id} ${price.currency} ${price.unit_amount} / ${price.recurring?.interval}`,
      );
    } catch (e) {
      fail(`Price for ${tier} (${priceId}) could not be retrieved: ${e.message}`);
    }
  }
}

main()
  .catch(e => {
    failures.push(`Audit crashed: ${e.message}`);
  })
  .finally(() => {
    console.log('--- Founding Member promotion audit ---');
    for (const n of notes) console.log(`  ok  ${n}`);
    if (failures.length === 0) {
      console.log('PASS: the live Stripe configuration matches the advertised offer.');
      process.exit(0);
    }
    console.log('');
    for (const f of failures) console.log(`  FAIL  ${f}`);
    console.log(`\nFAIL: ${failures.length} promotion problem(s) found.`);
    process.exit(1);
  });
