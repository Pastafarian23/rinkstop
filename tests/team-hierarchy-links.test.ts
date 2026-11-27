import { describe, expect, it } from 'vitest';
import { leagueHref } from '@/lib/team-hierarchy-links';

describe('leagueHref', () => {
  it('points league links at the working /directory/leagues route', () => {
    expect(leagueHref('asia-league-ice-hockey')).toBe('/directory/leagues/asia-league-ice-hockey');
  });

  it('never returns the broken bare /leagues path', () => {
    expect(leagueHref('nhl')).not.toMatch(/^\/leagues\//);
  });

  it('returns null when a league has no slug', () => {
    expect(leagueHref(null)).toBeNull();
    expect(leagueHref('')).toBeNull();
    expect(leagueHref('   ')).toBeNull();
  });

  it('encodes unsafe characters in the slug', () => {
    expect(leagueHref('a b/c')).toBe('/directory/leagues/a%20b%2Fc');
  });
});
