import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkoutErrorKind,
  checkoutErrorMessage,
  CHECKOUT_ERROR_COPY,
  type CheckoutErrorKind,
} from '@/lib/checkout-error-message';

// Raw internal codes and implementation details that must never reach a customer.
const FORBIDDEN = [
  'invalid_tier', 'tier_not_configured', 'downgrade_not_self_serve', 'enterprise_contact_sales',
  'stripe_not_configured', 'profile_lookup_failed', 'rate_limited', 'invalid_json',
  'STRIPE', 'env', 'Vercel', 'VERCEL', 'stack', 'Error:', '_', 'undefined', 'null',
];

describe('checkout error kinds: each known backend error maps to its own message', () => {
  it('invalid_tier -> plan unavailable', () => {
    expect(checkoutErrorKind({ code: 'invalid_tier', status: 400 })).toBe('plan_unavailable');
  });

  it('tier_not_configured -> plan unavailable (no env-var instructions shown)', () => {
    expect(checkoutErrorKind({ code: 'tier_not_configured', status: 503 })).toBe('plan_unavailable');
  });

  it('downgrade_not_self_serve -> downgrade (directs to support)', () => {
    expect(checkoutErrorKind({ code: 'downgrade_not_self_serve', status: 403 })).toBe('downgrade');
  });

  it('enterprise_contact_sales -> enterprise (sales contact, not a redirect)', () => {
    expect(checkoutErrorKind({ code: 'enterprise_contact_sales', status: 303 })).toBe('enterprise');
  });

  it('rate_limited code -> rate limited', () => {
    expect(checkoutErrorKind({ code: 'rate_limited', status: 429 })).toBe('rate_limited');
  });

  it('plain-text 429 from the middleware (no JSON body) -> rate limited', () => {
    expect(checkoutErrorKind({ status: 429 })).toBe('rate_limited');
  });

  it('stripe_not_configured -> temporary unavailable', () => {
    expect(checkoutErrorKind({ code: 'stripe_not_configured', status: 503 })).toBe('unavailable');
  });

  it('profile_lookup_failed -> temporary unavailable', () => {
    expect(checkoutErrorKind({ code: 'profile_lookup_failed', status: 500 })).toBe('unavailable');
  });

  it('bare 503 with no code -> temporary unavailable', () => {
    expect(checkoutErrorKind({ status: 503 })).toBe('unavailable');
  });

  it('any other 5xx -> temporary unavailable', () => {
    expect(checkoutErrorKind({ status: 502 })).toBe('unavailable');
  });

  it('network failure (no response) -> network', () => {
    expect(checkoutErrorKind({ network: true })).toBe('network');
  });
});

describe('checkout error fallback: unknown or malformed signals', () => {
  it('an unrecognized code -> unknown fallback', () => {
    expect(checkoutErrorKind({ code: 'something_new', status: 400 })).toBe('unknown');
  });

  it('invalid_json (should not happen from our client) -> unknown fallback', () => {
    expect(checkoutErrorKind({ code: 'invalid_json', status: 400 })).toBe('unknown');
  });

  it('a non-string code is ignored -> unknown fallback', () => {
    expect(checkoutErrorKind({ code: { nested: 'x' }, status: 400 })).toBe('unknown');
    expect(checkoutErrorKind({ code: 42, status: 400 })).toBe('unknown');
  });

  it('no code and no status -> unknown fallback', () => {
    expect(checkoutErrorKind({})).toBe('unknown');
  });

  it('a 200-range response with no URL -> unknown fallback', () => {
    expect(checkoutErrorKind({ status: 200 })).toBe('unknown');
  });

  it('checkoutErrorMessage returns the fallback copy for unknown input', () => {
    expect(checkoutErrorMessage({ code: 'mystery', status: 400 })).toBe(CHECKOUT_ERROR_COPY.unknown);
  });
});

describe('checkout error copy: every kind has a clear, safe message', () => {
  const kinds: CheckoutErrorKind[] = [
    'plan_unavailable', 'downgrade', 'enterprise', 'rate_limited', 'unavailable', 'network', 'unknown',
  ];

  for (const kind of kinds) {
    it(`${kind}: non-empty, concise, and free of raw codes or internals`, () => {
      const msg = CHECKOUT_ERROR_COPY[kind];
      expect(msg.length).toBeGreaterThan(20);
      expect(msg.length).toBeLessThan(220);
      for (const bad of FORBIDDEN) {
        expect(msg.includes(bad)).toBe(false);
      }
    });

    it(`${kind}: does not claim a payment succeeded or failed`, () => {
      const msg = CHECKOUT_ERROR_COPY[kind].toLowerCase();
      expect(msg).not.toMatch(/payment (was )?(successful|succeeded|failed|declined)|you (were|have been) charged|charge (was|has)/);
    });
  }

  it('plan_unavailable and downgrade direct the user to support', () => {
    expect(CHECKOUT_ERROR_COPY.plan_unavailable).toContain('support@rinkstop.com');
    expect(CHECKOUT_ERROR_COPY.downgrade).toContain('support@rinkstop.com');
  });

  it('rate_limited asks the user to wait briefly and retry', () => {
    expect(CHECKOUT_ERROR_COPY.rate_limited).toMatch(/wait/i);
    expect(CHECKOUT_ERROR_COPY.rate_limited).toMatch(/try again/i);
  });

  it('unavailable and network invite a retry', () => {
    expect(CHECKOUT_ERROR_COPY.unavailable).toMatch(/try again/i);
    expect(CHECKOUT_ERROR_COPY.network).toMatch(/try again/i);
  });
});

describe('PricingContent wiring: raw backend errors are no longer shown to customers', () => {
  const src = readFileSync(join(process.cwd(), 'src/app/pricing/PricingContent.tsx'), 'utf8');

  it('does not display data.error directly', () => {
    expect(src).not.toMatch(/setError\(data\.error/);
  });

  it('uses the checkout error mapping for response errors and network failures', () => {
    expect(src).toMatch(/checkoutErrorMessage\(\{ code: data\?\.error, status: res\.status \}\)/);
    expect(src).toMatch(/checkoutErrorMessage\(\{ network: true \}\)/);
  });

  it('parses the response body defensively so a plain-text 429 is not a "network error"', () => {
    expect(src).toMatch(/res\.json\(\)\.catch\(\(\): null => null\)/);
  });

  it('keeps the checkout request and redirect behavior unchanged', () => {
    expect(src).toMatch(/fetch\('\/api\/tier\/upgrade', \{/);
    expect(src).toMatch(/window\.location\.href = data\.url;/);
  });
});
