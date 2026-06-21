/**
 * PayMongo provider — STUB. Real implementation lands once Arnel sends
 * PAYMONGO_SECRET_KEY + PAYMONGO_PUBLIC_KEY + PAYMONGO_WEBHOOK_SECRET.
 *
 * For the stub, every method returns ok:false with code:'not_implemented' so
 * it doesn't accidentally fire live API calls during local dev.
 *
 * Once Arnel signs the Payment Splitting contract and the live keys are set,
 * implement these methods using PayMongo's Checkout Sessions + Webhooks APIs:
 *   - https://docs.paymango.com/docs/payment-channels-hosted-checkout
 *   - https://docs.paymongo.com/docs/webhooks
 *   - https://docs.paymongo.com/docs/payment-splitting (Platforms)
 */

import type { CreateCheckoutArgs, CreateCheckoutResult, PaymentProvider, WebhookParseResult } from './index';

export const paymongoProvider: PaymentProvider = {
  name: 'paymongo',
  configured: Boolean(process.env.PAYMONGO_SECRET_KEY),

  async createCheckout(_args: CreateCheckoutArgs): Promise<CreateCheckoutResult> {
    return {
      ok: false,
      error: 'PayMongo createCheckout not yet implemented. Awaiting PAYMONGO_SECRET_KEY + split-pay contract.',
      code: 'not_implemented',
    };
  },

  parseWebhook(_headers: Record<string, string>, _rawBody: string): WebhookParseResult {
    return { ok: false, error: 'PayMongo parseWebhook not yet implemented' };
  },
};