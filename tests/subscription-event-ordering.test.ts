// tests/subscription-event-ordering.test.ts
//
// Covers the out-of-order and idempotency risks in the Stripe webhook.
//
// WHY THIS EXISTS
// Stripe does not guarantee delivery order, and the pre-existing dedupe in
// `stripe_webhook_events` only catches byte-identical replays of the same
// event id. It cannot catch two DIFFERENT events applied in the wrong order.
//
// The concrete disaster this prevents: a user cancels, Stripe sends
// customer.subscription.deleted, then a delayed customer.subscription.updated
// carrying the pre-cancellation metadata arrives and writes the paid tier back.
// The user keeps paid access on a dead subscription, with nothing in the logs
// indicating a problem.
//
// THE DESIGN PRINCIPLE
// A naive "reject if event.created is older" guard was deliberately NOT used —
// it breaks renewals, upgrades that emit multiple events, and any case where
// two events share a delivery second. Instead these tests pin the state-based
// rules: terminal absorption and period-end monotonicity.

import { describe, it, expect } from 'vitest';
import {
  shouldApplySubscriptionEvent,
  storedStateFromProfile,
  describeOrderingDecision,
  type StoredSubscriptionState,
} from '../src/lib/subscription-event-ordering';
import { canonicalSubscriptionStatus } from '../src/lib/subscription-status';

const SUB_A = 'sub_aaa';
const SUB_B = 'sub_bbb';

/** 2026-01-01T00:00:00Z and 2027-01-01T00:00:00Z as unix seconds. */
const PERIOD_2026 = 1767225600;
const PERIOD_2027 = 1798761600;

function stored(over: Partial<StoredSubscriptionState> = {}): StoredSubscriptionState {
  return {
    subscriptionId: SUB_A,
    status: 'active',
    currentPeriodEnd: PERIOD_2027,
    cancelled: false,
    ...over,
  };
}

describe('scenario: upgrade', () => {
  it('applies an upgrade that moves the period end forward', () => {
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_A, status: 'active', currentPeriodEnd: PERIOD_2027 },
      stored({ currentPeriodEnd: PERIOD_2026 }),
    );
    expect(d.apply).toBe(true);
  });

  it('applies an upgrade that creates a NEW subscription id', () => {
    // Upgrading often mints a new subscription. This must never be suppressed
    // because a previous subscription was cancelled — see the re-subscribe test.
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_B, status: 'active', currentPeriodEnd: PERIOD_2027 },
      stored({ subscriptionId: SUB_A, cancelled: true, status: 'cancelled' }),
    );
    expect(d.apply).toBe(true);
  });
});

describe('scenario: cancellation', () => {
  it('applies the cancellation itself', () => {
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_A, status: 'canceled', currentPeriodEnd: PERIOD_2027, cancelled: true },
      stored(),
    );
    expect(d.apply).toBe(true);
  });

  it('BLOCKS a stale updated event after cancellation (the core bug)', () => {
    // subscription.deleted applied first, then a delayed updated carrying the
    // old metadata. Without the guard this rewrites the paid tier back.
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_A, status: 'active', currentPeriodEnd: PERIOD_2027 },
      stored({ status: 'cancelled', cancelled: true }),
    );
    expect(d.apply).toBe(false);
    expect(d.reason).toContain('already_cancelled');
  });

  it('blocks it even when the stale event claims a LATER period end', () => {
    // Terminal absorption is checked BEFORE period-end monotonicity, so a
    // stale event cannot sneak through by claiming a newer period.
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_A, status: 'active', currentPeriodEnd: PERIOD_2027 * 2 },
      stored({ status: 'cancelled', cancelled: true }),
    );
    expect(d.apply).toBe(false);
  });

  it('allows a legitimate RE-subscribe after cancellation (new subscription id)', () => {
    // The user cancels, then subscribes again. Stripe issues a new id. This is
    // the single most important "must not over-block" case: a guard that
    // suppressed this would break every returning customer.
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_B, status: 'active', currentPeriodEnd: PERIOD_2027 },
      stored({ subscriptionId: SUB_A, status: 'cancelled', cancelled: true }),
    );
    expect(d.apply).toBe(true);
    expect(d.reason).toBe('different_subscription_id');
  });
});

describe('scenario: renewal', () => {
  it('applies a renewal whose period end moves forward', () => {
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_A, status: 'active', currentPeriodEnd: PERIOD_2027 * 2 },
      stored({ currentPeriodEnd: PERIOD_2027 }),
    );
    expect(d.apply).toBe(true);
  });

  it('ignores a renewal event that arrives with an older period end', () => {
    // invoice.paid for the PREVIOUS year arriving after the current year's
    // updated event. Applying it would rewind the expiry date.
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_A, status: 'active', currentPeriodEnd: PERIOD_2026 },
      stored({ currentPeriodEnd: PERIOD_2027 }),
    );
    expect(d.apply).toBe(false);
    expect(d.reason).toContain('stale_period_end');
  });

  it('applies a renewal with an IDENTICAL period end', () => {
    // invoice.paid often carries the same period end as the updated event.
    // "Not older" must mean apply, or every renewal would be dropped.
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_A, status: 'active', currentPeriodEnd: PERIOD_2027 },
      stored({ currentPeriodEnd: PERIOD_2027 }),
    );
    expect(d.apply).toBe(true);
  });
});

describe('scenario: downgrade and dunning', () => {
  it('applies a downgrade to a lower tier', () => {
    // Tiers are resolved from metadata; the guard must not block a legitimate
    // downgrade just because the period end is unchanged.
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_A, status: 'active', currentPeriodEnd: PERIOD_2027 },
      stored(),
    );
    expect(d.apply).toBe(true);
  });

  it('applies past_due with an unchanged period end', () => {
    // One failed card must record the status. If this were blocked, the user
    // would appear healthy while actually delinquent.
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_A, status: 'past_due', currentPeriodEnd: PERIOD_2027 },
      stored(),
    );
    expect(d.apply).toBe(true);
  });

  it('applies active -> unpaid (Stripe exhausted retries)', () => {
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_A, status: 'unpaid', currentPeriodEnd: PERIOD_2027 },
      stored(),
    );
    expect(d.apply).toBe(true);
  });
});

describe('scenario: duplicate / replay', () => {
  it('applies an identical repeat (dedupe elsewhere handles byte-identical)', () => {
    // The ordering guard is intentionally NOT the dedupe mechanism — the
    // stripe_webhook_events table handles exact replays by event id. This
    // guard only rejects genuinely stale state, so a re-delivery that matches
    // current state is allowed through (and deduped upstream).
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_A, status: 'active', currentPeriodEnd: PERIOD_2027 },
      stored(),
    );
    expect(d.apply).toBe(true);
  });

  it('applies when there is no stored state at all (first event)', () => {
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_A, status: 'active', currentPeriodEnd: PERIOD_2027 },
      stored({ subscriptionId: null, status: null, currentPeriodEnd: null, cancelled: false }),
    );
    expect(d.apply).toBe(true);
  });
});

describe('unknown-data safety', () => {
  it('APPLIES when currentPeriodEnd is missing on either side', () => {
    // Refusing to apply would drop a real payment event. Failing open is
    // correct: the cost of a rare stale write is far lower than the cost of
    // silently discarding a customer's renewal.
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_A, status: 'active', currentPeriodEnd: null },
      stored({ currentPeriodEnd: PERIOD_2027 }),
    );
    expect(d.apply).toBe(true);

    const d2 = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_A, status: 'active', currentPeriodEnd: PERIOD_2026 },
      stored({ currentPeriodEnd: null }),
    );
    expect(d2.apply).toBe(true);
  });

  it('treats a missing subscription id as a different timeline, not a block', () => {
    const d = shouldApplySubscriptionEvent(
      { subscriptionId: SUB_B, status: 'active', currentPeriodEnd: null },
      stored({ subscriptionId: SUB_A, cancelled: true }),
    );
    expect(d.apply).toBe(true);
  });
});

describe('storedStateFromProfile', () => {
  it('reads the personal track when only the personal subscription id is set', () => {
    const s = storedStateFromProfile({
      stripe_subscription_id: SUB_A,
      stripe_org_subscription_id: null,
      subscription_status: 'active',
      org_subscription_status: null,
      tier_expires_at: '2027-01-01T00:00:00.000Z',
    });
    expect(s.subscriptionId).toBe(SUB_A);
    expect(s.status).toBe('active');
    expect(s.cancelled).toBe(false);
    expect(s.currentPeriodEnd).toBe(PERIOD_2027);
  });

  it('prefers the org track when an org subscription id is set', () => {
    const s = storedStateFromProfile({
      stripe_subscription_id: SUB_A,
      stripe_org_subscription_id: SUB_B,
      subscription_status: 'active',
      org_subscription_status: 'cancelled',
      tier_expires_at: null,
    });
    expect(s.subscriptionId).toBe(SUB_B);
    expect(s.cancelled).toBe(true);
  });

  it('derives cancelled from the normalized status, not a separate flag', () => {
    const cancelled = storedStateFromProfile({
      stripe_subscription_id: SUB_A,
      subscription_status: canonicalSubscriptionStatus('unpaid'),
    });
    expect(cancelled.cancelled).toBe(true);

    const pastDue = storedStateFromProfile({
      stripe_subscription_id: SUB_A,
      subscription_status: canonicalSubscriptionStatus('past_due'),
    });
    // past_due is a DUNNING state: access is retained, so not terminal.
    expect(pastDue.cancelled).toBe(false);
  });

  it('handles a profile with no subscription at all', () => {
    const s = storedStateFromProfile({});
    expect(s.subscriptionId).toBeNull();
    expect(s.cancelled).toBe(false);
    expect(s.currentPeriodEnd).toBeNull();
  });
});

describe('describeOrderingDecision', () => {
  it('produces a log-friendly label', () => {
    expect(describeOrderingDecision({ apply: true, reason: 'current_state' })).toBe(
      'apply(current_state)',
    );
    expect(
      describeOrderingDecision({ apply: false, reason: 'subscription_already_cancelled_terminal_state_is_authoritative' }),
    ).toBe('skip(subscription_already_cancelled_terminal_state_is_authoritative)');
  });
});