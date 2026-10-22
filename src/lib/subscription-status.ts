// src/lib/subscription-status.ts
//
// Single source of truth for translating Stripe's subscription-status
// vocabulary into RinkStop's canonical one.
//
// WHY THIS IS A SEPARATE MODULE
// The normalizer originally lived inline in the Stripe webhook route. That made
// it untestable: Vitest cannot import a Next.js route handler without pulling
// in the whole App Router runtime, and the function is the exact thing that must
// never regress. If the webhook ever stops normalizing, a real customer event
// violates a database CHECK, the UPDATE throws, Stripe retries on 5xx, and the
// downgrade to the free tier is never persisted — a dead subscription keeps
// paid access indefinitely. That failure is silent (the purchase already
// succeeded) and expensive, so it gets a unit test rather than a code review.
//
// THE INVARIANT
// `profiles.subscription_status` has a CHECK constraint accepting ONLY:
//   active | past_due | cancelled | trialing | NULL
// Every value written to that column MUST pass through this module first.
//
// Note the deliberate spelling difference: Stripe sends `canceled` (one L),
// RinkStop stores `cancelled` (two L's). That mismatch is not cosmetic — it is
// why a `WHERE subscription_status = 'cancelled'` query would silently miss real
// cancellations if raw Stripe values were ever stored.

/** The canonical vocabulary, mirroring the DB CHECK constraint exactly. */
export const CANONICAL_SUBSCRIPTION_STATUSES = [
  'active',
  'past_due',
  'cancelled',
  'trialing',
] as const;

export type CanonicalSubscriptionStatus = (typeof CANONICAL_SUBSCRIPTION_STATUSES)[number];

/**
 * Statuses that still represent a live paid entitlement.
 *
 * `past_due` is included deliberately. The dunning policy (documented in the
 * webhook's customer.subscription.updated handler) keeps the user's tier through
 * Stripe's Smart Retries window, so during that window they ARE entitled. The
 * status is recorded as past_due rather than active so the state is observable,
 * but access is not revoked on a single failed charge.
 */
export function isEntitledStatus(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

/**
 * True when the subscription has terminally failed: the user paid for a period
 * and will not get another one. These are the statuses that must revoke access.
 */
export function isTerminalStatus(status: string | null | undefined): boolean {
  return status === 'cancelled';
}

/**
 * Translate a raw Stripe subscription status to RinkStop's canonical vocabulary.
 *
 * Mapping:
 *   active              → active
 *   trialing            → trialing
 *   past_due            → past_due
 *   canceled            → cancelled      (Stripe spelling → RinkStop spelling)
 *   unpaid              → cancelled      (Stripe exhausted retries)
 *   incomplete_expired  → cancelled      (first payment never completed)
 *   incomplete          → trialing       (access granted, not yet collected)
 *   null/undefined      → null
 *   anything else       → past_due       (see below)
 *
 * WHY AN UNKNOWN STATUS IS NOT PASSED THROUGH
 * Passing it through would violate the CHECK constraint and make the whole
 * UPDATE fail, which Stripe retries on 5xx — the entitlement change would
 * never land. Mapping it to past_due keeps the write succeeding and keeps the
 * user entitled (the conservative outcome) while still leaving an unexpected
 * value that monitoring can alert on. When Stripe adds a status, add it here
 * explicitly rather than relying on this fallback.
 */
export function canonicalSubscriptionStatus(
  raw: string | null | undefined,
): CanonicalSubscriptionStatus | null {
  switch (raw) {
    case 'active':
    case 'past_due':
    case 'trialing':
      return raw;
    case 'cancelled':
      return 'cancelled';
    case 'canceled':
      return 'cancelled';
    case 'unpaid':
    case 'incomplete_expired':
      return 'cancelled';
    case 'incomplete':
      return 'trialing';
    case null:
    case undefined:
      return null;
    case '':
      return null;
    default:
      return 'past_due';
  }
}

/**
 * Resolve the tier a user should hold for a given raw Stripe status, applying
 * the documented dunning policy.
 *
 * The policy (decision 2026-06-16): keep the paid tier through the 2-week Smart
 * Retries window so one failed card does not immediately strip a paying
 * customer's access. Only a terminal status drops them to the free tier.
 *
 * `purchasedTier` is the tier recorded in subscription metadata — i.e. what
 * they bought. It is preserved during dunning rather than read from the DB, so
 * this function is pure and does not need to know the current tier.
 */
export function resolveTierForStatus(
  rawStatus: string | null | undefined,
  purchasedTier: string | null | undefined,
  fallbackTier: string,
): string {
  const canonical = canonicalSubscriptionStatus(rawStatus);

  // Terminal: access revoked, drop to the free rung of whichever track.
  if (canonical === 'cancelled') return fallbackTier;

  // Live or dunning: keep whatever they bought.
  return purchasedTier || fallbackTier;
}