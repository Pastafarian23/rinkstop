// tests/request-logger.test.ts
//
// Tests for src/lib/request-logger.ts — the abuse-forensics request logger
// added 2026-10-23 after the Singapore traffic incident.
//
// The incident taught two lessons that this module has to hold onto:
//
//   1. Vercel's runtime logs carry NO ip and NO userAgent, and roll over within
//      minutes. So identity has to be logged by us, on the paths that attract abuse.
//   2. A logger that captures identity must NOT become a privacy liability. The
//      privacy contract is enforced here: no cookies, no auth headers, no query
//      strings, no raw user content.

import { describe, it, expect } from 'vitest';
import {
  buildLogLine,
  extractIp,
  isTrackedPath,
  sanitizeUa,
  shouldLogIdentity,
} from '../src/lib/request-logger';

describe('isTrackedPath', () => {
  it('tracks the paths that actually attract abuse', () => {
    for (const p of [
      '/directory/nhl/schedule',
      '/directory/games',
      '/sign-up',
      '/login',
      '/claim-your-listing',
      '/ice-rinks-near-me',
      '/api/data',
      '/api/data/dataset',
      '/api/rinks',
      '/rest/v1/rinks',
    ]) {
      expect(isTrackedPath(p)).toBe(true);
    }
  });

  it('does NOT track ordinary content pages (privacy + cost)', () => {
    for (const p of [
      '/',
      '/news/some-article',
      '/directory/rinks/ice-arena-adelaide-o-brien-ice-arena',
      '/learn/cost-by-age',
      '/guides/hockey-rules',
      '/sitemap.xml',
    ]) {
      expect(isTrackedPath(p)).toBe(false);
    }
  });
});

describe('shouldLogIdentity', () => {
  it('ALWAYS logs a blocked request', () => {
    for (let i = 0; i < 100; i++) {
      expect(shouldLogIdentity({ ipSeenBefore: true, isBlocked: true, sampleRate: 0 })).toBe(true);
    }
  });

  it('ALWAYS logs the first request from an IP', () => {
    for (let i = 0; i < 100; i++) {
      expect(shouldLogIdentity({ ipSeenBefore: false, isBlocked: false, sampleRate: 0 })).toBe(true);
    }
  });

  it('samples repeat requests from a known IP', () => {
    // With a 2% rate, roughly 2 of 100 repeat requests should log.
    let logged = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      if (shouldLogIdentity({ ipSeenBefore: true, isBlocked: false, sampleRate: 0.02 })) logged++;
    }
    const rate = logged / trials;
    expect(rate).toBeGreaterThan(0.005);
    expect(rate).toBeLessThan(0.04);
  });

  it('never logs a repeat request when sampleRate is 0', () => {
    for (let i = 0; i < 500; i++) {
      expect(shouldLogIdentity({ ipSeenBefore: true, isBlocked: false, sampleRate: 0 })).toBe(false);
    }
  });
});

describe('extractIp', () => {
  it('prefers the request.ip when present', () => {
    const h = new Headers();
    h.set('x-forwarded-for', '1.2.3.4');
    expect(extractIp({ headers: h, ip: '9.9.9.9' })).toBe('9.9.9.9');
  });

  it('takes the FIRST x-forwarded-for entry (the real client)', () => {
    const h = new Headers();
    h.set('x-forwarded-for', '203.0.113.7, 10.0.0.1, 10.0.0.2');
    expect(extractIp({ headers: h })).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip', () => {
    const h = new Headers();
    h.set('x-real-ip', '198.51.100.4');
    expect(extractIp({ headers: h })).toBe('198.51.100.4');
  });

  it('returns unknown when nothing is available', () => {
    expect(extractIp({ headers: new Headers() })).toBe('unknown');
  });
});

describe('sanitizeUa', () => {
  it('handles a missing user agent', () => {
    expect(sanitizeUa(null)).toBe('none');
    expect(sanitizeUa('')).toBe('none');
  });

  it('strips newlines so a crafted UA cannot forge extra log lines', () => {
    const hostile = 'Mozilla/5.0\n{"ev":"rl","ip":"1.1.1.1"}';
    const out = sanitizeUa(hostile);
    expect(out).not.toContain('\n');
    expect(out).not.toContain('\r');
    // The JSON-injection payload must not survive as valid JSON on its own line.
    expect(out.split('\n').length).toBe(1);
  });

  it('truncates a very long UA', () => {
    const long = 'x'.repeat(5000);
    expect(sanitizeUa(long).length).toBe(200);
  });

  it('keeps a normal UA intact', () => {
    const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
    expect(sanitizeUa(ua)).toBe(ua);
  });
});

describe('buildLogLine', () => {
  it('produces parseable JSON with the expected fields', () => {
    const line = buildLogLine({
      path: '/directory/nhl/schedule',
      method: 'GET',
      status: 429,
      ip: '203.0.113.7',
      ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)',
      ms: 12,
      claimedBot: true,
      limited: true,
      tier: 'global',
    });
    const parsed = JSON.parse(line);
    expect(parsed.ev).toBe('rl');
    expect(parsed.path).toBe('/directory/nhl/schedule');
    expect(parsed.status).toBe(429);
    expect(parsed.ip).toBe('203.0.113.7');
    expect(parsed.claimedBot).toBe(true);
    expect(parsed.tier).toBe('global');
    expect(typeof parsed.ts).toBe('string');
  });

  it('PRIVACY: never includes a query string', () => {
    const line = buildLogLine({
      path: '/sign-up',
      method: 'GET',
      status: 200,
      ip: '1.2.3.4',
      ua: 'test',
      ms: 1,
      claimedBot: false,
      limited: false,
      tier: 'normal',
    });
    // The path field is the only place a query could leak in, and it must be bare.
    expect(line).not.toContain('?');
    expect(JSON.parse(line).path).toBe('/sign-up');
  });

  it('PRIVACY: no cookie or authorization field can appear', () => {
    const line = buildLogLine({
      path: '/login',
      method: 'GET',
      status: 200,
      ip: '1.2.3.4',
      ua: 'test',
      ms: 1,
      claimedBot: false,
      limited: false,
      tier: 'normal',
    });
    const keys = Object.keys(JSON.parse(line));
    for (const forbidden of ['cookie', 'cookies', 'authorization', 'headers', 'body', 'token', 'session']) {
      expect(keys).not.toContain(forbidden);
    }
  });
});
