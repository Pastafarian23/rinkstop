// tests/subscription-status.test.ts
//
// Guards the Stripe → RinkStop subscription-status vocabulary.
//
// WHY THIS TEST IS WORTH HAVING
// `profiles.subscription_status` has a CHECK constraint accepting only
// active | past_due | cancelled | trialing | NULL. The webhook must therefore
// normalize every raw Stripe status before writing. If it does not:
//
//   1. The UPDATE violates the CHECK → throws → the webhook returns 5xx.
//   2. Stripe retries, and keeps failing for the same reason.
//   3. The entitlement change is never persisted.
//
// The end state is a customer whose subscription has died but who keeps paid
// access, with no error visible to anyone except a retry counter. This is the
// exact bug that shipped once already: the original CHECK constraint was
// written as `status = ANY(ARRAY[..., NULL::text])`, which evaluates to NULL
// for non-matching values, and CHECK passes on NULL — so the constraint never
// rejected anything and the missing normalizer was invisible. Fixing the
// constraint alone would have turned a silent bug into a 500 on the first real
// cancellation event.
//
// Both halves of that pair are pinned here and in the migration.

import { describe, it, expect } from 'vitest';
import {
  canonicalSubscriptionStatus,
  isEntitledStatus,
  isTerminalStatus,
  resolveTierForStatus,
  CANONICAL_SUBSCRIPTION_STATUSES,
} from '../src/lib/subscription-status';

describe('canonicalSubscriptionStatus', () => {
  it('passes through the statuses already in canonical form', () => {
    expect(canonicalSubscriptionStatus('active')).toBe('active');
    expect(canonicalSubscriptionStatus('past_due')).toBe('past_due');
    expect(canonicalSubscriptionStatus('trialing')).toBe('trialing');
    expect(canonicalSubscriptionStatus('cancelled')).toBe('cancelled');
  });

  it("maps Stripe's American 'canceled' to RinkStop's British 'cancelled'", () => {
    // The one-L/two-L difference is why raw Stripe values must never be
    // written directly: a query for 'cancelled' would miss real cancellations.
    expect(canonicalSubscriptionStatus('canceled')).toBe('cancelled');
    expect(canonicalSubscriptionStatus('canceled')).not.toBe('canceled');
  });

  it('maps terminal dunning outcomes to cancelled', () => {
    expect(canonicalSubscriptionStatus('unpaid')).toBe('cancelled');
    expect(canonicalSubscriptionStatus('incomplete_expired')).toBe('cancelled');
  });

  it('maps incomplete to trialing (access granted, payment pending)', () => {
    expect(canonicalSubscriptionStatus('incomplete')).toBe('trialing');
  });

  it('maps null/undefined/empty to null', () => {
    expect(canonicalSubscriptionStatus(null)).toBeNull();
    expect(canonicalSubscriptionStatus(undefined)).toBeNull();
    expect(canonicalSubscriptionStatus('')).toBeNull();
  });

  it('never returns a value the DB CHECK would reject', () => {
    // Every raw status Stripe can currently emit, plus a few historical ones.
    const raw = [
      'active', 'past_due', 'trialing', 'canceled', 'cancelled', 'unpaid',
      'incomplete', 'incomplete_expired', 'paused', 'something_new',
    ];
    for (const r of raw) {
      const out = canonicalSubscriptionStatus(r);
      expect(out === null || CANONICAL_SUBSCRIPTION_STATUSES.includes(out as never)).toBe(true);
    }
  });

  it('does not pass an unknown status through unchanged', () => {
    // Passing it through would violate the CHECK and 500 the webhook.
    expect(canonicalSubscriptionStatus('paused')).toBe('past_due');
    expect(canonicalSubscriptionStatus('brand_new_status')).toBe('past_due');
  });
});

describe('entitlement helpers', () => {
  it('treats past_due as still entitled (dunning window)', () => {
    // One failed card must not immediately strip a paying customer's access.
    expect(isEntitledStatus('past_due')).toBe(true);
    expect(isEntitledStatus('active')).toBe(true);
    expect(isEntitledStatus('trialing')).toBe(true);
  });

  it('treats cancelled as not entitled', () => {
    expect(isEntitledStatus('cancelled')).toBe(false);
    expect(isEntitledStatus(null)).toBe(false);
    expect(isTerminalStatus('cancelled')).toBe(true);
  });
});

describe('resolveTierForStatus (dunning policy)', () => {
  it('keeps the purchased tier through a failed payment', () => {
    expect(resolveTierForStatus('past_due', 'identity_plus', 'free')).toBe('identity_plus');
    expect(resolveTierForStatus('incomplete', 'identity_plus', 'free')).toBe('identity_plus');
  });

  it('drops to the free rung on a terminal status', () => {
    expect(resolveTierForStatus('canceled', 'identity_plus', 'free')).toBe('free');
    expect(resolveTierForStatus('unpaid', 'identity_plus', 'free')).toBe('free');
    expect(resolveTierForStatus('incomplete_expired', 'identity_plus', 'free')).toBe('free');
  });

  it('falls back to the free rung when metadata carries no tier', () => {
    expect(resolveTierForStatus('active', null, 'free')).toBe('free');
    expect(resolveTierForStatus('active', undefined, 'free')).toBe('free');
  });

  it('uses the supplied fallback as the correct free rung per track', () => {
    // The organization ladder's free rung is org_free, not free.
    expect(resolveTierForStatus('canceled', 'org_pro', 'org_free')).toBe('org_free');
  });
});