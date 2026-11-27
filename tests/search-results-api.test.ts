import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({ tables: {} as Record<string, any[]> }));

vi.mock('@/lib/supabase', async () => {
  const { makeFakeClient } = await import('./helpers/fake-supabase');
  const client = makeFakeClient(() => h.tables);
  return { supabase: client, supabaseAdmin: client };
});
vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: async () => ({ allowed: true, remaining: 99, retryAfter: 0 }),
  getClientIP: () => '127.0.0.1',
  applyRateLimitHeaders: (r: any) => r,
  maybeCleanup: () => {},
}));

import { GET } from '@/app/api/search/results/route';

const RINKS = 120; // more than two pages of 50 for the term "arena"

beforeEach(() => {
  h.tables = {
    rinks: Array.from({ length: RINKS }, (_, i) => ({
      id: `rk-${String(i).padStart(3, '0')}`,
      name: `Arena ${String(i).padStart(3, '0')}`,
      slug: `arena-${i}`,
      city: 'Town',
      province_state: 'MI',
      country: 'USA',
      is_active: true,
    })),
    team_workspaces: [{ id: 't1', name: 'Arena Hawks', slug: 'arena-hawks', home_city: 'Town', home_country: 'USA', is_active: true }],
    players: [],
    leagues: [],
    brands: [],
  };
});

async function search(qs: string) {
  const res = await GET(new NextRequest(`http://localhost/api/search/results?${qs}`));
  return res.json();
}

describe('site search: exact counts', () => {
  it('reports the true per-type total, not the page size', async () => {
    const body = await search('q=arena');
    expect(body.totals.rink).toBe(RINKS);
    expect(body.totals.team).toBe(1);
    expect(body.results.rink).toHaveLength(50);
    expect(body.page.hasMore.rink).toBe(true);
    expect(body.page.hasMore.team).toBe(false);
  });
});

describe('site search: paging beyond 50 per type', () => {
  it('walks all rink matches with type+offset: no repeats, no gaps', async () => {
    const seen: string[] = [];
    let offset = 0;
    for (let guard = 0; guard < 10; guard++) {
      const body = await search(`q=arena&type=rink&offset=${offset}`);
      expect(body.totals.rink).toBe(RINKS);
      const page = body.results.rink as Array<{ id: string }>;
      seen.push(...page.map((r) => r.id));
      if (!body.page.hasMore.rink) break;
      offset += page.length;
    }
    expect(seen).toHaveLength(RINKS);
    expect(new Set(seen).size).toBe(RINKS);
    const expected = Array.from({ length: RINKS }, (_, i) => `rk-${String(i).padStart(3, '0')}`);
    expect([...seen].sort()).toEqual(expected);
  });

  it('the last page reports no further rows', async () => {
    const body = await search(`q=arena&type=rink&offset=100`);
    expect(body.results.rink).toHaveLength(20);
    expect(body.page.hasMore.rink).toBe(false);
  });

  it('a type-scoped request returns only that type', async () => {
    const body = await search('q=arena&type=team');
    expect(body.results.rink).toHaveLength(0);
    expect(body.results.team).toHaveLength(1);
  });

  it('caps the page size at 50 regardless of the requested limit', async () => {
    const body = await search('q=arena&type=rink&limit=500');
    expect(body.results.rink).toHaveLength(50);
    expect(body.page.limit).toBe(50);
  });
});
