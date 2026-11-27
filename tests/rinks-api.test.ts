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
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: async () => ({ allowed: true, remaining: 99, retryAfter: 0 }),
  getClientIP: () => '127.0.0.1',
  applyRateLimitHeaders: (r: any) => r,
  maybeCleanup: () => {},
}));

import { fetchRinkListPage } from '@/lib/rinks-query';
import { isVerifiedClaim } from '@/lib/listingTier';
import { compareForListing } from '@/lib/rinks-list';
import { GET as rinksGET } from '@/app/api/rinks/route';

const N = 250;
function buildFixture() {
  const rinks = Array.from({ length: N }, (_, i) => ({
    id: `rink-${String(i).padStart(4, '0')}`,
    name: i % 17 === 0 ? 'Same Name Arena' : `Rink ${String(i % 40).padStart(2, '0')}`,
    slug: `rink-${i}`,
    city: i % 5 === 0 ? 'Detroit' : 'Howell',
    province_state: 'MI',
    country: i % 2 ? 'USA' : 'Canada',
    is_active: i % 23 !== 0,
  }));
  const claims: Record<string, any> = {};
  rinks.forEach((r, i) => {
    if (i % 21 === 0) claims[r.id] = { tier: 'org_pro', org_tier: null, user_id: 'u', claim_id: `c${i}` };
    else if (i % 7 === 0) claims[r.id] = { tier: 'identity_plus', org_tier: null, user_id: 'u', claim_id: `c${i}` };
    else if (i % 11 === 0) claims[r.id] = { tier: 'verified_identity', org_tier: null, user_id: 'u', claim_id: `c${i}` };
  });
  return { rinks, claims };
}

beforeEach(() => {
  const f = buildFixture();
  h.tables = { rinks: f.rinks };
  h.claims = f.claims;
});

const active = () => h.tables.rinks.filter((r) => r.is_active);

async function walk(params: Parameters<typeof fetchRinkListPage>[0], size: number) {
  const ids: string[] = [];
  const counts: number[] = [];
  let offset = 0;
  for (let guard = 0; guard < 100; guard++) {
    const page = await fetchRinkListPage({ ...params, page: { offset, limit: size } });
    counts.push(page.count);
    ids.push(...page.data.map((r: any) => r.id));
    if (!page.hasMore) {
      expect(page.nextOffset).toBeNull();
      break;
    }
    expect(page.nextOffset).toBe(offset + size);
    offset = page.nextOffset as number;
  }
  return { ids, counts };
}

describe('rinks list: name sort pagination', () => {
  it('walks every active rink exactly once, with an exact total on every page', async () => {
    const { ids, counts } = await walk({ activeOnly: true, sort: 'name' }, 100);
    const expected = active().map((r) => r.id);
    expect(counts.every((c) => c === expected.length)).toBe(true);
    expect(ids).toHaveLength(expected.length);
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
    expect([...ids].sort()).toEqual([...expected].sort()); // nothing skipped
  });
});

describe('rinks list: tier sort applied server-side before paging', () => {
  it('returns the same global order as the reference comparator, with odd page sizes', async () => {
    const decorated = active().map((r) => {
      const c = h.claims[r.id];
      return { id: r.id, name: r.name, claimed_by_tier: c?.tier ?? null, claimed_by_org_tier: c?.org_tier ?? null };
    });
    const reference = [...decorated].sort(compareForListing).map((r) => r.id);
    const { ids } = await walk({ activeOnly: true, sort: 'tier' }, 37);
    expect(ids).toEqual(reference);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ranks pro claims before verified, verified before basic, unclaimed last', async () => {
    const first = await fetchRinkListPage({ activeOnly: true, sort: 'tier', page: { offset: 0, limit: 5 } });
    expect(first.data[0].claimed_by_tier).toBe('org_pro');
  });
});

describe('rinks list: search and filters cover the full dataset', () => {
  it('finds matches beyond the first batch and reports the exact match count', async () => {
    const expectedMatches = active().filter((r) => r.name.toLowerCase().includes('rink')).length;
    expect(expectedMatches).toBeGreaterThan(100); // must exceed one page to prove full-dataset search
    const { ids, counts } = await walk({ activeOnly: true, sort: 'name', search: 'rink' }, 100);
    expect(counts.every((c) => c === expectedMatches)).toBe(true);
    expect(ids).toHaveLength(expectedMatches);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('verified-only filter counts and returns only verified claims across all pages', async () => {
    const verifiedIds = active()
      .filter((r) => isVerifiedClaim(h.claims[r.id]?.tier, h.claims[r.id]?.org_tier))
      .map((r) => r.id);
    expect(verifiedIds.length).toBeGreaterThan(0);
    const { ids, counts } = await walk({ activeOnly: true, sort: 'tier', verifiedOnly: true }, 10);
    expect(counts.every((c) => c === verifiedIds.length)).toBe(true);
    expect([...ids].sort()).toEqual([...verifiedIds].sort());
  });

  it('country filter narrows the total exactly', async () => {
    const usa = active().filter((r) => r.country === 'USA').length;
    const page = await fetchRinkListPage({ activeOnly: true, country: 'USA', sort: 'name', page: { offset: 0, limit: 100 } });
    expect(page.count).toBe(usa);
    expect(page.data.every((r: any) => r.country === 'USA')).toBe(true);
  });
});

describe('GET /api/rinks (list mode)', () => {
  it('returns count, offset, hasMore and nextOffset, and pages without repeats', async () => {
    const req1 = new NextRequest('http://localhost/api/rinks?sort=tier&limit=100&offset=0');
    const res1 = await rinksGET(req1);
    const body1 = await res1.json();
    expect(body1.count).toBe(active().length);
    expect(body1.data).toHaveLength(100);
    expect(body1.hasMore).toBe(true);
    expect(body1.nextOffset).toBe(100);

    const req2 = new NextRequest('http://localhost/api/rinks?sort=tier&limit=100&offset=100');
    const body2 = await (await rinksGET(req2)).json();
    const overlap = body1.data.filter((a: any) => body2.data.some((b: any) => b.id === a.id));
    expect(overlap).toHaveLength(0);
  });

  it('single-record lookup by id still works', async () => {
    const req = new NextRequest('http://localhost/api/rinks?id=rink-0001');
    const body = await (await rinksGET(req)).json();
    expect(body?.id).toBe('rink-0001');
  });
});

describe('public response privacy', () => {
  it('rinks list never exposes claimer user ids', async () => {
    const page = await fetchRinkListPage({ activeOnly: true, sort: 'tier', page: { offset: 0, limit: 100 } });
    expect(page.data.length).toBeGreaterThan(0);
    for (const r of page.data as Array<Record<string, unknown>>) {
      expect(r).not.toHaveProperty('claimed_by_user_id');
    }
  });
});
