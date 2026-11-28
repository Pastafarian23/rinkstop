import { describe, expect, it } from 'vitest';
import { formatHighlightDate } from '@/lib/highlight-date';

const ORIGINAL_TZ = process.env.TZ;
// 20:00 UTC: already the next calendar day in Asia/Manila (UTC+8).
const LATE_UTC = '2026-10-15T20:00:00Z';

function inZone(tz: string, fn: () => string): string {
  process.env.TZ = tz; // Node re-reads TZ at runtime for Date formatting
  try { return fn(); } finally { process.env.TZ = ORIGINAL_TZ; }
}

describe('formatHighlightDate (hydration-safe)', () => {
  it('gives the same date in UTC and in a UTC+8 viewer timezone', () => {
    const server = inZone('UTC', () => formatHighlightDate(LATE_UTC));
    const browser = inZone('Asia/Manila', () => formatHighlightDate(LATE_UTC));
    expect(server).toBe('10/15/2026');
    expect(browser).toBe(server);
  });
  it('gives the same date across a western timezone', () => {
    expect(inZone('America/Chicago', () => formatHighlightDate(LATE_UTC))).toBe('10/15/2026');
  });
});

import { readFileSync } from 'node:fs';
describe('HighlightsGrid date rendering', () => {
  it('does not call toLocaleDateString() without a timezone (server/client mismatch)', () => {
    const src = readFileSync(new URL('../src/components/HighlightsGrid.tsx', import.meta.url), 'utf8');
    expect(src).not.toMatch(/toLocaleDateString\(\s*\)/);
    expect(src).toContain('formatHighlightDate(');
  });
});
