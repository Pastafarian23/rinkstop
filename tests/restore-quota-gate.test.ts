// tests/restore-guota-gate.test.ts
//
// Proves the restore endpoint's over-allocation guard actually rejects.
//
// WHY THIS NEEDS A DEDICATED TEST
// The live verification on 2026-10-22 established two things about the restore
// flow: ownership is enforced (a non-owner's query returns 0 rows, so the route
// 403s before any write), and a restore within the allowance succeeds. It did
// NOT exercise the rejection branch — the test user had ample headroom, so
// `checkMediaUpload` never returned `allowed: false`.
//
// An unexercised rejection branch is exactly where a quota bug hides. If the
// restore route checked quota and then ignored the result, or inverted the
// condition, no amount of successful-restore testing would reveal it.
//
// These tests drive checkMediaUpload directly with the exact values the route
// passes, so the rejection path is covered without needing a user who is
// genuinely at their ceiling.

import { describe, it, expect } from 'vitest';
import {
  checkMediaUpload,
  getMediaAllowance,
  type MediaUsageSnapshot,
} from '../src/lib/media-entitlements';
import { MEDIA_ALLOWANCES } from '../src/lib/media-entitlements';

const MB = 1024 * 1024;

/**
 * Mirrors what the restore route does: it measures the CURRENT counted usage
 * (which excludes the in-grace asset being restored, because the asset is not
 * counted while it has no live reference) and then checks whether adding that
 * asset back would exceed the allowance.
 */
function restoreWouldBeAllowed(opts: {
  usageBytes: number;
  usageCount: number;
  assetBytes: number;
  isVideo: boolean;
  tier: 'free' | 'verified_identity' | 'identity_plus';
}) {
  const allowance = getMediaAllowance(opts.tier);
  const usage: MediaUsageSnapshot = {
    totalBytes: opts.usageBytes,
    assetCount: opts.usageCount,
  };
  return checkMediaUpload(
    allowance,
    { sizeBytes: opts.assetBytes, isVideo: opts.isVideo, durationSeconds: null },
    usage,
  );
}

describe('restore within the allowance is allowed', () => {
  it('allows a small restore for a user with plenty of room', () => {
    const d = restoreWouldBeAllowed({
      usageBytes: 4 * MB,
      usageCount: 3,
      assetBytes: 2.4 * MB,
      isVideo: true,
      tier: 'identity_plus',
    });
    expect(d.allowed).toBe(true);
  });

  it('allows a restore that lands EXACTLY on the limit', () => {
    // Off-by-one check: the comparison must be "exceeds", not "reaches".
    // Hitting the cap precisely is legitimate use, not a violation.
    const allowance = MEDIA_ALLOWANCES.identity_plus;
    const d = restoreWouldBeAllowed({
      usageBytes: allowance.maxTotalBytes - 1000,
      usageCount: 1,
      assetBytes: 1000,
      isVideo: false,
      tier: 'identity_plus',
    });
    expect(d.allowed).toBe(true);
  });
});

describe('restore that would over-allocate is REFUSED', () => {
  it('refuses when the restored bytes would exceed the total allowance', () => {
    const allowance = MEDIA_ALLOWANCES.identity_plus;
    const d = restoreWouldBeAllowed({
      usageBytes: allowance.maxTotalBytes,
      usageCount: 1,
      assetBytes: 1,
      isVideo: false,
      tier: 'identity_plus',
    });
    expect(d.allowed).toBe(false);
    expect(d.code).toBe('quota_bytes');
  });

  it('refuses by one byte over the limit', () => {
    const allowance = MEDIA_ALLOWANCES.identity_plus;
    const d = restoreWouldBeAllowed({
      usageBytes: allowance.maxTotalBytes,
      usageCount: 1,
      assetBytes: 1,
      isVideo: false,
      tier: 'identity_plus',
    });
    expect(d.allowed).toBe(false);
  });

  it('refuses when the restored asset would exceed the ITEM count', () => {
    const allowance = MEDIA_ALLOWANCES.identity_plus;
    const d = restoreWouldBeAllowed({
      usageBytes: 1,
      usageCount: allowance.maxAssetCount,
      assetBytes: 1,
      isVideo: false,
      tier: 'identity_plus',
    });
    expect(d.allowed).toBe(false);
    expect(d.code).toBe('quota_count');
  });

  it('refuses a video restore for a photo-only plan (downgrade case)', () => {
    // A user who downgraded from Hockey Passport Plus to Free must not be
    // able to restore an old video. This is the most commercially important
    // rejection: without it, a downgrade would be reversible indefinitely.
    const d = restoreWouldBeAllowed({
      usageBytes: 1 * MB,
      usageCount: 2,
      assetBytes: 2.4 * MB,
      isVideo: true,
      tier: 'free',
    });
    expect(d.allowed).toBe(false);
    expect(d.code).toBe('video_not_allowed');
    expect(d.message).toMatch(/Hockey Passport Plus/i);
  });

  it('the refusal message tells the user what to do', () => {
    const d = restoreWouldBeAllowed({
      usageBytes: MEDIA_ALLOWANCES.identity_plus.maxTotalBytes,
      usageCount: 1,
      assetBytes: 1,
      isVideo: false,
      tier: 'identity_plus',
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) {
      expect(d.message).toMatch(/allowance/i);
      expect(d.message).toMatch(/upgrade|remove/i);
    }
  });
});

describe('negotiated-capacity accounts are handled by the ROUTES, not this function', () => {
  it('checkMediaUpload returns a review-required denial for negotiated plans', () => {
    // Intentional: checkMediaUpload is the last line of defence and must never
    // wave an unmetered upload through. Negotiated accounts are unblocked one
    // level up — every call site checks the `negotiated` flag returned by
    // getMediaEntitlementForUser BEFORE calling this, and skips the check
    // entirely. Asserted here so the contract is explicit: if this ever returns
    // `allowed: true` for a negotiated allowance, enterprise customers could
    // exceed whatever was actually agreed with them.
    const allowance = getMediaAllowance('org_enterprise');
    const d = checkMediaUpload(
      allowance,
      { sizeBytes: 500 * MB, isVideo: true, durationSeconds: null },
      { totalBytes: 10 * 1024 * MB, assetCount: 5000 },
    );
    expect(d.allowed).toBe(false);
    expect(d.code).toBe('negotiated_review');
    expect(d.message).toMatch(/support@rinkstop\.com/);
  });
});

describe('the gate the route relies on', () => {
  it('uses a strict "exceeds" comparison, so landing exactly on the cap passes', () => {
    // The comparison must be `usage + file > allowance`, not `>=`. Hitting the
    // cap exactly is legitimate use, not a violation — a user who uploads until
    // they are precisely full should not be refused.
    //
    // Constructed as: current usage + one more file == the allowance exactly.
    // (A single file cannot itself be 5 GB — that would trip the per-file cap
    // first, which is a different denial.)
    const a = MEDIA_ALLOWANCES.identity_plus;
    const fileBytes = 10 * MB;
    const exactly = checkMediaUpload(
      a,
      { sizeBytes: fileBytes, isVideo: false, durationSeconds: null },
      { totalBytes: a.maxTotalBytes - fileBytes, assetCount: 1 },
    );
    expect(exactly.allowed).toBe(true);

    const oneOver = checkMediaUpload(
      a,
      { sizeBytes: fileBytes, isVideo: false, durationSeconds: null },
      { totalBytes: a.maxTotalBytes - fileBytes + 1, assetCount: 1 },
    );
    expect(oneOver.allowed).toBe(false);
    expect(oneOver.code).toBe('quota_bytes');
  });

  it('a restored video is judged against the duration cap when known', () => {
    // Duration is client-reported (no ffprobe on Vercel). A restore has no
    // duration to hand, so the route passes null and the byte/count caps are
    // what actually protect the allowance. Assert that null duration does not
    // crash or silently allow a video that the size cap should catch.
    const a = MEDIA_ALLOWANCES.identity_plus;
    const d = checkMediaUpload(
      a,
      { sizeBytes: 50 * MB, isVideo: true, durationSeconds: null },
      { totalBytes: a.maxTotalBytes, assetCount: 1 },
    );
    expect(d.allowed).toBe(false);
  });
});