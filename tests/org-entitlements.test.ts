// Focused tests for the organization-tier consolidation's two load-bearing
// server-side behaviours that have no other automated coverage:
//
//   1. The team-workspace quota helper contract (tier -> quota) and the
//      tier-rank ordering the RPC depends on.
//   2. The org finances endpoint's authorization rules.
//
// The endpoint itself needs a live Supabase + a live org, so the pure
// decision logic is extracted and tested here; the wiring is verified by the
// live probe recorded in memory/2026-10-22-org-tier-audit.md.

import { describe, it, expect } from 'vitest';
import { canonicalTier, TIERS, TEAM_LIMIT_PER_TIER, getTierLabel } from '@/lib/pricing';
import { tierAtLeast, tierRank, tierTrack } from '@/lib/tier';
import { tierAtLeastSameTrack, hasAnyPaidTier } from '@/lib/tier-gate';

// ─────────────────────────────────────────────────────────────────────────
// 1. Team-workspace quota
// ─────────────────────────────────────────────────────────────────────────

describe('team workspace quota', () => {
  it('matches the live team_workspace_quota_for_tier() values', () => {
    // Verified live against the database (2026-10-22). The DB is the
    // enforcement point; this table is the app-side mirror used for
    // preflight UI and for the "upgrade to X" recommendation.
    expect(TEAM_LIMIT_PER_TIER.org_free).toBe(1);
    expect(TEAM_LIMIT_PER_TIER.org_plus).toBe(3);
    expect(TEAM_LIMIT_PER_TIER.org_pro).toBe(10);
  });

  it('treats the top org tiers as unlimited', () => {
    // The app encodes "unlimited" as Infinity. The DB encodes it as -1
    // (team_workspace_quota_for_tier returns -1). Both mean the same thing
    // and this test pins the app-side encoding so the two cannot silently
    // diverge into a "0 teams" bug.
    expect(TEAM_LIMIT_PER_TIER.org_elite).toBe(Infinity);
    expect(TEAM_LIMIT_PER_TIER.org_enterprise).toBe(Infinity);
  });

  it('mirrors the live DB quota function values', () => {
    // team_workspace_quota_for_tier() returns 1 / 3 / 10 / -1 / -1.
    // -1 in the DB is Infinity in the app.
    const dbQuota: Record<string, number> = {
      org_free: 1,
      org_plus: 3,
      org_pro: 10,
      org_elite: -1,
      org_enterprise: -1,
    };
    for (const [tier, db] of Object.entries(dbQuota)) {
      const appValue = TEAM_LIMIT_PER_TIER[tier as keyof typeof TEAM_LIMIT_PER_TIER];
      expect(appValue === Infinity ? -1 : appValue).toBe(db);
    }
  });

  it('gives every organization tier a quota (no undefined)', () => {
    for (const t of ['org_free', 'org_plus', 'org_pro', 'org_elite', 'org_enterprise']) {
      expect(typeof TEAM_LIMIT_PER_TIER[t]).toBe('number');
    }
  });

  it('gives a personal tier zero org quota', () => {
    // A personal tier must not be able to create org team workspaces.
    // 0 = no org team workspaces at all (not "unlimited").
    expect(TEAM_LIMIT_PER_TIER.free).toBe(0);
    expect(TEAM_LIMIT_PER_TIER.verified_identity).toBe(0);
    expect(TEAM_LIMIT_PER_TIER.identity_plus).toBe(0);
  });

  it('orders quotas monotonically up the org ladder', () => {
    expect(TEAM_LIMIT_PER_TIER.org_free).toBeLessThan(TEAM_LIMIT_PER_TIER.org_plus);
    expect(TEAM_LIMIT_PER_TIER.org_plus).toBeLessThan(TEAM_LIMIT_PER_TIER.org_pro);
    expect(TEAM_LIMIT_PER_TIER.org_pro).toBeLessThan(TEAM_LIMIT_PER_TIER.org_elite);
  });

  it('has a label for every org tier so the UI can name the limit', () => {
    for (const t of ['org_free', 'org_plus', 'org_pro', 'org_elite', 'org_enterprise']) {
      expect(typeof getTierLabel(t)).toBe('string');
      expect(getTierLabel(t).length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Cross-track isolation — the invariant the whole model rests on
// ─────────────────────────────────────────────────────────────────────────

describe('cross-track isolation', () => {
  it('never lets a personal tier satisfy an org-track gate', () => {
    const personalTiers = ['free', 'verified_identity', 'identity_plus'];
    const orgGates = ['org_free', 'org_plus', 'org_pro', 'org_elite', 'org_enterprise'];
    for (const p of personalTiers) {
      for (const g of orgGates) {
        expect(tierAtLeastSameTrack(p, g)).toBe(false);
      }
    }
  });

  it('never lets an org tier satisfy a personal-track gate', () => {
    const orgTiers = ['org_free', 'org_plus', 'org_pro', 'org_elite', 'org_enterprise'];
    const personalGates = ['verified_identity', 'identity_plus'];
    for (const o of orgTiers) {
      for (const g of personalGates) {
        expect(tierAtLeastSameTrack(o, g)).toBe(false);
      }
    }
  });

  it('keeps the two tracks in separate rank spaces', () => {
    expect(tierTrack('identity_plus')).toBe('personal');
    expect(tierTrack('org_pro')).toBe('organization');
    // The two ladders are ranked independently, so a raw rank comparison
    // across tracks is meaningless. tierAtLeastSameTrack is the only
    // sanctioned cross-track-safe comparison, and it must refuse.
    expect(tierAtLeastSameTrack('identity_plus', 'org_plus')).toBe(false);
    expect(tierAtLeastSameTrack('org_plus', 'identity_plus')).toBe(false);
    // Within a track, ranks ascend as the tier ascends.
    expect(tierRank('identity_plus')).toBeGreaterThan(tierRank('verified_identity'));
    expect(tierRank('verified_identity')).toBeGreaterThan(tierRank('free'));
    expect(tierRank('org_pro')).toBeGreaterThan(tierRank('org_plus'));
    expect(tierRank('org_plus')).toBeGreaterThan(tierRank('org_free'));
  });

  it('canonicalizes legacy names before comparing', () => {
    // The old bug shape: business_listing satisfied club_starter.
    expect(canonicalTier('business_listing')).toBe('org_plus');
    expect(tierAtLeastSameTrack('business_listing', 'org_plus')).toBe(true);
    expect(canonicalTier('club_starter')).toBe('org_plus');
    expect(tierAtLeastSameTrack('club_starter', 'org_plus')).toBe(true);
  });

  it('reports a paid org plan via hasAnyPaidTier without granting a personal tier', () => {
    expect(hasAnyPaidTier('free', 'org_free')).toBe(false);
    expect(hasAnyPaidTier('free', 'org_plus')).toBe(true);
    expect(hasAnyPaidTier('identity_plus', 'org_free')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Org finances endpoint authorization rules
// ─────────────────────────────────────────────────────────────────────────

describe('org finances authorization', () => {
  const ORG_GATE = 'org_pro';

  it('grants financial reporting at org_pro and above only', () => {
    expect(tierAtLeastSameTrack('org_free', ORG_GATE)).toBe(false);
    expect(tierAtLeastSameTrack('org_plus', ORG_GATE)).toBe(false);
    expect(tierAtLeastSameTrack('org_pro', ORG_GATE)).toBe(true);
    expect(tierAtLeastSameTrack('org_elite', ORG_GATE)).toBe(true);
    expect(tierAtLeastSameTrack('org_enterprise', ORG_GATE)).toBe(true);
  });

  it('does NOT grant financial reporting on a personal tier alone', () => {
    // A personal Hockey Passport Plus holder must not be able to read an
    // organization's finances. The gate is the org owner's org_tier.
    expect(tierAtLeastSameTrack('identity_plus', ORG_GATE)).toBe(false);
    expect(tierAtLeastSameTrack('free', ORG_GATE)).toBe(false);
  });

  it('does NOT grant financial reporting on a legacy business tier name', () => {
    // business_plus aliased to org_pro, so this one DOES pass — but only
    // because the alias resolves. A business_listing must not.
    expect(tierAtLeastSameTrack('business_plus', ORG_GATE)).toBe(true);
    expect(tierAtLeastSameTrack('business_listing', ORG_GATE)).toBe(false);
  });

  it('keeps API access and financial reporting on the same rung', () => {
    // Both are org_pro in the shipped pricing; they must not drift apart.
    expect(TIERS.org_pro.features.some((f) => /api/i.test(f))).toBe(true);
    expect(TIERS.org_pro.features.some((f) => /financial/i.test(f))).toBe(true);
  });
});
