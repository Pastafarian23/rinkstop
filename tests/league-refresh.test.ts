import { describe, it, expect } from 'vitest';
import { findRefreshedLeague, listFromPayload } from '@/lib/league-refresh';

const LEAGUES = [
  { id: 'u-1', slug: 'alpha', name: 'Alpha' },
  { id: 'u-2', slug: 'beta', name: 'Beta' },
];

describe('findRefreshedLeague', () => {
  it('matches by slug', () => {
    expect(findRefreshedLeague(LEAGUES, 'beta')?.name).toBe('Beta');
  });

  it('falls back to id when no slug matches', () => {
    expect(findRefreshedLeague(LEAGUES, 'u-1')?.name).toBe('Alpha');
  });

  it('returns null when the league is absent, so the server copy is kept', () => {
    expect(findRefreshedLeague(LEAGUES, 'gamma')).toBeNull();
  });

  it('returns null for non-array payloads (error body, null, object, string)', () => {
    for (const payload of [null, undefined, {}, { error: 'x' }, 'oops', { data: LEAGUES }]) {
      expect(findRefreshedLeague(payload, 'alpha')).toBeNull();
    }
  });

  it('skips null entries inside the list', () => {
    expect(findRefreshedLeague([null, LEAGUES[0]], 'alpha')?.id).toBe('u-1');
  });
});

describe('listFromPayload', () => {
  it('returns bare arrays and { data: [] } lists', () => {
    expect(listFromPayload(LEAGUES)).toBe(LEAGUES);
    expect(listFromPayload({ data: LEAGUES })).toBe(LEAGUES);
  });

  it('returns an empty list for anything else', () => {
    for (const payload of [null, undefined, {}, { data: 'x' }, { data: null }, 'x', 42]) {
      expect(listFromPayload(payload)).toEqual([]);
    }
  });
});
