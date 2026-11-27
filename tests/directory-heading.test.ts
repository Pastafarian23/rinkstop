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

import { leagueCountNoun, leagueLeadPhrase } from '@/lib/directory-heading';

describe('leagueLeadPhrase (metadata)', () => {
  it('shows both counts when known', () => {
    expect(leagueLeadPhrase(305, 84)).toBe('305+ hockey leagues across 84+ countries');
  });
  it('drops an unknown part instead of printing zero', () => {
    expect(leagueLeadPhrase(305, null)).toBe('305+ hockey leagues');
    expect(leagueLeadPhrase(null, 84)).toBe('hockey leagues across 84+ countries');
  });
  it('falls back to neutral wording, never a zero count', () => {
    const t = leagueLeadPhrase(null, null);
    expect(t).toBe('hockey leagues worldwide');
    expect(t).not.toMatch(/\b0\b/);
    expect(t).not.toContain('$');
  });
});

describe('leagueCountNoun (FAQ and body copy)', () => {
  it('shows the count when known and never a zero', () => {
    expect(leagueCountNoun(305)).toBe('305+ active hockey leagues');
    expect(leagueCountNoun(null)).toBe('active hockey leagues');
  });
});

import { rinksPhrase, rinksTitle, teamsTrackedPhrase } from '@/lib/directory-heading';

describe('teamsTrackedPhrase', () => {
  it('shows all known counts', () => {
    expect(teamsTrackedPhrase(2656, 295, 84)).toBe('2,656+ active hockey teams across 295+ leagues and 84+ countries');
  });
  it('drops unknown parts, never prints zero', () => {
    expect(teamsTrackedPhrase(null, null, null)).toBe('active hockey teams');
    expect(teamsTrackedPhrase(2656, null, null)).toBe('2,656+ active hockey teams');
    expect(teamsTrackedPhrase(null, 295, null)).toBe('active hockey teams across 295+ leagues');
    expect(teamsTrackedPhrase(null, null, null)).not.toMatch(/\b0\b/);
  });
});

describe('rinks metadata phrases', () => {
  it('uses real counts when known', () => {
    expect(rinksPhrase(2000, 84, 500)).toBe('2,000 ice rinks and arenas across 84+ countries and 500 cities');
    expect(rinksTitle(2000, 84)).toBe('2,000 Ice Rinks Across 84 Countries — Find One Near You');
  });
  it('falls back to neutral wording, never zero', () => {
    expect(rinksPhrase(null, null, null)).toBe('ice rinks and arenas');
    expect(rinksTitle(null, null)).toBe('Ice Rinks Worldwide — Find One Near You');
    expect(rinksTitle(null, null)).not.toMatch(/\b0\b/);
  });
});
