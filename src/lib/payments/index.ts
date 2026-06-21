/**
 * Payment provider abstraction.
 *
 * Goal: a single interface for both PayMongo and Maya so we can swap providers
 * (or run both) without changing call sites. RinkStop routes call
 * `getPaymentProvider()` which returns the active implementation based on
 * env vars. If neither is configured, all methods return
 * `{ ok: false, error: 'payments_not_configured' }`.
 *
 * Provider selection order:
 *   1. PAYMONGO_SECRET_KEY set → PayMongo
 *   2. MAYA_SECRET_KEY set → Maya
 *   3. neither → no-op stub
 */

export type CheckoutLineItem = {
  name: string;
  amount: number; // centavos (e.g. ₱800.00 = 80000)
  currency: 'PHP';
  quantity: number;
};

export type CreateCheckoutArgs = {
  /** Unique reference (e.g. payment_record_id) to reconcile webhooks */
  referenceNumber: string;
  description: string;
  lineItems: CheckoutLineItem[];
  /** Where the player lands after paying */
  successUrl: string;
  cancelUrl: string;
  /** Coach's connected account id (for split-pay). Optional. */
  splitRecipientAccountId?: string;
  /** Amount that goes to RinkStop (in centavos). Optional. */
  splitRinkstopAmount?: number;
  /** Player email for receipt */
  customerEmail?: string;
  /** Metadata to attach to the transaction (visible in webhook) */
  metadata?: Record<string, string>;
};

export type CreateCheckoutResult =
  | { ok: true; checkoutId: string; url: string; expiresAt?: number }
  | { ok: false; error: string; code?: 'not_configured' | 'invalid_request' | 'provider_error' };

export type WebhookParseResult =
  | {
      ok: true;
      event: 'payment.paid' | 'payment.failed' | 'refund.completed' | 'unknown';
      referenceNumber: string | null;
      amount: number | null;
      currency: string | null;
      paidAt: number | null;
      metadata: Record<string, string>;
      raw: unknown;
    }
  | { ok: false; error: string };

export interface PaymentProvider {
  /** Stable name for logging */
  readonly name: 'paymongo' | 'maya' | 'none';
  /** True if env vars are set and the provider is ready */
  readonly configured: boolean;
  /**
   * Create a hosted checkout session and return a URL the player is redirected to.
   * The player picks GCash/Maya/QR Ph/card/etc. on the provider's page.
   */
  createCheckout(args: CreateCheckoutArgs): Promise<CreateCheckoutResult>;
  /**
   * Parse + verify a webhook payload from the provider. Validates signature
   * using the provider's webhook secret.
   */
  parseWebhook(headers: Record<string, string>, rawBody: string): WebhookParseResult;
}

/**
 * Get the active payment provider. Returns a no-op stub if nothing is configured.
 * The stub returns `ok: false` with `code: 'not_configured'` for every call.
 */
export function getPaymentProvider(): PaymentProvider {
  if (process.env.PAYMONGO_SECRET_KEY) {
    // Lazy import to avoid bundling PayMongo code when only Maya is configured
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { paymongoProvider } = require('./paymongo');
    return paymongoProvider;
  }
  if (process.env.MAYA_SECRET_KEY) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mayaProvider } = require('./maya');
    return mayaProvider;
  }
  return noopProvider;
}

const noopProvider: PaymentProvider = {
  name: 'none',
  configured: false,
  async createCheckout(): Promise<CreateCheckoutResult> {
    return { ok: false, error: 'No payment provider configured. Set PAYMONGO_SECRET_KEY or MAYA_SECRET_KEY in Vercel env vars.', code: 'not_configured' };
  },
  parseWebhook(): WebhookParseResult {
    return { ok: false, error: 'No payment provider configured' };
  },
};

/**
 * Helper: format a PHP amount as centavos (integer).
 * 800.00 → 80000
 */
export function phpToCentavos(php: number | string): number {
  const num = typeof php === 'string' ? parseFloat(php) : php;
  return Math.round(num * 100);
}

/**
 * Helper: format centavos as a PHP string for display.
 * 80000 → "800.00"
 */
export function centavosToPhp(centavos: number): string {
  return (centavos / 100).toFixed(2);
}