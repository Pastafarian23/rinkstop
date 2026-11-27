import { describe, expect, it } from 'vitest';
import { knownCount, leagueSummary } from '@/lib/directory-heading';

describe('knownCount', () => {
  it('returns positive finite numbers, floored', () => {
    expect(knownCount(305)).toBe(305);
    expect(knownCount(84.9)).toBe(84);
  });
  it('treats zero, null, undefined and NaN as unavailable', () => {
    expect(knownCount(0)).toBeNull();
    expect(knownCount(null, undefined, 0)).toBeNull();
    expect(knownCount(Number.NaN)).toBeNull();
  });
  it('falls through to the next candidate when the first is unavailable', () => {
    expect(knownCount(0, 42)).toBe(42);
  });
});

describe('leagueSummary formatting', () => {
  it('never prints a currency sign', () => {
    expect(leagueSummary(305, 84)).not.toContain('$');
    expect(leagueSummary(null, null)).not.toContain('$');
  });
  it('shows exact counts with a plus sign when both are known', () => {
    expect(leagueSummary(305, 84)).toBe(
      '305+ leagues across 84+ countries — professional, junior, college, international, and amateur tiers.',
    );
  });
  it('uses thousands separators', () => {
    expect(leagueSummary(1234, 90)).toContain('1,234+ leagues');
  });
  it('shows only the known count when the other is unavailable', () => {
    expect(leagueSummary(305, null)).toBe('305+ leagues — professional, junior, college, international, and amateur tiers.');
    expect(leagueSummary(null, 84)).toBe('across 84+ countries — professional, junior, college, international, and amateur tiers.');
  });
  it('shows a neutral fallback, never a zero count, when nothing is available', () => {
    const text = leagueSummary(null, null);
    expect(text).not.toMatch(/\b0\b/);
    expect(text).not.toMatch(/\+/);
    expect(text).toBe('Hockey leagues from professional, junior, college, international, and amateur tiers.');
  });
});
