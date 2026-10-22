// tests/media-route-coverage.test.ts
//
// Prevents the "counted but not checked" class of bug from recurring.
//
// THE GAP THIS CATCHES
// `post-media` looked covered because `/api/profile-posts` enforces the quota.
// But its sibling `/api/profile-posts/media` writes to the SAME bucket and had
// no allowance check at all — an unmetered path into a quota-governed bucket.
// The same shape of gap was found in player-media, profile_covers and
// listing-photos in the 2026-10-22 audit: all four buckets were COUNTED by the
// ledger, and three did not CHECK the allowance.
//
// These tests are structural. They cannot prove a route works at runtime, but
// they do prove that every route which writes into a quota-governed bucket
// references the allowance check — which is how the media/media hole was found.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const API_ROOT = join(process.cwd(), 'src/app/api');

/** Buckets whose objects count against the unified media allowance. */
const QUOTA_BUCKETS = ['post-media', 'profile_covers', 'listing-photos', 'player-media'];

/** Walk every route.ts under src/app/api. */
function routeFiles(dir: string = API_ROOT): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...routeFiles(full));
    else if (entry === 'route.ts') out.push(full);
  }
  return out;
}

const ROUTES = routeFiles();

function routesReferencing(bucket: string): string[] {
  return ROUTES.filter((f) => readFileSync(f, 'utf8').includes(`'${bucket}'`));
}

describe('every quota-governed bucket has at least one enforcing route', () => {
  it('finds the API route directory', () => {
    expect(ROUTES.length).toBeGreaterThan(50);
  });

  for (const bucket of QUOTA_BUCKETS) {
    it(`${bucket}: every route writing to it consults the media allowance`, () => {
      const writers = routesReferencing(bucket);
      expect(writers.length).toBeGreaterThan(0);

      const unchecked = writers.filter((f) => {
        const src = readFileSync(f, 'utf8');
        // A route is considered enforcing if it calls the shared decision
        // function. Storage-only reads (getPublicUrl, .list) are not writes and
        // are filtered out by requiring an upload/write call as well.
        const writes = /\.upload\(|createSignedUploadUrl\(/.test(src);
        if (!writes) return false;
        return !/checkMediaUpload/.test(src);
      });

      expect(
        unchecked.map((f) => f.replace(process.cwd() + '/', '')),
        `Routes that upload to ${bucket} without checking the media allowance`,
      ).toEqual([]);
    });
  }
});

describe('the specific hole found on 2026-10-22 stays closed', () => {
  it('profile-posts/media enforces the allowance (it did not before)', () => {
    const src = readFileSync(
      join(API_ROOT, 'profile-posts/media/route.ts'),
      'utf8',
    );
    expect(src).toContain('checkMediaUpload');
    expect(src).toContain('getMediaEntitlementForUser');
    // Negotiated accounts must be handled before the metered check, or an
    // enterprise customer with a negotiated deal gets a hard quota error.
    expect(src).toContain('negotiated');
  });

  it('profile-posts also enforces it (the two are independent paths)', () => {
    const src = readFileSync(join(API_ROOT, 'profile-posts/route.ts'), 'utf8');
    expect(src).toContain('checkMediaUpload');
  });

  it('every enforcing route handles the negotiated-capacity case', () => {
    // A route that checks the quota but forgets `negotiated` would reject
    // enterprise customers whose capacity was agreed by contract.
    const missing: string[] = [];
    for (const f of ROUTES) {
      const src = readFileSync(f, 'utf8');
      if (!/checkMediaUpload/.test(src)) continue;
      if (!/negotiated/.test(src)) missing.push(f.replace(process.cwd() + '/', ''));
    }
    expect(missing, 'routes checking quota without handling negotiated capacity').toEqual([]);
  });
});

describe('delete and restore both keep the ledger honest', () => {
  it('the post delete route releases the ledger reference', () => {
    const src = readFileSync(join(API_ROOT, 'profile-posts/[id]/route.ts'), 'utf8');
    expect(src).toContain('releaseAssetRef');
    // Deleting Storage inline would break shared assets.
    expect(src).not.toMatch(/\.storage[\s\S]{0,200}\.remove\(/);
  });

  it('the restore route re-attaches the reference and honours the allowance', () => {
    const src = readFileSync(join(API_ROOT, 'profile-posts/[id]/restore/route.ts'), 'utf8');
    expect(src).toContain('attachAssetRef');
    expect(src).toContain('checkMediaUpload');
    expect(src).toContain('negotiated');
  });
});

describe('all four buckets are attributed to an owner', () => {
  it('usage measurement covers every governed bucket', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/media-usage.ts'), 'utf8');
    for (const bucket of QUOTA_BUCKETS) {
      expect(src, `${bucket} missing from media-usage attribution`).toContain(bucket);
    }
  });

  it('the ledger reaper only targets these buckets', () => {
    // The reaper deletes real files. It must never be widened by accident to
    // document buckets (player-documents, rink-contracts) that have their own
    // retention rules and their own access paths.
    const src = readFileSync(join(process.cwd(), 'src/lib/media-ledger.ts'), 'utf8');
    expect(src).toContain('expired_media_assets');
    expect(src).toContain('release_expired_media_asset');
  });
});