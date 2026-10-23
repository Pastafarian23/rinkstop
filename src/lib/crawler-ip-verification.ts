// src/lib/crawler-ip-verification.ts
//
// Verifies that a request claiming to be a search-engine crawler ACTUALLY came from
// that crawler's published IP ranges.
//
// WHY THIS EXISTS (2026-10-23, Singapore traffic incident)
//
// `src/middleware.ts` grants a 10x rate-limit tier (1000 req/min/IP instead of 100)
// to any request whose User-Agent header merely CONTAINS the text "Googlebot",
// "bingbot", etc. That string is just text the client typed — anyone can send
// `User-Agent: Googlebot` in one line of code. So the "high trust" bucket was
// effectively a free 10x allowance for anyone who wanted one.
//
// This module closes that hole: before the higher tier is granted, check the
// source IP against the crawler's officially published ranges.
//
// SOURCES (official, maintained by the operators)
//   Google: https://developers.google.com/static/crawling/ipranges/common-crawlers.json
//   Bing:   https://www.bing.com/toolbox/bingbot.json
//
// NOTE on the Bing file: it has contained zero-width characters (U+200B) in some
// prefixes since 2022-11-02. They are stripped before parsing, otherwise those
// prefixes silently fail to match. (Documented by the PNP-MA ipranges-lisf-of-bots-ip
// project.) This is the same family of bug as the PostgREST `limit` cap — something
// that looks like it works and silently doesn't.
//
// FAIL-OPEN BY DESIGN
//
// If the published list cannot be fetched, we do NOT block the crawler. We fall back
// to the previous behaviour (trust the UA). Rationale: a network hiccup must never
// cost us Google/Bing rankings. The cost of fail-open is that a scraper gets the
// higher tier while the list is unavailable — a bounded, temporary window.
//
// EDGE RUNTIME NOTES
//
// This runs in the Vercel Edge runtime. The CIDR lists are fetched with a 2s timeout
// and cached in module scope for 24h. A module-scope cache survives between requests
// handled by the same isolate, which is exactly the granularity we want.

/** A single CIDR range, stored as an integer prefix for fast matching. */
export interface ParsedRange {
  /** BigInt of the network address (host bits zeroed). */
  network: bigint;
  /** The CIDR prefix length (e.g. 27 for a /27). This is the value that masks. */
  prefixBits: number;
  /** Total width of the address family (32 for IPv4, 128 for IPv6). */
  bits: number;
  /** Whether this is an IPv6 range. */
  v6: boolean;
}

export interface CrawlerIpLists {
  google: ParsedRange[];
  bing: ParsedRange[];
  /** Epoch ms when the lists were fetched. */
  fetchedAt: number;
}

/**
 * Google publishes separate lists for common crawlers, special-case crawlers
 * (AdsBot, Google-Read-Aloud) and user-triggered fetchers. Only the COMMON
 * crawlers list is used for the trusted tier, because:
 *   - common-crawlers.json covers Googlebot / Google-InspectionTool / AdsBot-google
 *   - user-triggered fetchers (Google-Site-Verifier, GoogleReadAloud) are NOT
 *     autonomous crawlers and should not get an elevated rate limit.
 */
const GOOGLE_LIST_URL =
  'https://developers.google.com/static/crawling/ipranges/common-crawlers.json';
const BING_LIST_URL = 'https://www.bing.com/toolbox/bingbot.json';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 2000;

// Module-scope cache. Survives across requests within the same edge isolate.
let cachedLists: CrawlerIpLists | null = null;
let cacheInFlight: Promise<CrawlerIpLists | null> | null = null;

/** Parse a dotted-quad or IPv6 string into a BigInt. Returns null if invalid. */
export function ipToBigInt(ip: string): { value: bigint; bits: number; v6: boolean } | null {
  const trimmed = ip.trim();
  if (!trimmed) return null;

  // IPv6 FIRST — including IPv4-mapped forms like ::ffff:1.2.3.4.
  //
  // Order matters: an IPv4-mapped IPv6 address contains BOTH ':' and '.'.
  // Testing for '.' first would send '::ffff:192.0.2.1' into the IPv4 branch,
  // where split('.') yields ['::ffff:192','0','2','1'] — 4 parts, so the length
  // check passes, but the first part fails the digits-only regex and the
  // function returns null. The IPv6 branch must be tried first.
  if (trimmed.includes(':')) {
    const normalized = expandIpv6(trimmed);
    if (!normalized) return null;
    let value = BigInt(0);
    for (const octet of normalized) {
      value = (value << BigInt(8)) | BigInt(octet);
    }
    return { value, bits: 128, v6: true };
  }

  // IPv4
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    if (parts.length !== 4) return null;
    let value = BigInt(0);
    for (const part of parts) {
      if (!/^\d{1,3}$/.test(part)) return null;
      const octet = Number(part);
      if (octet > 255) return null;
      value = (value << BigInt(8)) | BigInt(octet);
    }
    return { value, bits: 32, v6: false };
  }

  return null;
}

/** Expand an IPv6 string into 16 octets. Handles :: compression and IPv4 tails. */
function expandIpv6(ip: string): number[] | null {
  let address = ip;

  // Handle an embedded IPv4 tail (e.g. ::ffff:192.0.2.1)
  const lastColon = address.lastIndexOf(':');
  const tail = address.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = ipToBigInt(tail);
    // The tail MUST be an IPv4 address. `v4.v6` is false for IPv4, so the
    // correct guard is "reject if it is IPv6", not "reject if it is IPv4".
    // (Getting this backwards makes every IPv4-mapped IPv6 address parse as
    // null — including ::ffff:192.0.2.1.)
    if (!v4 || v4.v6) return null;
    const octets: number[] = [];
    for (let i = 3; i >= 0; i--) {
      octets.push(Number((v4.value >> BigInt(i * 8)) & BigInt(0xff)));
    }
    address = address.slice(0, lastColon + 1) +
      `${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
  }

  const doubleColonParts = address.split('::');
  if (doubleColonParts.length > 2) return null;

  const parseGroups = (s: string): number[] | null => {
    if (s === '') return [];
    const out: number[] = [];
    for (const group of s.split(':')) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
      const v = parseInt(group, 16);
      out.push((v >> 8) & 0xff, v & 0xff);
    }
    return out;
  };

  const head = parseGroups(doubleColonParts[0]);
  if (!head) return null;

  if (doubleColonParts.length === 1) {
    return head.length === 16 ? head : null;
  }

  const tailGroups = parseGroups(doubleColonParts[1]);
  if (!tailGroups) return null;

  const fill = 16 - head.length - tailGroups.length;
  if (fill < 0) return null;

  return [...head, ...new Array(fill).fill(0), ...tailGroups];
}

/** Parse a CIDR string ("192.178.4.0/27") into a ParsedRange. */
export function parseCidr(cidr: string): ParsedRange | null {
  const trimmed = cidr.trim();
  const slash = trimmed.lastIndexOf('/');
  if (slash === -1) return null;

  const ipPart = trimmed.slice(0, slash);
  const bitsPart = trimmed.slice(slash + 1);
  if (!/^\d{1,3}$/.test(bitsPart)) return null;

  const parsed = ipToBigInt(ipPart);
  if (!parsed) return null;

  const bits = Number(bitsPart);
  if (bits > parsed.bits) return null;

  // Zero out the host bits so the range matches on a network comparison.
  const mask = bits === 0
    ? BigInt(0)
    : ((BigInt(1) << BigInt(bits)) - BigInt(1)) << BigInt(parsed.bits - bits);
  const network = parsed.value & mask;

  return { network, prefixBits: bits, bits: parsed.bits, v6: parsed.v6 };
}

/**
 * Build the host-bit mask for a prefix length.
 * e.g. prefixBits=27, bits=32 -> 0xffffffe0
 */
function prefixMask(prefixBits: number, bits: number): bigint {
  if (prefixBits <= 0) return BigInt(0);
  return ((BigInt(1) << BigInt(prefixBits)) - BigInt(1)) << BigInt(bits - prefixBits);
}

/** Check whether an IP falls inside a parsed range. */
export function ipInRange(ip: string, range: ParsedRange): boolean {
  const parsed = ipToBigInt(ip);
  if (!parsed) return false;

  // An IPv4 address can never match an IPv6 range and vice versa.
  if (parsed.v6 !== range.v6) {
    // Handle IPv4-mapped IPv6 (::ffff:1.2.3.4) against IPv4 ranges.
    if (parsed.v6 && range.bits === 32) {
      const mapped = ipv4FromMapped(parsed.value);
      if (mapped === null) return false;
      return (mapped & prefixMask(range.prefixBits, range.bits)) === range.network;
    }
    return false;
  }

  return (parsed.value & prefixMask(range.prefixBits, range.bits)) === range.network;
}

/** Extract the low 32 bits from an IPv4-mapped IPv6 address. */
function ipv4FromMapped(value: bigint): bigint | null {
  // ::ffff:a.b.c.d  =>  the low 32 bits are the IPv4 address
  const mappedPrefix = BigInt(0xffff) << BigInt(32);
  if ((value >> BigInt(32)) !== mappedPrefix) return null;
  return value & BigInt(0xffffffff);
}

/** Parse a crawler IP-list JSON payload into ParsedRange arrays. */
export function parseCrawlerList(json: unknown): { google: ParsedRange[]; bing: ParsedRange[] } {
  const result = { google: [] as ParsedRange[], bing: [] as ParsedRange[] };
  if (!json || typeof json !== 'object') return result;

  const prefixes = (json as { prefixes?: unknown }).prefixes;
  if (!Array.isArray(prefixes)) return result;

  for (const entry of prefixes) {
    if (!entry || typeof entry !== 'object') continue;
    const v4 = (entry as { ipv4Prefix?: unknown }).ipv4Prefix;
    const v6 = (entry as { ipv6Prefix?: unknown }).ipv6Prefix;

    if (typeof v4 === 'string') {
      const parsed = parseCidr(v4);
      if (parsed) result.bing.push(parsed);
    } else if (typeof v6 === 'string') {
      const parsed = parseCidr(v6);
      if (parsed) result.bing.push(parsed);
    }
  }
  return result;
}

/** Parse the Google list (same shape as Bing's). */
export function parseGoogleList(json: unknown): ParsedRange[] {
  return parseCrawlerList(json).bing;
}

/** Strip non-printable characters (Bing's file contains zero-width chars). */
export function sanitizeListPayload(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[^\x20-\x7E\n\r\t]/g, '');
}

/**
 * Check whether an IP belongs to a verified Googlebot.
 * Accepts IPv4 or IPv6.
 */
export function isVerifiedGoogleIp(ip: string, lists: CrawlerIpLists | null): boolean {
  if (!lists) return false;
  return lists.google.some((r) => ipInRange(ip, r));
}

/** Check whether an IP belongs to a verified Bingbot. */
export function isVerifiedBingIp(ip: string, lists: CrawlerIpLists | null): boolean {
  if (!lists) return false;
  return lists.bing.some((r) => ipInRange(ip, r));
}

/**
 * Fetch (and cache) the official crawler IP lists.
 *
 * Returns null on failure — callers must fail open (trust the UA) rather than
 * blocking legitimate crawlers when the list is unavailable.
 */
export async function getCrawlerIpLists(): Promise<CrawlerIpLists | null> {
  const now = Date.now();

  if (cachedLists && now - cachedLists.fetchedAt < CACHE_TTL_MS) {
    return cachedLists;
  }

  // Deduplicate concurrent fetches within the same isolate.
  if (cacheInFlight) return cacheInFlight;

  cacheInFlight = (async () => {
    try {
      const [googleRes, bingRes] = await Promise.all([
        fetch(GOOGLE_LIST_URL, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: { 'User-Agent': 'RinkStop/1.0 (+https://rinkstop.com)' },
        }),
        fetch(BING_LIST_URL, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: { 'User-Agent': 'RinkStop/1.0 (+https://rinkstop.com)' },
        }),
      ]);

      const googleText = googleRes.ok ? await googleRes.text() : '';
      const bingText = bingRes.ok ? await bingRes.text() : '';

      const google = googleText ? parseGoogleList(JSON.parse(sanitizeListPayload(googleText))) : [];
      const bing = bingText ? parseCrawlerList(JSON.parse(sanitizeListPayload(bingText))).bing : [];

      if (google.length === 0 && bing.length === 0) {
        console.error('[crawler-verify] could not load any crawler IP list; falling back to UA trust');
        return null;
      }

      cachedLists = { google, bing, fetchedAt: Date.now() };
      console.log(`[crawler-verify] loaded crawler IP lists: google=${google.length} bing=${bing.length}`);
      return cachedLists;
    } catch (e) {
      console.error('[crawler-verify] failed to load crawler IP lists:', e);
      return null;
    } finally {
      cacheInFlight = null;
    }
  })();

  return cacheInFlight;
}

/** Test seam: reset the module cache. */
export function __resetCrawlerIpCache(): void {
  cachedLists = null;
  cacheInFlight = null;
}
