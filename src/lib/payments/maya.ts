/**
 * Maya Business provider — STUB. Real implementation lands once Arnel sends
 * MAYA_PUBLIC_KEY + MAYA_SECRET_KEY + MAYA_WEBHOOK_SECRET and PayFac approval.
 *
 * For the stub, every method returns ok:false with code:'not_implemented'.
 *
 * Once approved, implement using:
 *   - https://developers.maya.ph/docs/online-payments-quick-start-guide-maya-business-manager
 *   - https://developers.maya.ph/reference/accept-payments-as-a-payment-facilitator-in-maya-checkout
 *   - https://developers.maya.ph/docs/configuring-your-webhook-for-maya-checkout
 */

import type { CreateCheckoutArgs, CreateCheckoutResult, PaymentProvider, WebhookParseResult } from './index';

export const mayaProvider: PaymentProvider = {
  name: 'maya',
  configured: Boolean(process.env.MAYA_SECRET_KEY),

  async createCheckout(_args: CreateCheckoutArgs): Promise<CreateCheckoutResult> {
    return {
      ok: false,
      error: 'Maya createCheckout not yet implemented. Awaiting MAYA_SECRET_KEY + PayFac approval.',
      code: 'not_implemented',
    };
  },

  parseWebhook(_headers: Record<string, string>, _rawBody: string): WebhookParseResult {
    return { ok: false, error: 'Maya parseWebhook not yet implemented' };
  },
};