// Tests for the API-key verification added 2026-10-22.
//
// Context: Club Elite advertises "API access" at $999/year. Keys could be
// issued, but /api/v1/org/* never verified them — the routes documented
// `x-api-key` auth in their headers while only checking `is_published`.
// These tests cover the pure extraction/format helpers and the guarantee that
// a presented key is always resolved through verification, never trusted.

import { describe, it, expect } from 'vitest';
import { extractPresentedKey, apiKeyUnauthorized } from '@/lib/api-keys';

function req(headers: Record<string, string>): Request {
  return new Request('https://rinkstop.com/api/v1/org/abc', { headers });
}

describe('api keys — extracting the presented key', () => {
  it('reads the canonical x-api-key header', () => {
    expect(extractPresentedKey(req({ 'x-api-key': 'rs_live_ABC' }))).toBe('rs_live_ABC');
  });

  it('falls back to an Authorization: Bearer header', () => {
    expect(extractPresentedKey(req({ authorization: 'Bearer rs_live_XYZ' }))).toBe('rs_live_XYZ');
  });

  it('is case-insensitive on the bearer scheme', () => {
    expect(extractPresentedKey(req({ authorization: 'bearer rs_live_XYZ' }))).toBe('rs_live_XYZ');
  });

  it('prefers x-api-key when both are present', () => {
    expect(
      extractPresentedKey(req({ 'x-api-key': 'rs_live_HEADER', authorization: 'Bearer rs_live_BEARER' })),
    ).toBe('rs_live_HEADER');
  });

  it('returns null when nothing is presented', () => {
    expect(extractPresentedKey(req({}))).toBeNull();
  });

  it('returns null for a non-bearer Authorization scheme', () => {
    expect(extractPresentedKey(req({ authorization: 'Basic dXNlcjpwYXNz' }))).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(extractPresentedKey(req({ 'x-api-key': '  rs_live_TRIM  ' }))).toBe('rs_live_TRIM');
  });
});

describe('api keys — unauthorized responses', () => {
  it('returns 401 with a WWW-Authenticate challenge header', () => {
    const res = apiKeyUnauthorized('invalid');
    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toBe('Bearer');
  });

  it('does not reveal which part of the credential was wrong', async () => {
    // The body must be byte-identical for every failure mode — otherwise an
    // attacker can distinguish "no key" from "wrong key" from "revoked key"
    // and enumerate valid key prefixes.
    const body = async (reason: 'missing' | 'malformed' | 'invalid' | 'revoked') => {
      const res = apiKeyUnauthorized(reason);
      return JSON.stringify(await res.json());
    };
    const bodies = await Promise.all([
      body('missing'), body('malformed'), body('invalid'), body('revoked'),
    ]);
    expect(new Set(bodies).size).toBe(1);
    expect(bodies[0]).not.toContain('missing');
    expect(bodies[0]).not.toContain('invalid');
    expect(bodies[0]).not.toContain('revoked');
    expect(bodies[0]).not.toContain('malformed');
  });
});

describe('api keys — routes must not read is_published in place of verification', () => {
  // Guard against the original bug regressing. These are structural
  // assertions on the source, not runtime tests, because the real proof is
  // the 401 response which needs a live Supabase + issued key.
  it('both /api/v1 routes call verifyOrgApiKey', async () => {
    const { readFileSync } = await import('node:fs');
    const routes = [
      'src/app/api/v1/org/[id]/route.ts',
      'src/app/api/v1/org/[id]/players/route.ts',
    ];
    for (const route of routes) {
      const src = readFileSync(route, 'utf8');
      expect(src, `${route} must verify the API key`).toContain('verifyOrgApiKey');
      expect(src, `${route} must extract the presented key`).toContain('extractPresentedKey');
      expect(src, `${route} must reject unauthorized callers`).toContain('apiKeyUnauthorized');
    }
  });
});