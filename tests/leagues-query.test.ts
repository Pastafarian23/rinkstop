import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({ tables: {} as Record<string, any[]>, claims: {} as Record<string, any> }));

vi.mock('@/lib/supabase', async () => {
  const { makeFakeClient } = await import('./helpers/fake-supabase');
  const client = makeFakeClient(() => h.tables);
  return { supabase: client, supabaseAdmin: client };
});
vi.mock('@/lib/listingTier', async (orig) => {
  const actual: any = await orig();
  return {
    ...actual,
    enrichEntitiesWithClaimTier: async (_a: unknown, _t: string, ids: string[]) =>
      new Map(ids.filter((id) => h.claims[id]).map((id) => [id, h.claims[id]])),
  };
});

import { fetchLeaguePage } from '@/lib/leagues-query';
import { GET } from '@/app/api/leagues/route';

const N = 120;
beforeEach(() => {
  h.tables = {
    leagues: Array.from({ length: N }, (_, i) => ({
      id: `lg-${String(i).padStart(3, '0')}`,
      name: i % 3 === 0 ? `Fixture Junior ${String(i).padStart(3, '0')}` : `Fixture Adult ${String(i).padStart(3, '0')}`,
      slug: `league-${i}`,
      country: i % 2 ? 'USA' : 'Canada',
      level: 'Junior',
      is_active: i % 11 !== 0,
    })),
  };
  h.claims = {};
  h.tables.leagues.forEach((l, i) => {
    if (i % 7 === 0) h.claims[l.id] = { tier: 'identity_plus', org_tier: null, user_id: 'private', claim_id: `c${i}` };
  });
});

const active = () => h.tables.leagues.filter((l) => l.is_active);
const walk = async (p: Omit<Parameters<typeof fetchLeaguePage>[0], 'page'>, size: number) => {
  const ids: string[] = []; const counts: number[] = []; let offset = 0;
  for (let guard = 0; guard < 50; guard++) {
    const r = await fetchLeaguePage({ ...p, page: { offset, limit: size } });
    counts.push(r.count); ids.push(...r.data.map((x: any) => x.id));
    if (!r.hasMore) { expect(r.nextOffset).toBeNull(); break; }
    expect(r.nextOffset).toBe(offset + size);
    offset = r.nextOffset as number;
  }
  return { ids, counts };
};

describe('league search across the full dataset', () => {
  it('search matches every active league, not only the first page, with an exact total', async () => {
    const expected = active().filter((l) => l.name.includes('Junior')).length;
    const { ids, counts } = await walk({ search: 'Junior', sort: 'name' }, 10);
    expect(expected).toBeGreaterThan(10);
    expect(counts.every((c) => c === expected)).toBe(true);
    expect(ids).toHaveLength(expected);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('combines search with the country filter exactly', async () => {
    const expected = active().filter((l) => l.name.includes('Junior') && l.country === 'USA').length;
    const { ids, counts } = await walk({ search: 'Junior', country: 'USA', sort: 'name' }, 7);
    expect(counts.every((c) => c === expected)).toBe(true);
    expect(ids).toHaveLength(expected);
  });

  it('country alone filters the full dataset with an exact total', async () => {
    const expected = active().filter((l) => l.country === 'Canada').length;
    const { ids, counts } = await walk({ country: 'Canada', sort: 'name' }, 9);
    expect(counts.every((c) => c === expected)).toBe(true);
    expect(ids).toHaveLength(expected);
  });

  it('a non-matching search returns no rows and a zero total', async () => {
    const r = await fetchLeaguePage({ search: 'no-such-league-xyz', sort: 'name', page: { offset: 0, limit: 25 } });
    expect(r.count).toBe(0);
    expect(r.data).toHaveLength(0);
    expect(r.hasMore).toBe(false);
  });
});

describe('league tier paging, verified filter and Load More', () => {
  it('tier-ordered pages cover every matching league once, in one global order', async () => {
    const expected = active().length;
    const { ids, counts } = await walk({ sort: 'tier' }, 13);
    expect(counts.every((c) => c === expected)).toBe(true);
    expect(ids).toHaveLength(expected);
    expect(new Set(ids).size).toBe(ids.length);
    const tierRank = (id: string) => (h.claims[id] ? 0 : 1);
    const ranks = ids.map(tierRank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('verified-only counts and pages only verified leagues across all pages', async () => {
    const verified = active().filter((l) => h.claims[l.id]).length;
    const { ids, counts } = await walk({ sort: 'tier', verifiedOnly: true }, 5);
    expect(verified).toBeGreaterThan(5);
    expect(counts.every((c) => c === verified)).toBe(true);
    expect(ids.every((id) => !!h.claims[id])).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the route returns the paged envelope only when a limit is supplied', async () => {
    const paged = await (await GET(new NextRequest('http://localhost/api/leagues?search=Junior&limit=10&offset=0'))).json();
    expect(Array.isArray(paged)).toBe(false);
    expect(paged.count).toBe(active().filter((l) => l.name.includes('Junior')).length);
    expect(paged.data).toHaveLength(10);
    expect(paged.hasMore).toBe(true);
    expect(JSON.stringify(paged)).not.toContain('private');
    const plain = await (await GET(new NextRequest('http://localhost/api/leagues?sort=tier'))).json();
    expect(Array.isArray(plain)).toBe(true);
  });
});
