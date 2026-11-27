import { describe, expect, it } from 'vitest';
import { compareForListing, pageInfo, parsePageParams, rangeFor, sortAndSlice, tierRank, MAX_PAGE_LIMIT, DEFAULT_PAGE_LIMIT } from '@/lib/rinks-list';

describe('parsePageParams', () => {
  it('uses defaults when params are absent', () => {
    expect(parsePageParams(null, null)).toEqual({ offset: 0, limit: DEFAULT_PAGE_LIMIT });
  });
  it('clamps limit to [1, MAX] and offset to >= 0', () => {
    expect(parsePageParams('100000', '-5')).toEqual({ offset: 0, limit: MAX_PAGE_LIMIT });
    expect(parsePageParams('0', '10')).toEqual({ offset: 10, limit: 1 });
    expect(parsePageParams('abc', 'xyz')).toEqual({ offset: 0, limit: DEFAULT_PAGE_LIMIT });
  });
});

describe('rangeFor', () => {
  it('returns inclusive PostgREST bounds', () => {
    expect(rangeFor({ offset: 0, limit: 100 })).toEqual({ from: 0, to: 99 });
    expect(rangeFor({ offset: 100, limit: 100 })).toEqual({ from: 100, to: 199 });
  });
});

describe('pageInfo', () => {
  it('reports the true total and hasMore/nextOffset', () => {
    expect(pageInfo(1917, { offset: 0, limit: 100 })).toEqual({ count: 1917, offset: 0, limit: 100, hasMore: true, nextOffset: 100 });
  });
  it('reports no more pages on the last page', () => {
    expect(pageInfo(1917, { offset: 1900, limit: 100 })).toEqual({ count: 1917, offset: 1900, limit: 100, hasMore: false, nextOffset: null });
  });
  it('handles zero total', () => {
    expect(pageInfo(0, { offset: 0, limit: 100 })).toEqual({ count: 0, offset: 0, limit: 100, hasMore: false, nextOffset: null });
  });
});

describe('tierRank / compareForListing', () => {
  it('ranks pro above verified above basic above unclaimed', () => {
    expect(tierRank('pro')).toBeLessThan(tierRank('verified'));
    expect(tierRank('verified')).toBeLessThan(tierRank('basic'));
    expect(tierRank('basic')).toBeLessThan(tierRank(null));
  });
  it('uses the better of personal and org tier', () => {
    const a = { id: 'a', name: 'Zed', claimed_by_tier: null, claimed_by_org_tier: 'pro' };
    const b = { id: 'b', name: 'Alpha', claimed_by_tier: 'verified', claimed_by_org_tier: null };
    expect(compareForListing(a, b)).toBeLessThan(0);
  });
  it('breaks name ties by id so the order is total', () => {
    const x = { id: '2', name: 'Same', claimed_by_tier: null };
    const y = { id: '1', name: 'Same', claimed_by_tier: null };
    expect(compareForListing(y, x)).toBeLessThan(0);
  });
});

describe('sortAndSlice (tier ordering applied before paging)', () => {
  const rows = [
    { id: 'r1', name: 'Charlie', claimed_by_tier: null },
    { id: 'r2', name: 'Bravo', claimed_by_tier: 'pro' },
    { id: 'r3', name: 'Alpha', claimed_by_tier: 'verified' },
    { id: 'r4', name: 'Delta', claimed_by_tier: 'pro' },
    { id: 'r5', name: 'Echo', claimed_by_tier: null },
  ];
  it('puts higher tiers first across the full set', () => {
    expect(sortAndSlice(rows, { offset: 0, limit: 2 }).map((r) => r.id)).toEqual(['r2', 'r4']);
  });
  it('pages are contiguous: no duplicates and no skipped rows', () => {
    const p1 = sortAndSlice(rows, { offset: 0, limit: 2 }).map((r) => r.id);
    const p2 = sortAndSlice(rows, { offset: 2, limit: 2 }).map((r) => r.id);
    const p3 = sortAndSlice(rows, { offset: 4, limit: 2 }).map((r) => r.id);
    const combined = [...p1, ...p2, ...p3];
    expect(combined).toHaveLength(rows.length);
    expect(new Set(combined).size).toBe(rows.length);
    expect([...combined].sort()).toEqual(rows.map((r) => r.id).sort());
  });
  it('does not mutate the input array', () => {
    const before = rows.map((r) => r.id);
    sortAndSlice(rows, { offset: 0, limit: 5 });
    expect(rows.map((r) => r.id)).toEqual(before);
  });
});
