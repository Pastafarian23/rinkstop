/**
 * Paging rules for /api/search/results. Pure functions so they are unit-tested.
 */
export const SEARCH_PAGE_SIZE = 50;

export function clampSearchPage(limitRaw: string | null, offsetRaw: string | null): { offset: number; limit: number } {
  const limit = Math.min(Math.max(parseInt(limitRaw || String(SEARCH_PAGE_SIZE), 10) || SEARCH_PAGE_SIZE, 1), SEARCH_PAGE_SIZE);
  const offset = Math.max(parseInt(offsetRaw || '0', 10) || 0, 0);
  return { offset, limit };
}

/** True when rows beyond this page exist for the type. */
export function typeHasMore(offset: number, rowsReturned: number, exactCount: number): boolean {
  return offset + rowsReturned < exactCount;
}
