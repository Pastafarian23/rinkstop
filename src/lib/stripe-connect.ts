/**
 * RinkStop Stripe Connect integration.
 * Uses Stripe Express accounts for rink owners + officials to receive payments.
 */

import Stripe from 'stripe';

// Stripe v22 changed the public type layout: `Stripe.Checkout` resolves
// to the class instance (which has `sessions`, not `SessionCreateParams`).
// The namespace types (LineItem etc.) still live at
// stripe/resources/Checkout/Sessions but `moduleResolution: bundler` in
// our tsconfig doesn't expose that subpath through the package's
// `exports` map. Until we either bump to `moduleResolution: node16` or
// downgrade `stripe`, the `LineItem` references need a one-line escape.
// Functionality unchanged — these were always just parameter shapes.
// @ts-ignore — Stripe v22 namespace export layout: tsc on local v22 sees the error,
// tsc on Vercel's cached older Stripe doesn't (so we use @ts-ignore rather than
// @ts-expect-error, which would fail as "unused directive" on Vercel).
type CheckoutLineItem = Stripe.Checkout.SessionCreateParams.LineItem;

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLATFORM_FEE_PERCENT = 5; // 5% platform fee

// ---------------------------------------------------------------------------
// Account management
// ---------------------------------------------------------------------------

/**
 * Create a Stripe Connect Express account for a rink or official.
 */
export async function createConnectAccount(params: {
  email: string;
  businessName: string;
  country: string; // e.g. 'US', 'PH'
}): Promise<string> {
  const account = await stripe.accounts.create({
    type: 'express',
    email: params.email,
    business_type: 'company',
    company: {
      name: params.businessName,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    country: params.country,
  });
  return account.id;
}

/**
 * Generate a Stripe-hosted onboarding link for a Connect account.
 */
export async function createOnboardingLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string,
): Promise<string> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
  return accountLink.url;
}

/**
 * Get current onboarding status of a Connect account.
 */
export async function getAccountStatus(
  accountId: string,
): Promise<{ chargesEnabled: boolean; payoutsEnabled: boolean; detailsSubmitted: boolean }> {
  const account = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
  };
}

// ---------------------------------------------------------------------------
// Checkout sessions
// ---------------------------------------------------------------------------

export type CheckoutSessionParams = {
  accountId: string; // Connect destination account
  lineItems: CheckoutLineItem[];
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  expiresAt?: number; // Unix timestamp
};

/**
 * Create a Stripe Checkout session with Connect application_fee_amount.
 * Money flows: Customer → Stripe → (platform fee) → RinkStop + (rest) → Connect account
 */
export async function createCheckoutSession({
  accountId,
  lineItems,
  metadata,
  successUrl,
  cancelUrl,
  expiresAt,
}: CheckoutSessionParams): Promise<{ url: string; sessionId: string }> {
  // Calculate platform fee (5% of subtotal)
  const subtotal = lineItems.reduce(
    (sum, item) => sum + (item.price_data?.unit_amount ?? 0) * (item.quantity ?? 1),
    0,
  );
  const platformFee = Math.round(subtotal * (PLATFORM_FEE_PERCENT / 100));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    metadata,
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_intent_data: {
      application_fee_amount: platformFee,
      transfer_data: {
        destination: accountId,
      },
    },
    expires_at: expiresAt,
  });

  return { url: session.url!, sessionId: session.id };
}

/**
 * Construct a Stripe Checkout Session line item from a booking.
 */
export function bookingToLineItem(opts: {
  name: string;
  description: string;
  amount: number; // in cents
  quantity?: number;
}): CheckoutLineItem {
  return {
    quantity: opts.quantity ?? 1,
    price_data: {
      currency: 'usd',
      unit_amount: opts.amount,
      product_data: {
        name: opts.name,
        description: opts.description,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

/**
 * Construct a Stripe webhook event from raw body + headers.
 */
export function constructWebhookEvent(
  payload: string,
  signature: string,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

/**
 * Create a full refund on a PaymentIntent.
 */
export async function refundPayment(paymentIntentId: string): Promise<Stripe.Refund> {
  return stripe.refunds.create({ payment_intent: paymentIntentId });
}

/**
 * Get the platform fee (RinkStop's cut) from a PaymentIntent.
 */
export async function getPlatformFeeFromPaymentIntent(
  paymentIntentId: string,
): Promise<number> {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  return (pi.application_fee_amount ?? 0);
}
