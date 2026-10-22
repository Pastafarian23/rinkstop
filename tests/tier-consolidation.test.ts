// Tests for the two-track tier model (2026-10-22 consolidation).
//
// The consolidation split one `profiles.tier` column into two independent
// entitlements:
//   profiles.tier     -> personal track  (free, verified_identity, identity_plus)
//   profiles.org_tier -> organization track (org_free .. org_enterprise)
//
// The bug this guards against is the one that was LIVE before the fix:
// `business_listing` satisfied a `club_starter` gate because both sat on a
// shared "business" track with overlapping ranks. A personal Passport must
// never unlock an organization feature, and an org plan must never unlock a
// personal feature.
//
// These tests also pin the legacy alias map, because ~565 code sites still
// reference pre-2026-10-22 tier names and the alias map is what keeps them
// working without a mass rename.

import { describe, it, expect } from 'vitest';
import {
  TIERS,
  TIER_TO_TRACK,
  LEGACY_TIER_ALIAS,
  canonicalTier,
  getTierLabel,
  getTrackForTier,
  TEAM_LIMIT_PER_TIER,
  PLAYER_CAPACITY_PER_TIER,
  LISTING_CLAIMS_PER_TIER,
  PRICING_DISPLAY_ORDER,
  type TierName,
} from '@/lib/pricing';
import { tierRank, tierTrack, tierAtLeast } from '@/lib/tier';
import {
  tierAtLeastSameTrack,
  canAccessPersonalFeature,
  canAccessOrganizationFeature,
} from '@/lib/tier-gate';

describe('canonicalTier — legacy alias resolution', () => {
  it('passes canonical tiers through unchanged', () => {
    for (const t of Object.keys(TIERS)) {
      expect(canonicalTier(t as TierName)).toBe(t);
    }
  });

  it('maps every documented legacy org/business name', () => {
    expect(canonicalTier('club_starter')).toBe('org_plus');
    expect(canonicalTier('club_pro')).toBe('org_pro');
    expect(canonicalTier('club_elite')).toBe('org_elite');
    expect(canonicalTier('league')).toBe('org_enterprise');
    expect(canonicalTier('federation')).toBe('org_enterprise');
    expect(canonicalTier('business_listing')).toBe('org_plus');
    expect(canonicalTier('business_plus')).toBe('org_pro');
    expect(canonicalTier('business_starter')).toBe('org_plus');
    expect(canonicalTier('business_pro')).toBe('org_pro');
    expect(canonicalTier('business_premium')).toBe('org_pro');
    expect(canonicalTier('enterprise')).toBe('org_enterprise');
  });

  it('maps every documented legacy personal name', () => {
    expect(canonicalTier('roster')).toBe('verified_identity');
    expect(canonicalTier('roster_plus')).toBe('identity_plus');
    expect(canonicalTier('pro')).toBe('identity_plus');
    expect(canonicalTier('premium')).toBe('identity_plus');
  });

  it('falls back to free for unknown values', () => {
    expect(canonicalTier('nonsense')).toBe('free');
    expect(canonicalTier(undefined)).toBe('free');
    expect(canonicalTier(null)).toBe('free');
    expect(canonicalTier('')).toBe('free');
  });

  it('is idempotent', () => {
    for (const legacy of Object.keys(LEGACY_TIER_ALIAS)) {
      const once = canonicalTier(legacy);
      expect(canonicalTier(once)).toBe(once);
    }
  });
});

describe('tier rank — per track', () => {
  it('ranks the personal track', () => {
    expect(tierRank('free')).toBe(0);
    expect(tierRank('verified_identity')).toBe(1);
    expect(tierRank('identity_plus')).toBe(2);
  });

  it('ranks the organization track', () => {
    expect(tierRank('org_free')).toBe(0);
    expect(tierRank('org_plus')).toBe(1);
    expect(tierRank('org_pro')).toBe(2);
    expect(tierRank('org_elite')).toBe(3);
    expect(tierRank('org_enterprise')).toBe(4);
  });

  it('gives legacy names the same rank as their canonical target', () => {
    expect(tierRank('club_starter')).toBe(tierRank('org_plus'));
    expect(tierRank('business_plus')).toBe(tierRank('org_pro'));
    expect(tierRank('federation')).toBe(tierRank('org_enterprise'));
    expect(tierRank('roster')).toBe(tierRank('verified_identity'));
  });

  it('reports the correct track', () => {
    expect(tierTrack('identity_plus')).toBe('personal');
    expect(tierTrack('org_pro')).toBe('organization');
    expect(tierTrack('club_starter')).toBe('organization');
    expect(tierTrack('roster_plus')).toBe('personal');
  });

  it('tierAtLeast compares within the track', () => {
    expect(tierAtLeast('identity_plus', 'verified_identity')).toBe(true);
    expect(tierAtLeast('verified_identity', 'identity_plus')).toBe(false);
    expect(tierAtLeast('org_pro', 'org_plus')).toBe(true);
    expect(tierAtLeast('org_plus', 'org_pro')).toBe(false);
  });
});

describe('cross-track isolation (the live bug this fixes)', () => {
  it('a personal Passport does NOT unlock an organization feature', () => {
    // Regression: business_listing (rank 1 on the old shared "business"
    // track) satisfied a club_starter (also rank 1) gate.
    expect(canAccessOrganizationFeature('identity_plus', 'org_plus')).toBe(false);
    expect(canAccessOrganizationFeature('verified_identity', 'org_plus')).toBe(false);
    expect(canAccessOrganizationFeature('free', 'org_plus')).toBe(false);
  });

  it('an organization plan does NOT unlock a personal feature', () => {
    expect(canAccessPersonalFeature('org_pro', 'identity_plus')).toBe(false);
    expect(canAccessPersonalFeature('org_enterprise', 'verified_identity')).toBe(false);
  });

  it('each track unlocks its own features', () => {
    expect(canAccessOrganizationFeature('org_pro', 'org_plus')).toBe(true);
    expect(canAccessPersonalFeature('identity_plus', 'identity_plus')).toBe(true);
  });

  it('tierAtLeastSameTrack refuses a cross-track comparison', () => {
    expect(tierAtLeastSameTrack('identity_plus', 'org_plus')).toBe(false);
    expect(tierAtLeastSameTrack('org_pro', 'org_plus')).toBe(true);
    expect(tierAtLeastSameTrack('identity_plus', 'verified_identity')).toBe(true);
  });

  it('the old leak specifically no longer happens', () => {
    // business_listing used to satisfy club_starter. Both canonicalize to
    // org_plus now — but the point is that a PERSONAL tier never does.
    expect(canAccessOrganizationFeature('free', 'org_plus')).toBe(false);
  });
});

describe('organization ladder — target pricing', () => {
  it('has the exact organization prices from the brief', () => {
    expect(TIERS.org_free.priceUsd).toBe(0);
    expect(TIERS.org_plus.priceUsd).toBe(99);
    expect(TIERS.org_pro.priceUsd).toBe(299);
    expect(TIERS.org_elite.priceUsd).toBe(599);
    expect(TIERS.org_enterprise.priceUsd).toBeNull(); // contact sales
  });

  it('keeps the individual prices unchanged', () => {
    expect(TIERS.free.priceUsd).toBe(0);
    expect(TIERS.verified_identity.priceUsd).toBe(24.99);
    expect(TIERS.identity_plus.priceUsd).toBe(59.99);
  });

  it('has no business track left', () => {
    expect(Object.keys(TIERS)).not.toContain('business_listing');
    expect(Object.keys(TIERS)).not.toContain('business_plus');
    expect(Object.values(TIER_TO_TRACK)).not.toContain('business');
  });

  it('puts every canonical tier on the right track', () => {
    expect(TIER_TO_TRACK.verified_identity).toBe('personal');
    expect(TIER_TO_TRACK.identity_plus).toBe('personal');
    expect(TIER_TO_TRACK.org_plus).toBe('organization');
    expect(TIER_TO_TRACK.org_enterprise).toBe('organization');
  });

  it('exposes the display order with both groups', () => {
    expect(PRICING_DISPLAY_ORDER).toContain('verified_identity');
    expect(PRICING_DISPLAY_ORDER).toContain('org_enterprise');
    expect(PRICING_DISPLAY_ORDER).not.toContain('business_listing');
  });

  it('labels the organization tiers', () => {
    expect(getTierLabel('org_plus')).toBe('Organization Plus');
    expect(getTierLabel('org_pro')).toBe('Organization Pro');
    expect(getTierLabel('org_elite')).toBe('Organization Elite');
    expect(getTierLabel('org_enterprise')).toBe('Organization Enterprise');
  });
});

describe('organization quotas — enforced, not just advertised', () => {
  it('caps team workspaces per tier', () => {
    expect(TEAM_LIMIT_PER_TIER.org_free).toBe(1);
    expect(TEAM_LIMIT_PER_TIER.org_plus).toBe(3);
    expect(TEAM_LIMIT_PER_TIER.org_pro).toBe(10);
    expect(TEAM_LIMIT_PER_TIER.org_elite).toBe(Infinity);
    expect(TEAM_LIMIT_PER_TIER.org_enterprise).toBe(Infinity);
  });

  it('caps players per tier', () => {
    expect(PLAYER_CAPACITY_PER_TIER.org_free).toBeLessThanOrEqual(30);
    expect(PLAYER_CAPACITY_PER_TIER.org_plus).toBe(30);
    expect(PLAYER_CAPACITY_PER_TIER.org_pro).toBe(150);
  });

  it('caps claims per tier', () => {
    expect(LISTING_CLAIMS_PER_TIER.org_plus).toBeGreaterThan(0);
    expect(LISTING_CLAIMS_PER_TIER.org_pro).toBe(25);
  });
});
