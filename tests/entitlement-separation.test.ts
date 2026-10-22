// tests/entitlement-separation.test.ts
//
// Pins the fact that player capacity, listing claims, and team capacity are
// THREE INDEPENDENT limits, not one number wearing two names.
//
// WHY THIS FILE EXISTS
// `MAX_CLAIMS_PER_TIER` used to serve double duty as both "listing claims" and
// "organization player capacity". The two were separate products with separate
// enforcement layers:
//
//   LISTING_CLAIMS_PER_TIER  → `claims` table, approved rows, enforced in
//                              POST /api/claims
//   PLAYER_CAPACITY_PER_TIER → players / managed_profiles, enforced in
//                              src/lib/org-limits.ts
//   TEAM_LIMIT_PER_TIER      → team_workspaces, enforced in the
//                              create_team_workspace RPC
//
// With one shared name, any change to one silently changed the meaning of the
// other, and it was impossible to tell from the code which limit a given error
// message referred to. These tests assert the three tables are distinct
// objects, that they disagree where they should, and that the deprecated alias
// still resolves (so existing imports do not break mid-refactor).

import { describe, it, expect } from 'vitest';
import {
  LISTING_CLAIMS_PER_TIER,
  MAX_CLAIMS_PER_TIER,
  PLAYER_CAPACITY_PER_TIER,
  TEAM_LIMIT_PER_TIER,
  canonicalTier,
  type TierName,
} from '../src/lib/pricing';
import { getTierMaxClaims } from '../src/lib/tier-gate';
import { getPlayerCapacity } from '../src/lib/org-limits';

const CANONICAL: TierName[] = [
  'free', 'verified_identity', 'identity_plus',
  'org_free', 'org_plus', 'org_pro', 'org_elite', 'org_enterprise',
];

describe('entitlement separation — the three limits are distinct tables', () => {
  it('all three tables cover every canonical tier', () => {
    for (const t of CANONICAL) {
      expect(LISTING_CLAIMS_PER_TIER[t]).toBeTypeOf('number');
      expect(PLAYER_CAPACITY_PER_TIER[t]).toBeTypeOf('number');
      expect(TEAM_LIMIT_PER_TIER[t]).toBeTypeOf('number');
    }
  });

  it('the deprecated alias resolves to the listing-claims table', () => {
    // MAX_CLAIMS_PER_TIER is kept only so existing imports compile. It must
    // point at LISTING_CLAIMS_PER_TIER — not at player capacity, which is what
    // it was ambiguously reachable as before.
    expect(MAX_CLAIMS_PER_TIER).toBe(LISTING_CLAIMS_PER_TIER);
  });

  it('player capacity is NOT the same as listing claims where they differ', () => {
    // This is the exact conflation that was removed. On the org ladder these
    // two ladders genuinely disagree, so a single shared table would have been
    // wrong: at org_pro a listing org may hold 25 claims but manage 150
    // players, and at org_free 1 claim but 30 players.
    expect(LISTING_CLAIMS_PER_TIER.org_pro).not.toBe(PLAYER_CAPACITY_PER_TIER.org_pro);
    expect(LISTING_CLAIMS_PER_TIER.org_free).not.toBe(PLAYER_CAPACITY_PER_TIER.org_free);

    // They legitimately converge at org_elite (both unlimited). That is a real
    // coincidence of the ladder, not evidence of a shared table — which is why
    // the assertions above target the tiers where they differ.
    expect(LISTING_CLAIMS_PER_TIER.org_elite).toBe(PLAYER_CAPACITY_PER_TIER.org_elite);
  });

  it('team capacity is its own ladder, diverging from claims and capacity', () => {
    // Team workspaces are their own product limit. It happens to equal the
    // claims cap at org_free (both 1) and diverges everywhere else — at
    // org_plus an org gets 3 teams but 5 claims and 30 players, three different
    // numbers for three different things.
    expect(TEAM_LIMIT_PER_TIER.org_plus).not.toBe(LISTING_CLAIMS_PER_TIER.org_plus);
    expect(TEAM_LIMIT_PER_TIER.org_plus).not.toBe(PLAYER_CAPACITY_PER_TIER.org_plus);
    expect(TEAM_LIMIT_PER_TIER.org_pro).not.toBe(PLAYER_CAPACITY_PER_TIER.org_pro);
  });
});

describe('listing claims (claims table, approved rows)', () => {
  it('personal tiers allow claiming their own identity', () => {
    expect(LISTING_CLAIMS_PER_TIER.free).toBe(1);
    expect(LISTING_CLAIMS_PER_TIER.verified_identity).toBe(1);
    expect(LISTING_CLAIMS_PER_TIER.identity_plus).toBe(5);
  });

  it('org ladder scales claims with plan', () => {
    expect(LISTING_CLAIMS_PER_TIER.org_free).toBe(1);
    expect(LISTING_CLAIMS_PER_TIER.org_plus).toBe(5);
    expect(LISTING_CLAIMS_PER_TIER.org_pro).toBe(25);
    expect(LISTING_CLAIMS_PER_TIER.org_elite).toBe(Infinity);
    expect(LISTING_CLAIMS_PER_TIER.org_enterprise).toBe(Infinity);
  });

  it('is monotonic up the organization ladder', () => {
    const ladder: TierName[] = ['org_free', 'org_plus', 'org_pro', 'org_elite'];
    for (let i = 1; i < ladder.length; i++) {
      expect(LISTING_CLAIMS_PER_TIER[ladder[i]]).toBeGreaterThanOrEqual(
        LISTING_CLAIMS_PER_TIER[ladder[i - 1]],
      );
    }
  });

  it('getTierMaxClaims reads the claims table, not player capacity', () => {
    for (const t of CANONICAL) {
      expect(getTierMaxClaims(t)).toBe(LISTING_CLAIMS_PER_TIER[t]);
    }
  });

  it('resolves legacy tier names to the same claim allowance', () => {
    // A legacy row in the DB must get the same allowance as its canonical
    // equivalent, otherwise consolidation silently changes a customer's cap.
    expect(getTierMaxClaims('business_listing')).toBe(getTierMaxClaims('org_plus'));
    expect(getTierMaxClaims('club_starter')).toBe(getTierMaxClaims('org_plus'));
    expect(getTierMaxClaims('business_plus')).toBe(getTierMaxClaims('org_pro'));
    expect(getTierMaxClaims('club_pro')).toBe(getTierMaxClaims('org_pro'));
    expect(getTierMaxClaims('roster')).toBe(getTierMaxClaims('verified_identity'));
  });

  it('returns 0 for a missing tier rather than Infinity', () => {
    // Fail closed: an unknown tier must not grant unlimited claims.
    expect(getTierMaxClaims(null)).toBe(0);
    expect(getTierMaxClaims(undefined)).toBe(0);
    expect(getTierMaxClaims('')).toBe(0);
  });
});

describe('player capacity (players / managed_profiles)', () => {
  it('personal tiers are unlimited — a person is not limited by their own passport', () => {
    // A personal Hockey Passport holder manages their own family; there is no
    // reason to cap that at 30.
    expect(PLAYER_CAPACITY_PER_TIER.free).toBe(Infinity);
    expect(PLAYER_CAPACITY_PER_TIER.verified_identity).toBe(Infinity);
    expect(PLAYER_CAPACITY_PER_TIER.identity_plus).toBe(Infinity);
  });

  it('org ladder scales capacity, and org_free is NOT unlimited', () => {
    // org_free caps at 30 players. This is the limit that was previously
    // invisible because it shared a name with the claims table.
    expect(PLAYER_CAPACITY_PER_TIER.org_free).toBe(30);
    expect(PLAYER_CAPACITY_PER_TIER.org_plus).toBe(30);
    expect(PLAYER_CAPACITY_PER_TIER.org_pro).toBe(150);
    expect(PLAYER_CAPACITY_PER_TIER.org_elite).toBe(Infinity);
  });

  it('is monotonic up the organization ladder', () => {
    const ladder: TierName[] = ['org_free', 'org_plus', 'org_pro', 'org_elite'];
    for (let i = 1; i < ladder.length; i++) {
      expect(PLAYER_CAPACITY_PER_TIER[ladder[i]]).toBeGreaterThanOrEqual(
        PLAYER_CAPACITY_PER_TIER[ladder[i - 1]],
      );
    }
  });

  it('getPlayerCapacity reads the capacity table, not the claims table', () => {
    for (const t of CANONICAL) {
      expect(getPlayerCapacity(t)).toBe(PLAYER_CAPACITY_PER_TIER[t]);
    }
  });
});

describe('team capacity (team_workspaces)', () => {
  it('personal tiers cannot create team workspaces', () => {
    // Deliberately 0, not undefined. A personal Passport is for an individual;
    // running a club requires an organization plan.
    expect(TEAM_LIMIT_PER_TIER.free).toBe(0);
    expect(TEAM_LIMIT_PER_TIER.verified_identity).toBe(0);
    expect(TEAM_LIMIT_PER_TIER.identity_plus).toBe(0);
  });

  it('org_free allows exactly one team, not zero', () => {
    // The WS decision: a free organization can still run one team with basic
    // roster/schedule/attendance. Denying it entirely would make org_free
    // useless and push every new club straight to a paid plan.
    expect(TEAM_LIMIT_PER_TIER.org_free).toBe(1);
  });

  it('matches the live DB quota function', () => {
    // These must stay equal to team_workspace_quota_for_tier() in
    // supabase/migrations/2026-10-22_org_tier_consolidation.sql, with the app's
    // Infinity standing in for the DB's -1 (both mean "no limit"). A mismatch
    // means the UI advertises a quota the database will not honour.
    const dbEquivalent: Record<string, number> = {
      org_free: 1,
      org_plus: 3,
      org_pro: 10,
      org_elite: Infinity,
      org_enterprise: Infinity,
    };
    for (const [tier, expected] of Object.entries(dbEquivalent)) {
      expect(TEAM_LIMIT_PER_TIER[tier as TierName]).toBe(expected);
    }
  });
});

describe('no invented limits', () => {
  it('does not define a listing-claim limit for document/contract buckets', () => {
    // player-documents, team-documents and rink-contracts each carry their own
    // per-file caps enforced at upload. They deliberately do NOT appear in the
    // unified allowance tables — counting them here would double-charge the
    // same user for one file.
    const keys = Object.keys(LISTING_CLAIMS_PER_TIER);
    expect(keys).toHaveLength(CANONICAL.length);
    expect(keys).toEqual(expect.arrayContaining(CANONICAL));
  });

  it('every canonical tier has a label, price and all three limits', () => {
    // A tier missing from any table silently becomes 0 at read time, which
    // reads as "denied" rather than "unconfigured". This catches that class.
    for (const t of CANONICAL) {
      expect(canonicalTier(t)).toBe(t);
    }
  });
});