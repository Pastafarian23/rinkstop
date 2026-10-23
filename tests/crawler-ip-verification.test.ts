// tests/crawler-ip-verification.test.ts
//
// Tests for src/lib/crawler-ip-verification.ts — verification that a request
// claiming to be Googlebot/Bingbot actually came from that crawler's published
// IP ranges.
//
// WHY THIS MATTERS (2026-10-23, Singapore traffic incident)
//
// The middleware granted a 10x rate-limit tier (1000/min/IP vs 100) to any
// request whose User-Agent merely CONTAINED "Googlebot". That string is just
// text a client types, so the "high trust" bucket was a free 10x allowance for
// anyone who wanted one. This module is what makes the tier earned.
//
// The tests below cover the matching logic against REAL published data, plus
// the adversarial cases (spoofed UA from a non-Google IP, IPv6, IPv4-mapped
// IPv6, malformed input).

import { describe, it, expect } from 'vitest';
import {
  ipToBigInt,
  parseCidr,
  ipInRange,
  parseCrawlerList,
  parseGoogleList,
  sanitizeListPayload,
  isVerifiedGoogleIp,
  isVerifiedBingIp,
  type CrawlerIpLists,
} from '../src/lib/crawler-ip-verification';

describe('ipToBigInt', () => {
  it('parses IPv4', () => {
    const r = ipToBigInt('192.178.4.1');
    expect(r).not.toBeNull();
    expect(r!.bits).toBe(32);
    expect(r!.v6).toBe(false);
    expect(r!.value).toBe(3232891905n);
  });

  it('rejects malformed IPv4', () => {
    for (const bad of ['1.2.3', '1.2.3.4.5', '256.1.1.1', 'a.b.c.d', '', '1.2.3.4/24']) {
      expect(ipToBigInt(bad)).toBeNull();
    }
  });

  it('parses IPv6 including :: compression', () => {
    const a = ipToBigInt('2001:4860:4801:10::1');
    const b = ipToBigInt('2001:4860:4801:0010:0000:0000:0000:0001');
    expect(a).not.toBeNull();
    expect(a!.v6).toBe(true);
    expect(a!.bits).toBe(128);
    expect(a!.value).toBe(b!.value);
  });

  it('parses IPv4-mapped IPv6', () => {
    const r = ipToBigInt('::ffff:192.0.2.1');
    expect(r).not.toBeNull();
    expect(r!.v6).toBe(true);
    expect(r!.bits).toBe(128);
    // The low 32 bits carry the IPv4 address.
    expect(r!.value & 0xffffffffn).toBe(3221225985n);
  });

  it('rejects malformed IPv6', () => {
    for (const bad of ['2001:::1', 'gggg::1', '1:2:3:4:5:6:7:8:9', '']) {
      expect(ipToBigInt(bad)).toBeNull();
    }
  });
});

describe('parseCidr', () => {
  it('parses an IPv4 range and zeroes host bits', () => {
    const r = parseCidr('192.178.4.0/27');
    expect(r).not.toBeNull();
    expect(r!.bits).toBe(32);
    expect(r!.v6).toBe(false);
    // /27 => last 5 bits are host bits, so the network ends in .0
    expect(r!.network & 0xffffffffn & 0x1fn).toBe(0n);
  });

  it('parses a full-length range', () => {
    const r = parseCidr('1.2.3.4/32');
    expect(r).not.toBeNull();
    expect(r!.network).toBe(ipToBigInt('1.2.3.4')!.value);
  });

  it('parses a /0 range', () => {
    const r = parseCidr('0.0.0.0/0');
    expect(r).not.toBeNull();
    expect(r!.network).toBe(0n);
  });

  it('rejects malformed CIDR', () => {
    for (const bad of ['192.178.4.0', '192.178.4.0/33', '192.178.4.0/abc', 'not-a-cidr/24', '2001:db8::/200']) {
      expect(parseCidr(bad)).toBeNull();
    }
  });
});

describe('ipInRange', () => {
  const range = parseCidr('192.178.4.0/27')!;

  it('matches an address inside the range', () => {
    expect(ipInRange('192.178.4.5', range)).toBe(true);
    expect(ipInRange('192.178.4.31', range)).toBe(true);
  });

  it('rejects an address outside the range', () => {
    expect(ipInRange('192.178.4.32', range)).toBe(false);
    expect(ipInRange('192.178.5.5', range)).toBe(false);
    expect(ipInRange('8.8.8.8', range)).toBe(false);
  });

  it('does not match an IPv4 address against an IPv6 range', () => {
    const v6Range = parseCidr('2001:4860:4801:10::/64')!;
    expect(ipInRange('192.178.4.5', v6Range)).toBe(false);
    expect(ipInRange('2001:4860:4801:10::1', v6Range)).toBe(true);
    expect(ipInRange('2001:4860:4801:11::1', v6Range)).toBe(false);
  });

  it('handles a malformed IP safely', () => {
    expect(ipInRange('not-an-ip', range)).toBe(false);
  });
});

describe('sanitizeListPayload', () => {
  it('strips zero-width characters from Bing prefixes', () => {
    // Bing's published file has contained U+200B in some prefixes since 2022-11-02.
    const raw = '{"prefixes":[{"ipv4Prefix":"13.66.139.0/24"},{"ipv4Prefix":"207.46.13.0/24"}]}';
    const clean = sanitizeListPayload(raw);
    // The sanitized payload must still parse and keep every prefix intact.
    const parsed = JSON.parse(clean);
    expect(parsed.prefixes.length).toBe(2);
    expect(parsed.prefixes[0].ipv4Prefix).toBe('13.66.139.0/24');
    expect(parsed.prefixes[1].ipv4Prefix).toBe('207.46.13.0/24');
  });
});

describe('parseCrawlerList / parseGoogleList', () => {
  it('parses the real Google list shape', () => {
    // Shape taken from the live common-crawlers.json (sample).
    const googleJson = {
      creationTime: '2026-10-23T14:45:59.000000',
      prefixes: [
        { ipv6Prefix: '2001:4860:4801:10::/64' },
        { ipv4Prefix: '192.178.4.0/27' },
        { ipv4Prefix: '66.249.64.0/19' },
      ],
    };
    const ranges = parseGoogleList(googleJson);
    expect(ranges.length).toBe(3);
    expect(ranges.filter((r) => r.v6).length).toBe(1);
    expect(ranges.filter((r) => !r.v6).length).toBe(2);
  });

  it('parses the real Bing list shape', () => {
    const bingJson = {
      creationTime: '2024-01-03T10:00:00.121331',
      prefixes: [
        { ipv4Prefix: '157.55.39.0/24' },
        { ipv4Prefix: '207.46.13.0/24' },
        { ipv4Prefix: '40.77.167.0/24' },
      ],
    };
    const ranges = parseCrawlerList(bingJson).bing;
    expect(ranges.length).toBe(3);
  });

  it('returns empty arrays for junk input rather than throwing', () => {
    expect(parseCrawlerList(null).bing).toEqual([]);
    expect(parseCrawlerList('a string').bing).toEqual([]);
    expect(parseCrawlerList({}).bing).toEqual([]);
    expect(parseCrawlerList({ prefixes: 'not an array' }).bing).toEqual([]);
    expect(parseGoogleList({ prefixes: [{ ipv4Prefix: 123 }] })).toEqual([]);
  });
});

describe('verification against REAL published ranges', () => {
  // Real Google prefixes, taken verbatim from the live
  // developers.google.com/static/crawling/ipranges/common-crawlers.json
  // (verified 2026-10-23). Note: Google publishes NARROW /27s for these, not
  // broad /16s — so a fixture using 172.217.0.0/16 would be testing a range
  // Google does not actually publish.
  const googleJson = {
    prefixes: [
      { ipv4Prefix: '192.178.4.0/27' },
      { ipv4Prefix: '192.178.4.128/27' },
      { ipv4Prefix: '66.249.64.0/27' },
      { ipv6Prefix: '2001:4860:4801:10::/64' },
    ],
  };
  // Real Bing prefixes (from bing.com/toolbox/bingbot.json)
  const bingJson = {
    prefixes: [
      { ipv4Prefix: '157.55.39.0/24' },
      { ipv4Prefix: '207.46.13.0/24' },
      { ipv4Prefix: '40.77.167.0/24' },
      { ipv4Prefix: '13.66.139.0/24' },
    ],
  };

  const lists: CrawlerIpLists = {
    google: parseGoogleList(googleJson),
    bing: parseCrawlerList(bingJson).bing,
    fetchedAt: Date.now(),
  };

  it('verifies a real Googlebot IP', () => {
    expect(isVerifiedGoogleIp('66.249.64.5', lists)).toBe(true);
    expect(isVerifiedGoogleIp('192.178.4.10', lists)).toBe(true);
    expect(isVerifiedGoogleIp('192.178.4.130', lists)).toBe(true);
  });

  it('verifies a real Bingbot IP', () => {
    expect(isVerifiedBingIp('157.55.39.50', lists)).toBe(true);
    expect(isVerifiedBingIp('40.77.167.10', lists)).toBe(true);
  });

  it('REJECTS a spoofed Googlebot from a non-Google IP — the actual attack', () => {
    // An AWS/Cloudflare scraper claiming to be Googlebot.
    expect(isVerifiedGoogleIp('3.88.2.219', lists)).toBe(false);
    expect(isVerifiedGoogleIp('52.233.104.1', lists)).toBe(false);
    expect(isVerifiedGoogleIp('104.16.0.1', lists)).toBe(false);
    // Our own test host.
    expect(isVerifiedGoogleIp('152.233.40.78', lists)).toBe(false);
  });

  it('REJECTS a spoofed Bingbot from a non-Bing IP', () => {
    expect(isVerifiedBingIp('3.88.2.219', lists)).toBe(false);
    expect(isVerifiedBingIp('152.233.40.78', lists)).toBe(false);
  });

  it('verifies IPv6 Googlebot', () => {
    expect(isVerifiedGoogleIp('2001:4860:4801:10::1', lists)).toBe(true);
    expect(isVerifiedGoogleIp('2001:4860:4801:11::1', lists)).toBe(false);
  });

  it('returns false when the lists are unavailable (fail-closed for verification)', () => {
    expect(isVerifiedGoogleIp('66.249.64.5', null)).toBe(false);
    expect(isVerifiedBingIp('157.55.39.50', null)).toBe(false);
  });
});
