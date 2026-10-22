// src/lib/subscription-event-ordering.ts
//
// Guards entitlement writes against out-of-order Stripe webhook delivery.
//
// THE PROBLEM THIS SOLVES
// Stripe does not guarantee delivery order. Two failure modes matter:
//
//   A. A stale `customer.subscription.updated` (older state) arriving AFTER a
//      newer `subscription.deleted` resurrects paid access: the handler writes
//      the tier back from stale metadata.
//   B. A replayed or duplicated event re-applies an old tier after the user has
//      legitimately changed plans.
//
// The existing `stripe_webhook_events` dedupe only catches byte-identical
// replays of the SAME event id. It cannot help when the events genuinely differ
// but arrive in the wrong order.
//
// WHY "REJECT IF OLDER" IS THE WRONG ANSWER
// A naive `if (event.created < lastSeen) return` breaks real, correct flows:
//
//   • A user upgrades. Stripe emits updated(active) then, separately, a
//     subscription.created. Both are legitimate and both should apply.
//   • A renewal legitimately arrives with an older-looking payload but a
//     LATER current_period_end.
//   • Stripe's `event.created` is delivery time, not state version. Two events
//     for the same subscription can share a second.
//
// So the guard compares ACTUAL SUBSCRIPTION STATE, not timestamps. The
// authoritative signal is `current_period_end`: it only ever moves forward for
// a given subscription. An event that carries an EARLIER period end than the one
// we already applied is, by definition, describing an older state of that same
// subscription — regardless of when the envelope was created.
//
// The three guards, in order of confidence:
//
//   1. TERMINAL ABSORPTION. Once `subscription.deleted` has been applied for a
//      given subscription id, no later event may resurrect access for that id.
//      Stripe keeps sending `invoice.payment_failed`-style events after
//      cancellation, and a re-upgrade always produces a NEW subscription id.
//      This is the strongest and most valuable guard: it directly closes
//      failure mode A.
//
//   2. PERIOD-END MONOTONICITY. For a non-terminal event on the same
//      subscription id, ignore it if its `current_period_end` is older than
//      what we have already recorded.
//
//   3. EVENT-ID DEDUPE. Already handled by `stripe_webhook_events` in the route;
//      kept here as a documented third line for completeness.
//
// WHAT THIS DELIBERATELY ALLOWS
//   • Re-upgrade after cancellation (new subscription id → guard 1 does not
//     apply, and it should not).
//   • Renewal (period end moves forward → guard 2 passes).
//   • A status-only change with an identical period end (past_due → unpaid):
//     period end is not older, so it applies. This is correct — the user
//     genuinely lost access and we must record that.

import type { CanonicalSubscriptionStatus } from './subscription-status';

/** The minimum subscription shape this module needs to make a decision. */
export interface SubscriptionStateForOrdering {
  /** Stripe subscription id — the identity a state change applies to. */
  subscriptionId: string;
  /** Stripe's own status, un-normalized. */
  status: string | null | undefined;
  /** Unix seconds. Undefined when Stripe omits it (deleted events). */
  currentPeriodEnd?: number | null;
}

/** What we currently believe about this user's entitlement, from the DB. */
export interface StoredSubscriptionState {
  /** The subscription id we last applied state for. */
  subscriptionId: string | null;
  /** Our normalized status for that subscription. */
  status: string | null;
  /** period end we last recorded, as unix seconds. */
  currentPeriodEnd?: number | null;
  /** True when this subscription has been terminally cancelled. */
  cancelled: boolean;
}

export type OrderingDecision =
  | { apply: true; reason: string }
  | { apply: false; reason: string };

const TERMINAL_STATUSES = new Set(['cancelled', 'unpaid']);

/**
 * Decide whether an incoming subscription event should mutate entitlement state.
 *
 * `incoming.cancelled` means the event type was `customer.subscription.deleted`
 * (or the normalized status is terminal). `stored` is what the database
 * currently holds.
 */
export function shouldApplySubscriptionEvent(
  incoming: SubscriptionStateForOrdering & { cancelled?: boolean },
  stored: StoredSubscriptionState,
): OrderingDecision {
  // Different subscription ids are independent timelines. A new purchase, an
  // upgrade that creates a new subscription, or a re-subscribe after cancel all
  // land here and MUST be applied — otherwise a legitimate upgrade would be
  // silently dropped because a prior subscription was cancelled.
  if (stored.subscriptionId !== incoming.subscriptionId) {
    return { apply: true, reason: 'different_subscription_id' };
  }

  // GUARD 1 — terminal absorption.
  //
  // We have already recorded this subscription as cancelled. Nothing may grant
  // access back on the same subscription id. Stripe continues to emit events for
  // cancelled subscriptions (payment_failed, updated during the cancellation
  // sequence), and those must not resurrect a paid tier.
  //
  // An incoming terminal event is still applied so the state stays consistent,
  // but it is applied as a no-op in effect.
  if (stored.cancelled && !incoming.cancelled) {
    return {
      apply: false,
      reason: 'subscription_already_cancelled_terminal_state_is_authoritative',
    };
  }

  // GUARD 2 — period-end monotonicity.
  //
  // current_period_end only moves forward for a live subscription. An event
  // carrying an older one describes a state we have already superseded.
  //
  // Both values must be present: if either is missing we cannot compare, and
  // refusing to apply would break legitimate flows (e.g. a trial that has no
  // period end yet). When in doubt we apply, because the alternative is
  // silently dropping a real payment event.
  const incomingEnd = incoming.currentPeriodEnd ?? null;
  const storedEnd = stored.currentPeriodEnd ?? null;
  if (incomingEnd !== null && storedEnd !== null && incomingEnd < storedEnd) {
    return {
      apply: false,
      reason: `stale_period_end_incoming_${incomingEnd}_older_than_stored_${storedEnd}`,
    };
  }

  return { apply: true, reason: 'current_state' };
}

/**
 * Build the stored-state view from a profile row.
 *
 * `cancelled` is derived from the normalized status rather than tracked in its
 * own column, so there is a single source of truth: if the status says the
 * subscription died, we treat it as dead.
 */
export function storedStateFromProfile(row: {
  tier?: string | null;
  org_tier?: string | null;
  stripe_subscription_id?: string | null;
  stripe_org_subscription_id?: string | null;
  subscription_status?: string | null;
  org_subscription_status?: string | null;
  tier_expires_at?: string | null;
}): StoredSubscriptionState {
  const isOrg = Boolean(row.stripe_org_subscription_id);
  const status = (isOrg ? row.org_subscription_status : row.subscription_status) ?? null;
  const expires = row.tier_expires_at ?? null;

  return {
    subscriptionId: (isOrg ? row.stripe_org_subscription_id : row.stripe_subscription_id) ?? null,
    status,
    currentPeriodEnd: expires ? Math.floor(new Date(expires).getTime() / 1000) : null,
    cancelled: status !== null && TERMINAL_STATUSES.has(status),
  };
}

/** Human-readable label for logging. Keeps decision reasons out of UI copy. */
export function describeOrderingDecision(d: OrderingDecision): string {
  return d.apply ? `apply(${d.reason})` : `skip(${d.reason})`;
}

export type { CanonicalSubscriptionStatus };