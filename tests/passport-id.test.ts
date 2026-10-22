/**
 * tests/passport-id.test.ts
 *
 * Tests for Passport ID generation, validation, and normalization.
 * Run with: pnpm test
 *
 * These tests are pure (no DB, no network) so they're fast and safe to run
 * in any environment.
 */

import { describe, it, expect } from 'vitest';
import {
  generatePassportId,
  isValidPassportIdFormat,
  normalizePassportId,
} from '@/lib/passport/01-passport-id';

describe('Passport ID generation', () => {
  it('generates a valid RS1-format ID', () => {
    const id = generatePassportId();
    expect(id).toMatch(/^RS1-[A-Z2-9]{16}$/);
  });

  it('produces unique IDs on repeated calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generatePassportId());
    }
    // No collisions in 1000 IDs (probability of 1 collision is 1 in 2^40 / 1000)
    expect(ids.size).toBe(1000);
  });

  it('excludes confusing characters (0, O, 1, I)', () => {
    // Run many times and verify none contain the confusing chars.
    for (let i = 0; i < 100; i++) {
      const id = generatePassportId();
      // The encoded part is after the dash
      const encoded = id.split('-')[1];
      expect(encoded).not.toMatch(/[0O1I]/);
    }
  });

  it('starts with the RS1 prefix', () => {
    for (let i = 0; i < 10; i++) {
      const id = generatePassportId();
      expect(id.startsWith('RS1-')).toBe(true);
    }
  });

  it('is exactly 20 characters long', () => {
    const id = generatePassportId();
    // "RS1-" (4) + 16 base32 chars = 20 total
    expect(id.length).toBe(20);
  });
});

describe('isValidPassportIdFormat', () => {
  it('accepts a freshly generated ID', () => {
    const id = generatePassportId();
    expect(isValidPassportIdFormat(id)).toBe(true);
  });

  it('accepts lowercase input (case-insensitive)', () => {
    const id = generatePassportId().toLowerCase();
    expect(isValidPassportIdFormat(id)).toBe(true);
  });

  it('rejects null', () => {
    expect(isValidPassportIdFormat(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isValidPassportIdFormat(undefined)).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidPassportIdFormat('')).toBe(false);
  });

  it('rejects wrong prefix', () => {
    expect(isValidPassportIdFormat('XX1-K7X9P2M4N6Q8R')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidPassportIdFormat('RS1-K7X9P2M4N6Q')).toBe(false);
  });

  it('rejects non-string types', () => {
    expect(isValidPassportIdFormat(123 as unknown as string)).toBe(false);
    expect(isValidPassportIdFormat({} as unknown as string)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // The confusing-character cases
  //
  // This block previously asserted that IDs containing 0, O, 1, I must be
  // REJECTED. That expectation was wrong, and it was wrong in a way that
  // mattered: it contradicted both the implementation and production data.
  //
  // The implementation deliberately uses two different alphabets:
  //
  //   GENERATION  ALPHABET_REFINED — excludes 0, O, 1, I so newly minted IDs
  //               are unambiguous when read off a printed card.
  //   VALIDATION  /^[A-Z0-9]{12,32}$/i — deliberately BROADER, accepting the
  //               full A-Z and 0-9 set.
  //
  // The reason for the broader validation alphabet is legacy and seeded rows.
  // Verified against production on 2026-10-23: the passports table contains
  // exactly one row, `RS1-DEMOPLAYER01`, which contains a literal 0 and 1. If
  // validation excluded those characters, that passport could never be looked
  // up by ID. Generation chooses the readable alphabet; validation must not
  // second-guess it, because a seeded or migrated row did not go through the
  // generator.
  //
  // Existence is enforced by the passports primary key, not by this regex. The
  // regex is a sanity check on shape, not a content policy.
  // -------------------------------------------------------------------------

  it('ACCEPTS the real production passport ID (contains 0 and 1)', () => {
    // The only passport_id in production as of 2026-10-23. This test is the
    // regression guard: if the validation alphabet is ever tightened back to
    // the generation alphabet, this fails immediately instead of silently
    // breaking every seeded or legacy passport.
    expect(isValidPassportIdFormat('RS1-DEMOPLAYER01')).toBe(true);
  });

  it('accepts any well-shaped suffix over the full A-Z0-9 alphabet', () => {
    // The generation alphabet is a subset of the validation alphabet. Anything
    // the generator can produce must validate.
    expect(isValidPassportIdFormat('RS1-0000000000000000')).toBe(true);
    expect(isValidPassportIdFormat('RS1-OOOOOOOOOOOOOOOO')).toBe(true);
    expect(isValidPassportIdFormat('RS1-1IIIIIIIIIIIIIII')).toBe(true);
    expect(isValidPassportIdFormat('RS1-IIIIIIIIIIIIIIII')).toBe(true);
  });

  it('still rejects genuinely malformed input', () => {
    // Validation is a shape check. Relaxing the alphabet must not turn the
    // validator into a no-op.
    expect(isValidPassportIdFormat('RS1-')).toBe(false);
    expect(isValidPassportIdFormat('RS1-SHORT')).toBe(false);
    expect(isValidPassportIdFormat('RS1-HAS-A-DASH-XX')).toBe(false);
    expect(isValidPassportIdFormat('RS1-HAS UNDERSCORE_1')).toBe(false);
    expect(isValidPassportIdFormat('RS1-HAS-SPACE 1')).toBe(false);
    expect(isValidPassportIdFormat('RS1-HAS!BANG')).toBe(false);
    // Length bound: 12-32 chars after the prefix. 33 chars must be rejected.
    expect(isValidPassportIdFormat(`RS1-${'A'.repeat(33)}`)).toBe(false);
    expect(isValidPassportIdFormat(`RS1-${'A'.repeat(12)}`)).toBe(true);
    expect(isValidPassportIdFormat(`RS1-${'A'.repeat(32)}`)).toBe(true);
  });

  it('every generated ID validates', () => {
    // Guards the two alphabets staying compatible in both directions.
    for (let i = 0; i < 200; i++) {
      expect(isValidPassportIdFormat(generatePassportId())).toBe(true);
    }
  });
});

describe('normalizePassportId', () => {
  it('returns uppercase form for valid input', () => {
    const id = generatePassportId();
    const lower = id.toLowerCase();
    expect(normalizePassportId(lower)).toBe(id);
  });

  it('returns null for invalid input', () => {
    expect(normalizePassportId('garbage')).toBeNull();
    expect(normalizePassportId(null)).toBeNull();
    expect(normalizePassportId(undefined)).toBeNull();
    expect(normalizePassportId('')).toBeNull();
  });

  it('preserves valid uppercase input', () => {
    const id = generatePassportId();
    expect(normalizePassportId(id)).toBe(id);
  });
});