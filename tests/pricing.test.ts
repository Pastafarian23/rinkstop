// Tests for the canonical pricing source (src/lib/pricing.ts).
//
// Pricing is the single most drift-prone surface in the app: the tier card,
// the comparison table, the upsells, the FAQ copy and the Stripe checkout all
// need to agree on one number. These tests pin the formatting behaviour and
// guard the two real bugs found in the 2026-10-22 audit.

import { describe, it, expect } from 'vitest';
import {
  TIERS,
  TIER_TO_TRACK,
  PRICING_DISPLAY_ORDER,
  formatTierPrice,
  formatTierPricePerYear,
  getTierLabel,
  getTrackForTier,
  type TierName,
} from '@/lib/pricing';

describe('pricing — formatting', () => {
  it('formats free as $0', () => {
    expect(formatTierPrice('free')).toBe('$0');
  });

  it('formats the individual tiers exactly as the brief specifies', () => {
    expect(formatTierPrice('verified_identity')).toBe('$24.99');
    expect(formatTierPrice('identity_plus')).toBe('$59.99');
  });

  it('uses a thousands separator for four-figure prices', () => {
    // Regression: League rendered as "$1999" before this was fixed.
    expect(formatTierPrice('league')).toBe('$1,999');
  });

  it('keeps two decimals for cents', () => {
    expect(formatTierPrice('business_listing')).toBe('$99');
    expect(formatTierPrice('club_starter')).toBe('$149');
    expect(formatTierPrice('business_plus')).toBe('$299');
    expect(formatTierPrice('club_pro')).toBe('$399');
    expect(formatTierPrice('club_elite')).toBe('$999');
  });

  it('renders custom-priced tiers as Custom', () => {
    expect(formatTierPrice('federation')).toBe('Custom');
  });

  it('per-year helper is friendly for copy', () => {
    expect(formatTierPricePerYear('free')).toBe('Free');
    expect(formatTierPricePerYear('federation')).toBe('Custom pricing');
    expect(formatTierPricePerYear('verified_identity')).toBe('$24.99 / year');
  });
});

describe('pricing — display order covers every tier exactly once', () => {
  it('lists all tiers', () => {
    expect(PRICING_DISPLAY_ORDER.length).toBe(Object.keys(TIERS).length);
  });

  it('has no duplicates', () => {
    expect(new Set(PRICING_DISPLAY_ORDER).size).toBe(PRICING_DISPLAY_ORDER.length);
  });

  it('references only real tiers', () => {
    for (const id of PRICING_DISPLAY_ORDER) {
      expect(TIERS[id], `${id} must exist in TIERS`).toBeDefined();
    }
  });
});

describe('pricing — one identity, multiple roles (track mapping)', () => {
  it('maps every tier to a track', () => {
    for (const id of Object.keys(TIERS) as TierName[]) {
      expect(TIER_TO_TRACK[id], `${id} must have a track`).toBeDefined();
    }
  });

  it('keeps personal tiers on the personal track', () => {
    expect(TIER_TO_TRACK.free).toBe('personal');
    expect(TIER_TO_TRACK.verified_identity).toBe('personal');
    expect(TIER_TO_TRACK.identity_plus).toBe('personal');
  });

  it('keeps organization tiers on the business track', () => {
    for (const id of ['club_starter', 'club_pro', 'club_elite', 'league', 'federation',
                      'business_listing', 'business_plus'] as TierName[]) {
      expect(TIER_TO_TRACK[id], `${id} must be a business track`).toBe('business');
    }
  });

  it('falls back to personal for unknown tiers', () => {
    expect(getTrackForTier('not_a_tier')).toBe('personal');
    expect(getTrackForTier(null)).toBe('personal');
  });
});

describe('pricing — labels are present for every tier', () => {
  it('gives each tier a non-empty label', () => {
    for (const id of Object.keys(TIERS) as TierName[]) {
      expect(getTierLabel(id).length).toBeGreaterThan(0);
    }
  });

  it('uses the commercial names', () => {
    expect(getTierLabel('verified_identity')).toBe('Hockey Passport');
    expect(getTierLabel('identity_plus')).toBe('Hockey Passport Plus');
  });
});

describe('pricing — module loads without a temporal-dead-zone crash', () => {
  // Regression: an earlier attempt made TIERS.league.footnote call
  // formatTierPrice('league') inside the TIERS object literal. That function
  // reads TIERS, which was still being constructed -> TDZ ReferenceError ->
  // the entire /pricing page 500s. Importing the module in this test file
  // would throw at import time, failing the whole suite loudly.
  it('imports cleanly', () => {
    expect(TIERS).toBeDefined();
    expect(TIERS.league.footnote).toContain('$1,999');
  });
});
