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

  it('rejects forbidden characters', () => {
    expect(isValidPassportIdFormat('RS1-0000000000000000')).toBe(false);
    expect(isValidPassportIdFormat('RS1-OOOOOOOOOOOOOOOO')).toBe(false);
    expect(isValidPassportIdFormat('RS1-1IIIIIIIIIIIIIII')).toBe(false);
  });

  it('rejects non-string types', () => {
    expect(isValidPassportIdFormat(123 as unknown as string)).toBe(false);
    expect(isValidPassportIdFormat({} as unknown as string)).toBe(false);
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