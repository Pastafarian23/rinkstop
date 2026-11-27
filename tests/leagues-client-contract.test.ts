import { describe, expect, it } from 'vitest';
import { nextLeagueList } from '@/lib/league-list-contract';

const LIST = [{ id: 'lg-1', name: 'League One' }, { id: 'lg-2', name: 'League Two' }];

describe('leagues directory response contract', () => {
  it('replaces the list with a successful array response', () => {
    const next = nextLeagueList([], true, LIST);
    expect(Array.isArray(next)).toBe(true);
    expect(next).toHaveLength(2);
    expect(next.filter((l) => l.name.includes('One'))).toHaveLength(1);
  });

  it('keeps the current list when the API returns an error object (HTTP 500)', () => {
    const current = [{ id: 'lg-1', name: 'League One' }];
    const next = nextLeagueList(current, false, { error: 'TypeError: fetch failed' });
    expect(Array.isArray(next)).toBe(true);
    expect(next).toBe(current);
  });

  it('never accepts a non-array body, even when the status is OK', () => {
    const current: { id: string }[] = [];
    expect(nextLeagueList(current, true, { error: 'unexpected shape' })).toBe(current);
    expect(nextLeagueList(current, true, null)).toBe(current);
    expect(nextLeagueList(current, true, 'not json')).toBe(current);
  });

  it('returns an array in every case, so callers may filter without a guard', () => {
    const cases: Array<[boolean, unknown]> = [[true, LIST], [false, { error: 'x' }], [true, {}], [false, null]];
    for (const [ok, body] of cases) {
      expect(Array.isArray(nextLeagueList<{ id: string }>([], ok, body))).toBe(true);
    }
  });
});
