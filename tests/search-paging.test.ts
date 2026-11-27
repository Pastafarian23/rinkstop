import { describe, expect, it } from 'vitest';
import { clampSearchPage, typeHasMore, SEARCH_PAGE_SIZE } from '@/lib/search-paging';

describe('clampSearchPage', () => {
  it('defaults to offset 0 and the per-type page size', () => {
    expect(clampSearchPage(null, null)).toEqual({ offset: 0, limit: SEARCH_PAGE_SIZE });
  });
  it('caps page size at SEARCH_PAGE_SIZE and rejects negative offsets', () => {
    expect(clampSearchPage('9999', '-3')).toEqual({ offset: 0, limit: SEARCH_PAGE_SIZE });
  });
  it('accepts a valid later page', () => {
    expect(clampSearchPage('25', '50')).toEqual({ offset: 50, limit: 25 });
  });
});

describe('typeHasMore', () => {
  it('is true while rows beyond the current page exist (exact count, not the 50 cap)', () => {
    // 120 matches, first page of 50: more exist.
    expect(typeHasMore(0, 50, 120)).toBe(true);
    // second page 50..99: still more (100 of 120 seen).
    expect(typeHasMore(50, 50, 120)).toBe(true);
    // last page 100..119: nothing beyond.
    expect(typeHasMore(100, 20, 120)).toBe(false);
  });
  it('is false when the total fits in one page', () => {
    expect(typeHasMore(0, 3, 3)).toBe(false);
    expect(typeHasMore(0, 0, 0)).toBe(false);
  });
});

describe('paging across a full result set (no duplicates, no skips)', () => {
  it('walks 120 matches in consecutive pages covering every index once', () => {
    const total = 120;
    const seen: number[] = [];
    let offset = 0;
    let more = true;
    while (more) {
      const { offset: o, limit } = clampSearchPage(String(SEARCH_PAGE_SIZE), String(offset));
      const rows = Array.from({ length: Math.max(0, Math.min(limit, total - o)) }, (_, i) => o + i);
      seen.push(...rows);
      more = typeHasMore(o, rows.length, total);
      offset = o + rows.length;
    }
    expect(seen).toHaveLength(total);
    expect(new Set(seen).size).toBe(total);
  });
});
