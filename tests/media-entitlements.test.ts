// Tests for the unified media allowance policy (src/lib/media-entitlements.ts).
// Pure functions, no I/O — these are the decisions that decide whether a
// paying customer can upload, so they get real coverage rather than a smoke test.

import { describe, it, expect } from 'vitest';
import {
  checkMediaUpload,
  getMediaAllowance,
  isNegotiatedCapacity,
  explainAllowance,
  MEDIA_LIMITS_PROVISIONAL,
  type MediaAllowance,
} from '@/lib/media-entitlements';

const MB = 1024 * 1024;

function allowance(overrides: Partial<MediaAllowance> = {}): MediaAllowance {
  return {
    maxTotalBytes: 100 * MB,
    maxFileBytes: 15 * MB,
    maxAssetCount: 10,
    videoAllowed: false,
    maxVideoSeconds: null,
    label: 'test',
    ...overrides,
  };
}

describe('media allowance — tier resolution', () => {
  it('falls back to free for unknown or missing tiers', () => {
    expect(getMediaAllowance('nonsense')).toBe(getMediaAllowance('free'));
    expect(getMediaAllowance(null)).toBe(getMediaAllowance('free'));
    expect(getMediaAllowance(undefined)).toBe(getMediaAllowance('free'));
  });

  it('gives every tier a strictly larger storage allowance than free', () => {
    const freeBytes = getMediaAllowance('free').maxTotalBytes;
    for (const tier of ['verified_identity', 'identity_plus', 'business_listing', 'business_plus',
                        'club_starter', 'club_pro', 'club_elite', 'league'] as const) {
      expect(getMediaAllowance(tier).maxTotalBytes).toBeGreaterThan(freeBytes);
    }
  });

  it('gates video: free and Passport cannot, Plus and above can', () => {
    expect(getMediaAllowance('free').videoAllowed).toBe(false);
    expect(getMediaAllowance('verified_identity').videoAllowed).toBe(false);
    expect(getMediaAllowance('identity_plus').videoAllowed).toBe(true);
    expect(getMediaAllowance('club_pro').videoAllowed).toBe(true);
  });
});

describe('media allowance — negotiated capacity is not read as zero', () => {
  it('flags federation as negotiated', () => {
    expect(isNegotiatedCapacity(getMediaAllowance('federation'))).toBe(true);
  });

  it('does not flag ordinary tiers', () => {
    expect(isNegotiatedCapacity(getMediaAllowance('free'))).toBe(false);
    expect(isNegotiatedCapacity(getMediaAllowance('club_elite'))).toBe(false);
  });

  it('never silently allows an upload for negotiated accounts', () => {
    const fed = getMediaAllowance('federation');
    const r = checkMediaUpload(fed, { sizeBytes: 1, isVideo: false }, { totalBytes: 0, assetCount: 0 });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe('negotiated_review');
  });
});

describe('media allowance — upload decisions', () => {
  it('allows a normal photo well within limits', () => {
    const r = checkMediaUpload(allowance(), { sizeBytes: 2 * MB, isVideo: false }, { totalBytes: 0, assetCount: 0 });
    expect(r.allowed).toBe(true);
  });

  it('rejects a file over the per-file cap', () => {
    const r = checkMediaUpload(allowance({ maxFileBytes: 5 * MB }), { sizeBytes: 10 * MB, isVideo: false }, { totalBytes: 0, assetCount: 0 });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe('file_too_large');
  });

  it('rejects video when the tier does not include it', () => {
    const r = checkMediaUpload(allowance({ videoAllowed: false }), { sizeBytes: 1 * MB, isVideo: true }, { totalBytes: 0, assetCount: 0 });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe('video_not_allowed');
  });

  it('rejects video past the duration cap', () => {
    const a = allowance({ videoAllowed: true, maxVideoSeconds: 60 });
    const r = checkMediaUpload(a, { sizeBytes: 1 * MB, isVideo: true, durationSeconds: 120 }, { totalBytes: 0, assetCount: 0 });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe('video_too_long');
  });

  it('allows video within the duration cap', () => {
    const a = allowance({ videoAllowed: true, maxVideoSeconds: 600 });
    const r = checkMediaUpload(a, { sizeBytes: 1 * MB, isVideo: true, durationSeconds: 30 }, { totalBytes: 0, assetCount: 0 });
    expect(r.allowed).toBe(true);
  });

  it('does not enforce duration when it is unknown (server cannot measure yet)', () => {
    const a = allowance({ videoAllowed: true, maxVideoSeconds: 60 });
    const r = checkMediaUpload(a, { sizeBytes: 1 * MB, isVideo: true, durationSeconds: null }, { totalBytes: 0, assetCount: 0 });
    expect(r.allowed).toBe(true);
  });

  it('rejects when the asset count is already full', () => {
    const r = checkMediaUpload(allowance({ maxAssetCount: 3 }), { sizeBytes: 1 * MB, isVideo: false }, { totalBytes: 0, assetCount: 3 });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe('quota_count');
  });

  it('allows the asset that exactly reaches the count limit', () => {
    const r = checkMediaUpload(allowance({ maxAssetCount: 3 }), { sizeBytes: 1 * MB, isVideo: false }, { totalBytes: 0, assetCount: 2 });
    expect(r.allowed).toBe(true);
  });

  it('rejects when the upload would exceed total bytes', () => {
    const r = checkMediaUpload(allowance({ maxTotalBytes: 10 * MB }), { sizeBytes: 5 * MB, isVideo: false }, { totalBytes: 8 * MB, assetCount: 0 });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe('quota_bytes');
  });

  it('allows an upload that exactly reaches the byte limit', () => {
    const r = checkMediaUpload(allowance({ maxTotalBytes: 10 * MB }), { sizeBytes: 5 * MB, isVideo: false }, { totalBytes: 5 * MB, assetCount: 0 });
    expect(r.allowed).toBe(true);
  });

  it('checks file size before quota so the message is the useful one', () => {
    const a = allowance({ maxFileBytes: 1 * MB, maxTotalBytes: 2 * MB, maxAssetCount: 1 });
    const r = checkMediaUpload(a, { sizeBytes: 50 * MB, isVideo: false }, { totalBytes: 5 * MB, assetCount: 5 });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe('file_too_large');
  });

  it('gives every denial an actionable message', () => {
    const r = checkMediaUpload(allowance({ videoAllowed: false }), { sizeBytes: 1 * MB, isVideo: true }, { totalBytes: 0, assetCount: 0 });
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.message.length).toBeGreaterThan(10);
      expect(r.message.toLowerCase()).toMatch(/video|plan|upgrade|contact/);
    }
  });
});

describe('media allowance — customer-facing copy', () => {
  it('never promises unlimited', () => {
    for (const tier of ['free', 'verified_identity', 'identity_plus', 'club_starter', 'club_pro', 'club_elite', 'league', 'federation'] as const) {
      expect(explainAllowance(tier).toLowerCase()).not.toContain('unlimited');
    }
  });

  it('explains negotiated capacity distinctly', () => {
    expect(explainAllowance('federation').toLowerCase()).toContain('negotiated');
  });

  it('keeps limits provisional until approved', () => {
    // Guard: flipping this to false is a deliberate product decision, not an
    // accident. If someone flips it, MEDIA_LIMITS_PROVISIONAL test fails
    // loudly rather than the numbers silently going public.
    expect(MEDIA_LIMITS_PROVISIONAL).toBe(true);
  });
});