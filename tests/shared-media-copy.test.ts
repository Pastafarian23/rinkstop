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

describe('cancellation policy is stated the same way everywhere', () => {
  /**
   * SELF-SERVICE CANCELLATION IS NOW ENABLED (2026-10-22).
   *
   * Stripe Portal config bpc_1TgF86CJiUbEZVbnPPKN4ui5 was changed:
   *   subscription_cancel: enabled=true, mode=at_period_end,
   *                        proration_behavior=none, cancellation_reason optional
   *   subscription_update: STILL DISABLED (no proration logic exists)
   *
   * So the policy is: cancel yourself in the Portal, effective at period end,
   * access preserved until then, no fee, no refund of the unused remainder.
   * Switching plans is still email-only — that is a genuine limitation, not an
   * oversight, because self-serve switching would need proration we do not have.
   *
   * These tests exist because copy has now contradicted the product FIVE times:
   * "cancel anytime in dashboard", an unreachably-promised retention window, a
   * proration credit that no code computes, email-only cancellation after
   * self-service was enabled, and a dashboard tier-switch that does not exist.
   */
  const CANCELLATION_SURFACES = [
    'src/components/PricingComparisonTable.tsx',
    'src/app/dashboard/subscription/ManageSubscriptionClient.tsx',
    'src/app/faq/page.tsx',
    'src/app/pricing/PricingContent.tsx',
    'src/app/guides/rinkstop-vs-competitors/page.tsx',
    'src/components/ToolUpsell.tsx',
  ];

  it('no surface still claims cancellation requires email', () => {
    const offenders: string[] = [];
    for (const rel of CANCELLATION_SURFACES) {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      // These are TS object literals whose values are single-quoted strings
      // containing escaped apostrophes and long prose. Splitting on [.!?]
      // alone walks straight through a closing quote and merges the next
      // question into the previous answer — which is what caused two rounds of
      // false positives on copy that was already correct.
      //
      // So: isolate each string literal first, then split THAT into sentences.
      // Also normalise \' so an escaped apostrophe is not read as a sentence
      // break.
      const literals = src.match(/'(?:[^'\\]|\\.)*'/g) ?? [];
      for (const raw of literals) {
        const text = raw.replace(/\\'/g, "'").replace(/^'|'$/g, '');
        const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
        for (const sentence of sentences) {
          const aboutCancellation =
            /cancel (your |the |a )?(plan|subscription)/i.test(sentence) ||
            /\bto cancel\b/i.test(sentence) ||
            /cancelling, email/i.test(sentence) ||
            /cancelling your/i.test(sentence);
          const saysEmail =
            /\b(email|contact|reach)\s+(us|support)\b/i.test(sentence) ||
            /support@rinkstop\.com/i.test(sentence);
          if (!aboutCancellation || !saysEmail) continue;

          // "To switch plans instead of cancelling, email support" is CORRECT —
          // it routes SWITCHING to email and contrasts it with the self-serve
          // cancel described in the previous sentence.
          const routesSwitching = /\binstead of\b|\bswitch\b|\bchange plans\b/i.test(sentence);
          if (routesSwitching) continue;

          offenders.push(`${rel} :: ${sentence.replace(/\s+/g, ' ').slice(0, 120)}`);
        }
      }
    }
    expect(offenders, 'sentences claiming cancellation requires email').toEqual([]);
  });

  it('the surfaces that mention cancelling point at the Portal', () => {
    const mustRoute = [
      'src/components/PricingComparisonTable.tsx',
      'src/app/dashboard/subscription/ManageSubscriptionClient.tsx',
      'src/app/faq/page.tsx',
      'src/app/pricing/PricingContent.tsx',
      'src/app/guides/rinkstop-vs-competitors/page.tsx',
    ];
    for (const rel of mustRoute) {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      if (!/cancel/i.test(src)) continue;
      expect(
        src,
        `${rel} mentions cancellation without naming Manage billing / the Portal`,
      ).toMatch(/Manage billing|portal/i);
    }
  });

  it('states when cancellation takes effect, on every surface that mentions it', () => {
    // The single most important fact: cancelling does NOT cut access now.
    const mustStateTiming = [
      'src/components/PricingComparisonTable.tsx',
      'src/app/dashboard/subscription/ManageSubscriptionClient.tsx',
      'src/app/faq/page.tsx',
      'src/app/pricing/PricingContent.tsx',
      'src/app/guides/rinkstop-vs-competitors/page.tsx',
    ];
    for (const rel of mustStateTiming) {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      if (!/cancel/i.test(src)) continue;
      expect(
        src,
        `${rel} does not say cancellation takes effect at period end`,
      ).toMatch(/end of the period|until then|takes effect at the end/i);
    }
  });

  it('does not promise refunds or credits, because none are implemented', () => {
    // proration_behavior='none' means Stripe issues no credit at all.
    const offenders: string[] = [];
    for (const rel of CANCELLATION_SURFACES) {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      // A statement that we DO NOT refund is fine; a promise of a refund is not.
      const promisesRefund =
        /\b(we (will )?refund|full refund|refund you)\b/i.test(src) &&
        !/\b(no|not|never|do not|don't)\b[^.]{0,40}refund/i.test(src);
      if (promisesRefund) offenders.push(rel);
    }
    expect(offenders, 'surfaces promising a refund that never happens').toEqual([]);
  });

  it('no surface promises automatic proration on upgrade', () => {
    // There is no proration_behavior set anywhere in the app code, and the
    // upgrade flow creates a NEW subscription, so Stripe issues no credit.
    //
    // Only string literals are checked — a code comment that NAMES
    // proration_behavior to explain why it is 'none' is documentation, not a
    // customer promise, and flagging it would only encourage someone to delete
    // the explanation.
    const offenders: string[] = [];
    for (const rel of CANCELLATION_SURFACES) {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      const literals = (src.match(/'(?:[^'\\]|\\.)*'/g) ?? []).map((raw) =>
        raw.replace(/\\'/g, "'").replace(/^'|'$/g, ''),
      );
      for (const text of literals) {
        if (/prorat/i.test(text) || /unused portion[^.!]{0,40}credited/i.test(text)) {
          offenders.push(`${rel} :: ${text.replace(/\s+/g, ' ').slice(0, 110)}`);
        }
      }
    }
    expect(offenders, 'customer-visible strings promising automatic proration').toEqual([]);
  });

  it('does not promise self-serve tier switching, which is genuinely disabled', () => {
    const offenders: string[] = [];
    for (const rel of CANCELLATION_SURFACES) {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      if (
        /move between tiers[^.!]{0,60}(dashboard|yourself)/i.test(src) ||
        /switch[^.!]{0,40}from your dashboard/i.test(src)
      ) {
        offenders.push(rel);
      }
    }
    expect(offenders, 'surfaces promising self-serve tier switching').toEqual([]);
  });

  it('plan switching is still described as a support request, matching reality', () => {
    // subscription_update is DISABLED, so this remains true — but it is
    // asserted so that if the Portal later gains switching, the copy is
    // revisited rather than silently left stale.
    const src = readFileSync(
      join(process.cwd(), 'src/app/pricing/PricingContent.tsx'),
      'utf8',
    );
    expect(src).toMatch(/[Ss]witching plans is handled by email/);
  });
});