// Customer-facing checkout error copy for the pricing page (staging, 2026-11-27).
//
// Maps the failure signals from POST /api/tier/upgrade to plain messages. Raw error codes,
// environment-variable names, setup instructions, and stack traces are never shown.
// Messages say checkout did not start. They never claim a payment succeeded or failed.

export type CheckoutFailure = {
  /** The `error` field from the JSON body, if any. Any type is accepted and checked. */
  code?: unknown;
  /** HTTP status, if a response was received. */
  status?: number;
  /** True when no response was received (fetch threw). */
  network?: boolean;
};

export type CheckoutErrorKind =
  | 'plan_unavailable'
  | 'downgrade'
  | 'enterprise'
  | 'rate_limited'
  | 'unavailable'
  | 'network'
  | 'unknown';

export const CHECKOUT_ERROR_COPY: Record<CheckoutErrorKind, string> = {
  plan_unavailable:
    "This plan can't be processed right now. Please contact support@rinkstop.com and we'll help you get set up.",
  downgrade:
    "Changing to a lower plan isn't available through self-service yet. Please contact support@rinkstop.com and we'll help you make the change.",
  enterprise:
    'Organization Enterprise is arranged with our sales team. Please contact support@rinkstop.com to get started.',
  rate_limited:
    'Too many checkout attempts. Please wait a few minutes, then try again.',
  unavailable:
    'Checkout is temporarily unavailable. Please try again in a few minutes. If it keeps happening, contact support@rinkstop.com.',
  network:
    'We could not reach checkout. Please check your connection and try again.',
  unknown:
    "Checkout couldn't start. Please try again. If the problem continues, contact support@rinkstop.com.",
};

export function checkoutErrorKind(failure: CheckoutFailure): CheckoutErrorKind {
  if (failure.network) return 'network';
  const code = typeof failure.code === 'string' ? failure.code : '';
  const status = failure.status ?? 0;

  if (code === 'invalid_tier' || code === 'tier_not_configured') return 'plan_unavailable';
  if (code === 'downgrade_not_self_serve') return 'downgrade';
  if (code === 'enterprise_contact_sales') return 'enterprise';
  if (code === 'rate_limited' || status === 429) return 'rate_limited';
  if (code === 'stripe_not_configured' || code === 'profile_lookup_failed' || status === 503 || status >= 500) {
    return 'unavailable';
  }
  return 'unknown';
}

export function checkoutErrorMessage(failure: CheckoutFailure): string {
  return CHECKOUT_ERROR_COPY[checkoutErrorKind(failure)];
}
