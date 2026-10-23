// tests/middleware-rate-limit.test.ts
//
// Regression tests for the two rate-limit layers in src/middleware.ts,
// added after the 2026-10-23 Singapore traffic incident.
//
// The incident: GA4 measured 74,971 Singapore users hitting
// /directory/nhl/schedule on a single day (77,528 sessions, 99.7% bounce,
// 4.17s average duration — a scraper, not an audience). The page was serving
// `cache-control: private, no-cache, no-store` with `x-vercel-cache: MISS`
// on every request, so each hit re-rendered and re-queried Supabase.
//
// The structural gap the incident exposed: the pre-existing limiter was
// keyed by IP ONLY. A scraper with an IP pool spreads requests across IPs
// and stays under the per-IP cap forever. That is why the per-IP limiter
// did not stop it, and why a global (all-IP) per-path cap was added.
//
// The logic is duplicated here rather than imported because src/middleware.ts
// is a Next.js edge entrypoint with a default export and no test surface.
// If you change the rules in the middleware, change them here too.

import { describe, it, expect } from 'vitest';

// --- mirror of the constants in src/middleware.ts ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 100;
const TRUSTED_RATE_LIMIT_MAX = 1000;
const DATA_RATE_LIMIT_MAX = 30;
const GLOBAL_PATH_LIMIT_MAX = 600;

const GLOBAL_PATH_LIMIT_PREFIXES = [
  '/directory/nhl/schedule',
  '/directory/games',
  '/sign-up',
  '/login',
  '/claim-your-listing',
  '/ice-rinks-near-me',
];

const BULK_DATA_PATH_PREFIXES = [
  '/api/rinks',
  '/api/teams',
  '/api/players',
  '/api/leagues',
  '/rest/v1/',
  '/api/directory',
  '/api/data',
];

function getGlobalLimitedPath(path: string): string | null {
  for (const p of GLOBAL_PATH_LIMIT_PREFIXES) {
    if (path === p || path.startsWith(p + '/') || path.startsWith(p)) return p;
  }
  return null;
}

function isBulkDataPath(path: string): boolean {
  return BULK_DATA_PATH_PREFIXES.some(
    (p) => path === p || path.startsWith(p + '/') || path.startsWith(p),
  );
}

// per-IP limiter
function checkRateLimit(
  ip: string,
  map: Map<string, { count: number; windowStart: number }>,
  max: number,
  now = Date.now(),
) {
  const record = map.get(ip);
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    map.set(ip, { count: 1, windowStart: now });
    return { blocked: false, limit: max, remaining: max - 1 };
  }
  if (record.count >= max) {
    return { blocked: true, limit: max, remaining: 0 };
  }
  record.count++;
  return { blocked: false, limit: max, remaining: max - record.count };
}

// global per-path limiter
function checkGlobalPathRateLimit(
  path: string,
  map: Map<string, { count: number; windowStart: number }>,
  now = Date.now(),
) {
  const key = getGlobalLimitedPath(path)!;
  const record = map.get(key);
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    map.set(key, { count: 1, windowStart: now });
    return { blocked: false, limit: GLOBAL_PATH_LIMIT_MAX, remaining: GLOBAL_PATH_LIMIT_MAX - 1 };
  }
  if (record.count >= GLOBAL_PATH_LIMIT_MAX) {
    return { blocked: true, limit: GLOBAL_PATH_LIMIT_MAX, remaining: 0 };
  }
  record.count++;
  return { blocked: false, limit: GLOBAL_PATH_LIMIT_MAX, remaining: GLOBAL_PATH_LIMIT_MAX - record.count };
}

describe('global per-path rate limit (added 2026-10-23)', () => {
  it('caps a path across ALL IPs — the gap that let the Singapore burst through', () => {
    const map = new Map<string, { count: number; windowStart: number }>();
    // Simulate a scraper distributing 700 requests over 700 distinct IPs.
    // Per-IP limiter: every IP is under the cap, so nothing is blocked.
    const ipMap = new Map<string, { count: number; windowStart: number }>();
    let ipBlocked = 0;
    let globalBlocked = 0;
    for (let i = 0; i < 700; i++) {
      const ip = `10.0.${Math.floor(i / 256)}.${i % 256}`;
      if (checkRateLimit(ip, ipMap, RATE_LIMIT_MAX).blocked) ipBlocked++;
      if (checkGlobalPathRateLimit('/directory/nhl/schedule', map).blocked) globalBlocked++;
    }
    // The per-IP limiter blocked nothing — this is exactly why it failed.
    expect(ipBlocked).toBe(0);
    // The global limiter cut the flood off at the cap.
    expect(globalBlocked).toBe(700 - GLOBAL_PATH_LIMIT_MAX);
  });

  it('does not block normal human traffic on a limited path', () => {
    const map = new Map<string, { count: number; windowStart: number }>();
    for (let i = 0; i < 50; i++) {
      expect(checkGlobalPathRateLimit('/directory/nhl/schedule', map).blocked).toBe(false);
    }
  });

  it('does NOT apply to pages we want indexed', () => {
    const map = new Map<string, { count: number; windowStart: number }>();
    for (const p of [
      '/news/nhl-shortened-preseason-2026-27',
      '/directory/rinks/ice-arena-adelaide-o-brien-ice-arena',
      '/learn/cost-by-age',
      '/directory/teams/detroit-red-wings',
      '/guides/hockey-rules',
      '/sitemap.xml',
      '/robots.txt',
    ]) {
      expect(getGlobalLimitedPath(p)).toBeNull();
    }
    // 5000 requests to a non-limited path must never trip anything.
    for (let i = 0; i < 5000; i++) {
      expect(getGlobalLimitedPath('/news/some-article')).toBeNull();
    }
  });

  it('matches the limited path with query strings and sub-paths', () => {
    expect(getGlobalLimitedPath('/directory/nhl/schedule')).toBe('/directory/nhl/schedule');
    expect(getGlobalLimitedPath('/directory/nhl/schedule/2026-10-22')).toBe('/directory/nhl/schedule');
    expect(getGlobalLimitedPath('/sign-up')).toBe('/sign-up');
    expect(getGlobalLimitedPath('/login')).toBe('/login');
  });

  it('resets the window after it expires', () => {
    const map = new Map<string, { count: number; windowStart: number }>();
    const t0 = 1_000_000;
    for (let i = 0; i < GLOBAL_PATH_LIMIT_MAX; i++) {
      expect(checkGlobalPathRateLimit('/login', map, t0).blocked).toBe(false);
    }
    expect(checkGlobalPathRateLimit('/login', map, t0).blocked).toBe(true);
    // Next window: fresh counter.
    expect(checkGlobalPathRateLimit('/login', map, t0 + RATE_LIMIT_WINDOW_MS + 1).blocked).toBe(false);
  });
});

describe('bulk data prefixes', () => {
  it('caps /api/data — the 5.5MB dataset export was previously uncapped', () => {
    expect(isBulkDataPath('/api/data')).toBe(true);
    expect(isBulkDataPath('/api/data/dataset')).toBe(true);
    expect(isBulkDataPath('/api/data/dataset?format=json')).toBe(true);
  });

  it('still caps the pre-existing bulk prefixes', () => {
    for (const p of [
      '/api/rinks',
      '/api/teams',
      '/api/players',
      '/api/leagues',
      '/api/directory',
      '/rest/v1/rinks',
    ]) {
      expect(isBulkDataPath(p)).toBe(true);
    }
  });

  it('does not treat ordinary pages as bulk data', () => {
    for (const p of [
      '/directory/nhl/schedule',
      '/directory/rinks/ice-arena',
      '/news/some-article',
      '/learn/cost-by-age',
    ]) {
      expect(isBulkDataPath(p)).toBe(false);
    }
  });

  it('keeps the bulk tier tighter than the normal tier', () => {
    expect(DATA_RATE_LIMIT_MAX).toBeLessThan(RATE_LIMIT_MAX);
    expect(RATE_LIMIT_MAX).toBeLessThan(TRUSTED_RATE_LIMIT_MAX);
  });
});
