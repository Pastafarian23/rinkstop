// tests/shared-media-copy.test.ts
//
// The published "Shared media storage" policy on /pricing is a set of claims
// about what the system actually does. This file makes those claims checkable.
//
// WHY THIS EXISTS
// Arnel supplied this copy for publication. Before shipping it, each sentence
// was verified against the implementation — and one turned out to describe
// something the product could not do: it promised deleted content stayed
// "recoverable", while the restore endpoint existed with no UI to reach it. A
// promise the product cannot keep is worse than no promise, because customers
// act on it.
//
// So the copy now lives in ONE exported constant, and these tests assert that
// what it says matches what the code does. If a future change alters the
// retention period, the pooling, or the sharing semantics, these fail rather
// than letting the pricing page quietly describe a system that no longer
// exists.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Safe readdir: PostgREST-style missing dirs should not crash the test. */
function readdirSyncSafe(dir: string): string[] {
  try { return readdirSync(dir); } catch { return []; }
}
function isDir(p: string): boolean {
  try { return statSync(p).isDirectory(); } catch { return false; }
}
import {
  SHARED_MEDIA_STORAGE_COPY,
  MEDIA_ALLOWANCES,
  getMediaAllowance,
  checkMediaUpload,
} from '../src/lib/media-entitlements';

const PARAS = SHARED_MEDIA_STORAGE_COPY.split('\n\n');
const MB = 1024 * 1024;

describe('the published copy exists and is complete', () => {
  it('has the three paragraphs it should', () => {
    expect(PARAS).toHaveLength(3);
    for (const p of PARAS) expect(p.trim().length).toBeGreaterThan(40);
  });

  it('is rendered on /pricing from this constant, not a duplicate string', () => {
    // Copy duplicated in two places drifts. The table must import it.
    const src = readFileSync(
      join(process.cwd(), 'src/components/PricingComparisonTable.tsx'),
      'utf8',
    );
    expect(src).toContain('SHARED_MEDIA_STORAGE_COPY');
    // And the prose itself must not be re-typed into the component.
    expect(src).not.toContain('Your plan’s media allowance is shared');
  });

  it('names every feature in the shared pool', () => {
    const c = SHARED_MEDIA_STORAGE_COPY.toLowerCase();
    for (const feature of ['social posts', 'player media', 'profile covers', 'listing photos']) {
      expect(c, `copy does not mention "${feature}"`).toContain(feature);
    }
  });
});

describe('claim: one pool across four features', () => {
  it('usage measurement attributes all four buckets', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/media-usage.ts'), 'utf8');
    for (const bucket of ['post-media', 'profile_covers', 'listing-photos', 'player-media']) {
      expect(src).toContain(bucket);
    }
  });

  it('every bucket that the copy names is enforced somewhere', () => {
    // A feature named in published copy must not be an unmetered path. This is
    // the exact hole found on 2026-10-22 (profile-posts/media had no check).
    const apiRoot = join(process.cwd(), 'src/app/api');
    const walk = (dir: string): string[] =>
      readdirSyncSafe(dir).flatMap((e) => {
        const full = join(dir, e);
        return isDir(full) ? walk(full) : full.endsWith('route.ts') ? [full] : [];
      });
    const routes = walk(apiRoot);
    expect(routes.length).toBeGreaterThan(50);

    for (const bucket of ['post-media', 'profile_covers', 'listing-photos', 'player-media']) {
      const writers = routes.filter((f) => readFileSync(f, 'utf8').includes(`'${bucket}'`));
      const unchecked = writers.filter((f) => {
        const src = readFileSync(f, 'utf8');
        if (!/\.upload\(|createSignedUploadUrl\(/.test(src)) return false;
        return !src.includes('checkMediaUpload');
      });
      expect(unchecked, `unmetered writes to ${bucket}`).toEqual([]);
    }
  });
});

describe('claim: each file counts once even if shown in several places', () => {
  it('the ledger is uniquely keyed on the storage object', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/2026-10-23_media_asset_ledger.sql'),
      'utf8',
    );
    expect(sql).toContain('unique (bucket, object_path)');
  });

  it('references are counted separately from bytes', () => {
    // ref_count may exceed 1 while the byte total stays put. That separation
    // is what the "counts once" claim depends on.
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/2026-10-23_media_asset_ledger.sql'),
      'utf8',
    );
    expect(sql).toContain('ref_count');
    expect(sql).toContain('media_counted_assets');
  });
});

describe('claim: quota is released only when no longer referenced elsewhere', () => {
  it('the retention clock starts at zero references, not at delete time', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/2026-10-23_media_asset_ledger.sql'),
      'utf8',
    );
    expect(sql).toMatch(/if v_count = 0 then/);
  });

  it('a still-referenced asset keeps counting after one reference is dropped', () => {
    // Mirrors the live verification: ref_count 2 -> drop one -> bytes unchanged.
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/2026-10-23_media_asset_ledger.sql'),
      'utf8',
    );
    expect(sql).toMatch(/ref_count = v_count/);
  });
});

describe('claim: deleted content is restorable for 30 days', () => {
  it('the retention period is 30 days', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/2026-10-23_media_asset_ledger.sql'),
      'utf8',
    );
    expect(sql).toContain("interval '30 days'");
  });

  it('a user can actually reach the restore action', () => {
    // This is the sentence that was NOT true when the copy was first written:
    // the endpoint existed but nothing in the UI called it.
    const ui = readFileSync(
      join(process.cwd(), 'src/app/dashboard/profile/posts/page.tsx'),
      'utf8',
    );
    expect(ui).toContain('/restore');
    expect(ui).toContain('Recently deleted');
  });

  it('the restore API can list soft-deleted posts', () => {
    const me = readFileSync(join(process.cwd(), 'src/app/api/profile-posts/me/route.ts'), 'utf8');
    expect(me).toContain('include_deleted');
  });

  it('restoring can be refused if it would exceed the allowance', () => {
    // Otherwise "recoverable" would mean "recoverable beyond what you pay for".
    const restore = readFileSync(
      join(process.cwd(), 'src/app/api/profile-posts/[id]/restore/route.ts'),
      'utf8',
    );
    expect(restore).toContain('checkMediaUpload');
    expect(restore).toContain('413');
    // And on refusal the post must NOT be un-deleted — content is never lost.
    expect(restore.indexOf('checkMediaUpload')).toBeLessThan(
      restore.indexOf("update({ deleted_at: null })"),
    );
  });
});

describe('claim: video duration limits apply per plan', () => {
  it('every video-enabled plan declares a duration cap', () => {
    for (const [tier, a] of Object.entries(MEDIA_ALLOWANCES)) {
      if (!a.videoAllowed) continue;
      // Enterprise is negotiated, so a null cap there is intentional.
      if (tier === 'org_enterprise') {
        expect(a.maxVideoSeconds, 'enterprise is negotiated, not metered').toBeNull();
        continue;
      }
      expect(
        a.maxVideoSeconds,
        `${tier} allows video but declares no duration cap`,
      ).toBeTypeOf('number');
      expect(a.maxVideoSeconds as number).toBeGreaterThan(0);
    }
  });

  it('an over-length video is refused', () => {
    const a = MEDIA_ALLOWANCES.identity_plus;
    const d = checkMediaUpload(
      a,
      { sizeBytes: 5 * MB, isVideo: true, durationSeconds: (a.maxVideoSeconds ?? 600) + 1 },
      { totalBytes: 0, assetCount: 0 },
    );
    expect(d.allowed).toBe(false);
    expect(d.code).toBe('video_too_long');
  });

  it('a video within the cap is allowed', () => {
    const a = MEDIA_ALLOWANCES.identity_plus;
    const d = checkMediaUpload(
      a,
      { sizeBytes: 5 * MB, isVideo: true, durationSeconds: Math.max(1, (a.maxVideoSeconds ?? 600) - 1) },
      { totalBytes: 0, assetCount: 0 },
    );
    expect(d.allowed).toBe(true);
  });

  it('photo-only plans refuse video outright', () => {
    const d = checkMediaUpload(
      getMediaAllowance('free'),
      { sizeBytes: MB, isVideo: true, durationSeconds: 5 },
      { totalBytes: 0, assetCount: 0 },
    );
    expect(d.allowed).toBe(false);
    expect(d.code).toBe('video_not_allowed');
  });
});

describe('related copy consistency', () => {
  it('the pricing footer no longer promises dashboard cancellation', () => {
    // The Stripe Portal has subscription_cancel DISABLED (verified live), so
    // "Cancel anytime in dashboard" was false.
    const src = readFileSync(
      join(process.cwd(), 'src/components/PricingComparisonTable.tsx'),
      'utf8',
    );
    expect(src).not.toContain('Cancel anytime in dashboard');
  });
});