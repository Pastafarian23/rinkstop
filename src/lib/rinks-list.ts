/**
 * Pure helpers for paginated, tier-ordered directory listings.
 * Used by /api/rinks list mode. No I/O, so the rules are unit-testable.
 */

export interface PageRequest {
  offset: number;
  limit: number;
}

export interface PageInfo {
  count: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  nextOffset: number | null;
}

export const DEFAULT_PAGE_LIMIT = 100;
export const MAX_PAGE_LIMIT = 200;

function toInt(raw: string | null, fallback: number): number {
  if (raw === null || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Parse and clamp offset/limit query parameters. */
export function parsePageParams(limitRaw: string | null, offsetRaw: string | null): PageRequest {
  const limit = Math.min(Math.max(toInt(limitRaw, DEFAULT_PAGE_LIMIT), 1), MAX_PAGE_LIMIT);
  const offset = Math.max(toInt(offsetRaw, 0), 0);
  return { offset, limit };
}

/** Inclusive PostgREST-style range bounds for a page. */
export function rangeFor(req: PageRequest): { from: number; to: number } {
  return { from: req.offset, to: req.offset + req.limit - 1 };
}

/** Paging metadata derived from the server-side total. */
export function pageInfo(total: number, req: PageRequest): PageInfo {
  const safeTotal = Math.max(total, 0);
  const next = req.offset + req.limit;
  const hasMore = next < safeTotal;
  return { count: safeTotal, offset: req.offset, limit: req.limit, hasMore, nextOffset: hasMore ? next : null };
}

/** Claim-tier rank: lower sorts first. Unclaimed rows rank last. */
export function tierRank(tier: string | null | undefined): number {
  switch ((tier || '').toLowerCase()) {
    case 'pro':
    case 'premium':
    case 'featured':
      return 0;
    case 'verified':
      return 1;
    case 'basic':
    case 'free':
      return 2;
    default:
      return 3;
  }
}

export interface TierSortable {
  id: string;
  name?: string | null;
  claimed_by_tier?: string | null;
  claimed_by_org_tier?: string | null;
}

/**
 * Total order: best of personal/org tier, then name, then id.
 * The id tie-breaker keeps paging free of duplicates and skips.
 */
export function compareForListing(a: TierSortable, b: TierSortable): number {
  const ra = Math.min(tierRank(a.claimed_by_tier), tierRank(a.claimed_by_org_tier));
  const rb = Math.min(tierRank(b.claimed_by_tier), tierRank(b.claimed_by_org_tier));
  if (ra !== rb) return ra - rb;
  const na = (a.name || '').localeCompare(b.name || '');
  if (na !== 0) return na;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Sort the full matching set, then return the requested page slice. */
export function sortAndSlice<T extends TierSortable>(rows: T[], req: PageRequest): T[] {
  return [...rows].sort(compareForListing).slice(req.offset, req.offset + req.limit);
}
