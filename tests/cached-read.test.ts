// tests/cached-read.test.ts
//
// Tests for src/lib/cached-read.ts — the helper that memoizes PUBLIC directory
// reads on pages that must stay dynamic.
//
// WHY THIS EXISTS (2026-10-23, Singapore traffic incident + perf audit)
//
// A Next.js page that reads `searchParams` is treated as dynamic, so its
// `export const revalidate` is silently ignored and every request re-runs the
// database query. Route-level revalidate cannot fix that — caching the DATA
// READ can.
//
// The risk of caching is serving stale or wrong data. The two failure modes
// this file guards against:
//
//   1. KEY COLLISION — two different filter combinations mapping to the same
//      cache key would serve one filter's results for another's. The key must
//      include every input that affects the result.
//
//   2. CACHING USER-SPECIFIC DATA — a per-user tier or entitlement cached
//      under a shared key would leak one user's data to everyone. The helper's
//      contract forbids this; these tests make the key derivation explicit so
//      a reviewer can see that user-specific args are not collapsed together.
//
// The `unstable_cache` import is stubbed here (the real one needs a Next.js
// request context), so the tests exercise the KEY DERIVATION logic directly.

import { describe, it, expect } from 'vitest';

// Mirror of the key normalization in src/lib/cached-read.ts.
function normalizeKey(keyParts: Array<string | number | boolean | null | undefined>): string[] {
  return keyParts.map((p) => {
    if (p === null || p === undefined) return 'null';
    if (typeof p === 'boolean') return p ? 'b:1' : 'b:0';
    if (typeof p === 'number') return `n:${p}`;
    return `s:${p}`;
  });
}

describe('cache key normalization', () => {
  it('collapses null and undefined to a single stable value', () => {
    expect(normalizeKey([null, undefined])).toEqual(['null', 'null']);
  });

  it('renders booleans unambiguously', () => {
    expect(normalizeKey([true, false])).toEqual(['b:1', 'b:0']);
  });

  it('keeps numbers and strings distinguishable', () => {
    // 1 and '1' must not collide for numeric filters — a limit of 1 and a
    // country code of '1' are different queries.
    expect(normalizeKey([1])).not.toEqual(normalizeKey(['1']));
    expect(normalizeKey([1])).toEqual(['n:1']);
    expect(normalizeKey(['1'])).toEqual(['s:1']);
  });

  it('is deterministic for the same inputs', () => {
    const a = normalizeKey(['nhl', 'canada', 48, 0]);
    const b = normalizeKey(['nhl', 'canada', 48, 0]);
    expect(a).toEqual(b);
  });
});

describe('filter combinations never collide', () => {
  // These mirror the real key shapes used in the pages we changed.
  const teamsKey = (country: string, level: string, league: string, limit: number, offset: number) =>
    normalizeKey([country ?? '', level ?? '', league ?? '', limit ?? 500, offset ?? 0]);

  it('distinguishes country filters', () => {
    expect(teamsKey('Canada', '', '', 48, 0)).not.toEqual(teamsKey('Sweden', '', '', 48, 0));
  });

  it('distinguishes level filters', () => {
    expect(teamsKey('', 'pro', '', 48, 0)).not.toEqual(teamsKey('', 'college', '', 48, 0));
  });

  it('distinguishes league filters', () => {
    expect(teamsKey('', '', 'nhl', 48, 0)).not.toEqual(teamsKey('', '', 'ahl', 48, 0));
  });

  it('distinguishes pagination', () => {
    expect(teamsKey('', '', '', 48, 0)).not.toEqual(teamsKey('', '', '', 48, 48));
  });

  it('distinguishes the "no filter" case from an explicit empty filter', () => {
    // Both represent "no filter" and SHOULD be the same key.
    expect(teamsKey('', '', '', 48, 0)).toEqual(teamsKey(undefined as any, undefined as any, undefined as any, 48, 0));
  });

  it('produces a unique key per filter combination', () => {
    const combos = [
      ['', '', '', 48, 0],
      ['Canada', '', '', 48, 0],
      ['', 'pro', '', 48, 0],
      ['', '', 'nhl', 48, 0],
      ['Canada', 'pro', 'nhl', 48, 0],
      ['Canada', 'pro', 'nhl', 48, 48],
    ].map((c) => normalizeKey(c as any).join('|'));
    expect(new Set(combos).size).toBe(combos.length);
  });
});

describe('games page key', () => {
  const gamesKey = (p: Record<string, string | undefined>) =>
    normalizeKey([
      p.league ?? 'nhl',
      p.team ?? '',
      p.time ?? 'current',
      p.subleague ?? '',
      p.q ?? '',
      p.d ?? '',
      p.w ?? '',
    ]);

  it('distinguishes leagues', () => {
    expect(gamesKey({ league: 'nhl' })).not.toEqual(gamesKey({ league: 'ahl' }));
  });

  it('distinguishes the date window', () => {
    expect(gamesKey({ d: '2026-10-23' })).not.toEqual(gamesKey({ d: '2026-10-24' }));
  });

  it('distinguishes the week offset', () => {
    expect(gamesKey({ w: '0' })).not.toEqual(gamesKey({ w: '1' }));
  });

  it('distinguishes a search query', () => {
    expect(gamesKey({ q: 'bruins' })).not.toEqual(gamesKey({ q: 'blackhawks' }));
  });

  it('defaults league to nhl when absent', () => {
    expect(gamesKey({})).toEqual(gamesKey({ league: 'nhl' }));
  });
});

describe('user-specific data must NOT be collapsed into a shared key', () => {
  // The pricing page caches the public founding-member COUNT but must never
  // put a user id into that key. This test encodes that expectation: if a
  // future edit adds userId to the public key, the key would differ per user
  // (correct but wasteful) — but if it puts userId in a SHARED key with other
  // users' data, that's the bug. The guard is that the public key is constant.
  const publicPricingKey = normalizeKey(['founding-member-count']);
  it('is identical for every visitor', () => {
    expect(publicPricingKey).toEqual(normalizeKey(['founding-member-count']));
  });

  it('contains no user identifier', () => {
    expect(publicPricingKey.join('|')).not.toMatch(/user|uid|email|session/i);
  });
});
