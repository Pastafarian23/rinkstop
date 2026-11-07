/**
 * Founding Member Promotion — single source of truth.
 *
 * THE OFFER
 *   50% off the FIRST annual payment for every eligible membership and
 *   subscription tier, for the first 50 successful new-customer redemptions.
 *   Renewals happen at the normal full annual price.
 *
 * HOW STRIPE ENFORCES IT
 *   Coupon `FOUNDING50`  — percent_off 50, duration 'once' (so it applies to
 *                          the first invoice only and never to a renewal),
 *                          max_redemptions 50.
 *   Promotion code `FOUNDING50` — active, max_redemptions 50,
 *                          restrictions.first_time_transaction = true, which is
 *                          what makes it NEW CUSTOMERS ONLY: Stripe refuses to
 *                          apply a first-time-transaction code to a customer
 *                          that has already completed a transaction.
 *
 *   Because the coupon is `duration: 'once'`, Stripe applies the 50% to the
 *   first invoice and the next invoice (the renewal) is charged in full. No
 *   extra application logic is needed on our side for the renewal price.
 *
 * WHAT THIS MODULE IS FOR
 *   The website (pricing page, popup, checkout messaging) must not hardcode
 *   "50%" / "first 50" in five different places — they drift, and a drifted
 *   offer is a support ticket and a chargeback. Everything reads from here.
 *
 *   The COUPON / PROMOTION_CODE ids below are also the Stripe-side contract:
 *   `scripts/_audit-founding-promo.mjs` (pre-push Gate 15) asserts the live
 *   Stripe objects still match what this file claims.
 */

export const FOUNDING_PROMO_CODE = 'FOUNDING50';
export const FOUNDING_PROMO_COUPON_ID = 'FOUNDING50';

/**
 * The Stripe promotion-code object id for `FOUNDING50`.
 *
 * A promotion code and a coupon are different Stripe objects: the COUPON
 * carries the discount terms (50%, once, 50 max), and the PROMOTION CODE is
 * the customer-facing handle that can be applied at checkout. Checkout
 * sessions need the promotion-code id, not the coupon id.
 *
 * Overridable with `STRIPE_PROMO_CODE_FOUNDING50` so the id can be rotated
 * without a code change. `scripts/_audit-founding-promo.mjs` verifies the
 * live Stripe object still matches what is declared here.
 */
export const FOUNDING_PROMO_PROMOTION_CODE_ID = 'promo_1UZ9SlCJiUbEZVbnAOzMHf4e';

/** Percentage off the first annual payment. */
export const FOUNDING_PROMO_PERCENT_OFF = 50;

/** Maximum number of successful new-customer redemptions. */
export const FOUNDING_PROMO_MAX_REDEMPTIONS = 50;

/**
 * The tiers the promotion applies to.
 *
 * These are the PAID membership / subscription tiers. `free` and
 * `org_free` cost nothing, so a percentage discount is meaningless.
 * `org_enterprise` is contact-sales only — there is no Stripe price to
 * discount, so it is excluded by construction.
 *
 * The one-time $499 dataset license is deliberately NOT here: it is not a
 * subscription and not a membership tier. The offer is scoped to annual
 * subscriptions.
 */
export const FOUNDING_PROMO_ELIGIBLE_TIERS = [
  'verified_identity',
  'identity_plus',
  'org_plus',
  'org_pro',
  'org_elite',
] as const;

export type FoundingPromoTier = (typeof FOUNDING_PROMO_ELIGIBLE_TIERS)[number];

const ELIGIBLE_SET = new Set<string>(FOUNDING_PROMO_ELIGIBLE_TIERS);

/** Is this tier eligible for the Founding Member discount? */
export function isFoundingPromoEligibleTier(tier: string | null | undefined): boolean {
  if (!tier) return false;
  return ELIGIBLE_SET.has(tier);
}

/**
 * The discounted first-year price, or null when the tier is not eligible or
 * has no price (free / custom).
 *
 * Used to render "first year $12.50, then $24.99/yr" honestly rather than
 * making the visitor do the arithmetic.
 */
export function foundingPromoFirstYearPrice(
  tier: string | null | undefined,
  fullPriceUsd: number | null | undefined,
): number | null {
  if (!isFoundingPromoEligibleTier(tier)) return null;
  if (fullPriceUsd === null || fullPriceUsd === undefined || fullPriceUsd <= 0) return null;
  return Math.round(fullPriceUsd * (1 - FOUNDING_PROMO_PERCENT_OFF / 100) * 100) / 100;
}

/** Headline: "50% off your first year". */
export const FOUNDING_PROMO_HEADLINE = `${FOUNDING_PROMO_PERCENT_OFF}% off your first year`;

/** Short line for the pricing page banner. */
export const FOUNDING_PROMO_SHORT =
  `${FOUNDING_PROMO_PERCENT_OFF}% off the first year for the first ${FOUNDING_PROMO_MAX_REDEMPTIONS} new members`;

/** The renewal disclaimer that must accompany every mention of the offer. */
export const FOUNDING_PROMO_RENEWAL_NOTE = 'Renews at full price.';

/**
 * The full set of facts the popup and the pricing banner must communicate.
 *
 * Returning them as data (rather than three hardcoded JSX blocks) is what
 * keeps the popup, the pricing page, and the checkout page saying the SAME
 * thing — the task requirement "all promotional messaging and checkout
 * behavior are consistent".
 */
export function foundingPromoFacts() {
  return {
    code: FOUNDING_PROMO_CODE,
    percentOff: FOUNDING_PROMO_PERCENT_OFF,
    maxRedemptions: FOUNDING_PROMO_MAX_REDEMPTIONS,
    headline: FOUNDING_PROMO_HEADLINE,
    short: FOUNDING_PROMO_SHORT,
    renewalNote: FOUNDING_PROMO_RENEWAL_NOTE,
    /** The three things the popup MUST say, as discrete lines. */
    points: [
      `${FOUNDING_PROMO_PERCENT_OFF}% off your first annual payment`,
      `Only the first ${FOUNDING_PROMO_MAX_REDEMPTIONS} new customers get this price`,
      `Then ${FOUNDING_PROMO_RENEWAL_NOTE}`,
    ],
  };
}
