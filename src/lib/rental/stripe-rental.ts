// src/lib/rental/stripe-rental.ts
//
// Stripe integration for rental subscriptions (deposits + monthly fees).
//
// Flow:
//   1. Parent clicks "Pay Deposit & Start Rental" -> createSubscription()
//      creates a Stripe Subscription with:
//        - one-time setup fee (deposit_required_cents)
//        - monthly recurring fee (monthly_rate_cents)
//      returns a checkout URL for the parent
//   2. Stripe webhooks -> handleRentalWebhook() updates rental_payments
//      and equipment_rentals.status
//
// Reuses src/lib/stripe-connect.ts for the underlying stripe client.

import { stripe } from '@/lib/stripe-connect';

export type RentalCheckoutParams = {
  rentalId: string;
  rinkId: string;
  parentUserId: string;
  parentEmail: string;
  itemLabel: string;
  currency: string;        // 'PHP' or 'USD'
  depositCents: number;
  monthlyRateCents: number;
  successUrl: string;
  cancelUrl: string;
  stripeAccountId?: string; // optional rink Connect account for direct charges
};

/**
 * Create a Stripe Checkout session in subscription mode for the rental.
 * - One-time deposit (setup fee) + recurring monthly fee
 * - Returns checkout URL for the parent
 */
export async function createRentalCheckoutSession(params: RentalCheckoutParams): Promise<{ url: string; sessionId: string }> {
  const lineItems: any[] = [];

  if (params.depositCents > 0) {
    lineItems.push({
      price_data: {
        currency: params.currency.toLowerCase(),
        product_data: {
          name: `Deposit · ${params.itemLabel}`,
          description: 'Refundable deposit. Returned when rental ends.',
        },
        unit_amount: params.depositCents,
      },
      quantity: 1,
    });
  }

  if (params.monthlyRateCents > 0) {
    lineItems.push({
      price_data: {
        currency: params.currency.toLowerCase(),
        product_data: {
          name: `Monthly rental · ${params.itemLabel}`,
          description: 'Recurring monthly rental fee',
        },
        unit_amount: params.monthlyRateCents,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    });
  }

  if (lineItems.length === 0) {
    throw new Error('Cannot create checkout with zero line items.');
  }

  const sessionParams: any = {
    mode: 'subscription',
    line_items: lineItems,
    customer_email: params.parentEmail,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      kind: 'rental',
      rental_id: params.rentalId,
      rink_id: params.rinkId,
      parent_user_id: params.parentUserId,
    },
    subscription_data: {
      metadata: {
        rental_id: params.rentalId,
        rink_id: params.rinkId,
        parent_user_id: params.parentUserId,
      },
    },
  };

  // If rink has a Stripe Connect account, route funds directly
  if (params.stripeAccountId) {
    sessionParams.subscription_data.application_fee_percent = 5;
    sessionParams.subscription_data.transfer_data = {
      destination: params.stripeAccountId,
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return { url: session.url!, sessionId: session.id };
}
