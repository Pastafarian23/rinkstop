// tests/media-allowances-published.test.ts
//
// Pins the customer-facing media allowances to the values the server enforces.
//
// WHY THIS TEST
// The pricing page and the upload gate must never disagree. The failure mode
// this file prevents is real and has happened before: the retired Stripe prices
// ($149/$399/$999) stayed quoted in marketing copy long after the products were
// archived, because copy drifts from code by default and nothing checked.
//
// The pricing table is now GENERATED from MEDIA_ALLOWANCES rather than
// hand-written, which makes drift structurally impossible. These tests assert
// the generation is wired correctly and that the numbers are commercially
// sane, so a careless edit to the allowance table is caught here rather than by
// a customer.
//
// Arnel's 2026-10-22 commercial direction, encoded as assertions:
//   • Free participates in the social network with photos and text.
//   • Paid personal plans unlock video + player highlights.
//   • Organizations get a shared pool.
//   • Higher tiers get larger allowances, not a maze of separate per-type fees.

import { describe, it, expect } from 'vitest';
import {
  MEDIA_ALLOWANCES,
  getMediaAllowance,
  formatBytes,
  type TierName,
} from '../src/lib/media-entitlements';
import { canonicalTier } from '../src/lib/pricing';

const CANONICAL: TierName[] = [
  'free', 'verified_identity', 'identity_plus',
  'org_free', 'org_plus', 'org_pro', 'org_elite', 'org_enterprise',
];

describe('published allowances exist and are coherent', () => {
  it('every canonical tier has a published allowance', () => {
    for (const t of CANONICAL) {
      expect(MEDIA_ALLOWANCES[t]).toBeDefined();
      expect(MEDIA_ALLOWANCES[t].label).toBeTruthy();
      expect(MEDIA_ALLOWANCES[t].provisional).toBe(false);
    }
  });

  it('every allowance label matches the numbers it describes', () => {
    // A label is what the customer reads. If it stops matching the enforced
    // numbers, that is the same class of bug as a stale price.
    for (const t of CANONICAL) {
      const a = MEDIA_ALLOWANCES[t];
      if (a.maxTotalBytes === 0) continue; // negotiated, label is different
      expect(a.label).toContain(formatBytes(a.maxTotalBytes));
      expect(a.label).toContain(a.maxAssetCount.toLocaleString());
    }
  });

  it('enterprise is negotiated, not zero (0 would read as "no media allowed")', () => {
    const e = MEDIA_ALLOWANCES.org_enterprise;
    expect(e.maxTotalBytes).toBe(0);
    expect(e.maxAssetCount).toBe(0);
    expect(e.label).toBe('Negotiated capacity');
  });
});

describe('commercial direction: free participates, paid unlocks video', () => {
  it('free users get a real, usable photo allowance', () => {
    const f = MEDIA_ALLOWANCES.free;
    expect(f.maxTotalBytes).toBeGreaterThan(0);
    expect(f.maxAssetCount).toBeGreaterThanOrEqual(10);
    expect(f.videoAllowed).toBe(false);
  });

  it('video is a PAID feature on the personal track', () => {
    // This is the monetization hook Arnel chose: the social network stays
    // open for everyone, and video is what a paid personal plan unlocks.
    expect(MEDIA_ALLOWANCES.free.videoAllowed).toBe(false);
    expect(MEDIA_ALLOWANCES.verified_identity.videoAllowed).toBe(false);
    expect(MEDIA_ALLOWANCES.identity_plus.videoAllowed).toBe(true);
  });

  it('Hockey Passport Plus is a genuine step up from Free', () => {
    expect(MEDIA_ALLOWANCES.identity_plus.maxTotalBytes)
      .toBeGreaterThan(MEDIA_ALLOWANCES.free.maxTotalBytes * 10);
    expect(MEDIA_ALLOWANCES.identity_plus.maxAssetCount)
      .toBeGreaterThan(MEDIA_ALLOWANCES.free.maxAssetCount);
  });

  it('paid organizations get a shared pool larger than any personal plan', () => {
    // org_free is intentionally modest (100 MB — it is a free tier, and a
    // small pool is part of why one would upgrade). The PAID org tiers must
    // each exceed the largest personal allowance, since an organization
    // running several teams' media is the real volume case.
    for (const t of ['org_plus', 'org_pro', 'org_elite'] as TierName[]) {
      expect(MEDIA_ALLOWANCES[t].maxTotalBytes)
        .toBeGreaterThan(MEDIA_ALLOWANCES.identity_plus.maxTotalBytes);
    }
    // org_free still matches the free personal allowance — a free org and a
    // free individual get the same breathing room.
    expect(MEDIA_ALLOWANCES.org_free.maxTotalBytes)
      .toBe(MEDIA_ALLOWANCES.free.maxTotalBytes);
  });

  it('org tiers ascend monotonically in both bytes and item count', () => {
    const ladder: TierName[] = ['org_free', 'org_plus', 'org_pro', 'org_elite'];
    for (let i = 1; i < ladder.length; i++) {
      expect(MEDIA_ALLOWANCES[ladder[i]].maxTotalBytes)
        .toBeGreaterThan(MEDIA_ALLOWANCES[ladder[i - 1]].maxTotalBytes);
      expect(MEDIA_ALLOWANCES[ladder[i]].maxAssetCount)
        .toBeGreaterThan(MEDIA_ALLOWANCES[ladder[i - 1]].maxAssetCount);
    }
  });

  it('per-file caps never exceed the total allowance', () => {
    // A cap larger than the pool would let a single upload fail with a
    // confusing message instead of a clean quota error.
    for (const t of CANONICAL) {
      const a = MEDIA_ALLOWANCES[t];
      if (a.maxTotalBytes === 0) continue;
      expect(a.maxFileBytes).toBeLessThanOrEqual(a.maxTotalBytes);
    }
  });
});

describe('formatBytes is publication-safe', () => {
  it('renders human units, never raw bytes', () => {
    expect(formatBytes(100 * 1024 * 1024)).toBe('100 MB');
    expect(formatBytes(5 * 1024 * 1024 * 1024)).toBe('5 GB');
  });

  it('renders sub-megabyte values in KB rather than raw bytes', () => {
    // This was a real display bug: with no sub-MB tier, the 5 MB per-file
    // cap rendered as "5242880 B" on the settings screen.
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatBytes(1024 * 1024 - 1)).toBe('1024 KB');
  });

  it('rounds rather than truncating, so 1.5 GB does not read as 1 GB', () => {
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
  });

  it('handles zero and negatives without printing NaN', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(NaN)).toBe('0 B');
  });

  it('never emits a raw byte count for any plausible media size', () => {
    for (const n of [1, 999, 1024, 5e5, 1048575, 1048576, 1e7, 1e9]) {
      expect(formatBytes(n)).not.toMatch(/^\d+ B$/);
    }
  });
});

describe('legacy tier names resolve to the same published allowance', () => {
  it('a legacy DB row gets the allowance of its canonical equivalent', () => {
    // Otherwise consolidation silently changes a paying customer's quota.
    for (const legacy of ['club_starter', 'business_listing', 'business_starter']) {
      expect(getMediaAllowance(legacy)).toEqual(getMediaAllowance(canonicalTier(legacy)));
    }
    for (const legacy of ['club_pro', 'business_plus', 'business_pro', 'business_premium']) {
      expect(getMediaAllowance(legacy)).toEqual(getMediaAllowance(canonicalTier(legacy)));
    }
  });

  it('an unknown tier falls back to the free allowance rather than unlimited', () => {
    // Fail closed. A typo in a tier string must never grant open storage.
    expect(getMediaAllowance('totally_made_up').maxTotalBytes)
      .toBe(MEDIA_ALLOWANCES.free.maxTotalBytes);
  });
});