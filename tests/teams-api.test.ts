import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => ({ tables: {} as Record<string, any[]> }));

vi.mock('@/lib/supabase', async () => {
  const { makeFakeClient } = await import('./helpers/fake-supabase');
  const client = makeFakeClient(() => h.tables);
  return { supabase: client, supabaseAdmin: client };
});
vi.mock('@/lib/listingTier', async (orig) => {
  const actual: any = await orig();
  return { ...actual, enrichEntitiesWithClaimTier: async () => new Map() };
});

import { GET } from '@/app/api/teams/route';

const N = 250;
beforeEach(() => {
  h.tables = {
    team_workspaces: Array.from({ length: N }, (_, i) => ({
      id: `tm-${String(i).padStart(4, '0')}`,
      // Every 10th team shares one name, so ordering must break ties by id.
      name: i % 10 === 0 ? 'Shared Team Name' : `Team ${String(i).padStart(3, '0')}`,
      slug: `team-${i}`,
      home_city: i % 4 === 0 ? 'Detroit' : 'Howell',
      is_active: true,
    })),
    leagues: [],
  };
});

async function page(qs: string) {
  const res = await GET(new NextRequest(`http://localhost/api/teams?${qs}`));
  return res.json() as Promise<{ data: any[]; count: number }>;
}
// Mirrors the client rule: more pages exist while the loaded rows are fewer than the total.
const hasMore = (offset: number, got: number, count: number) => offset + got < count;

describe('GET /api/teams pagination', () => {
  it('reports the exact total on every page and hasMore follows the total', async () => {
    const seen: any[] = [];
    let offset = 0;
    for (let guard = 0; guard < 10; guard++) {
      const body = await page(`limit=100&offset=${offset}`);
      expect(body.count).toBe(N);
      seen.push(...body.data);
      if (!hasMore(offset, body.data.length, body.count)) break;
      offset += body.data.length;
    }
    expect(seen).toHaveLength(N);
    expect(hasMore(0, 100, N)).toBe(true);
    expect(hasMore(200, 50, N)).toBe(false);
  });

  it('walks every team exactly once: no duplicates and no skipped records', async () => {
    const ids: string[] = [];
    for (let offset = 0; offset < N; offset += 100) {
      ids.push(...(await page(`limit=100&offset=${offset}`)).data.map((t) => t.id));
    }
    expect(ids).toHaveLength(N);
    expect(new Set(ids).size).toBe(N);
    expect([...ids].sort()).toEqual(h.tables.team_workspaces.map((t) => t.id).sort());
  });

  it('keeps one global order across page boundaries, including shared names', async () => {
    const expected = [...h.tables.team_workspaces]
      .sort((a, b) => a.name.localeCompare(b.name) || (a.id < b.id ? -1 : 1))
      .map((t) => t.id);
    const ids: string[] = [];
    for (let offset = 0; offset < N; offset += 37) {
      ids.push(...(await page(`limit=37&offset=${offset}`)).data.map((t) => t.id));
    }
    expect(ids).toEqual(expected);
  });

  it('an offset beyond the end returns no rows and the same total', async () => {
    const body = await page(`limit=100&offset=${N + 5}`);
    expect(body.data).toHaveLength(0);
    expect(body.count).toBe(N);
    expect(hasMore(N + 5, 0, body.count)).toBe(false);
  });

  it('search pages across the full matching set with an exact filtered total', async () => {
    const matching = h.tables.team_workspaces.filter((t) => t.name.includes('Shared Team Name')).length;
    expect(matching).toBe(25);
    const ids: string[] = [];
    let offset = 0;
    for (let guard = 0; guard < 10; guard++) {
      const body = await page(`search=Shared&limit=10&offset=${offset}`);
      expect(body.count).toBe(matching);
      ids.push(...body.data.map((t) => t.id));
      if (!hasMore(offset, body.data.length, body.count)) break;
      offset += body.data.length;
    }
    expect(ids).toHaveLength(matching);
    expect(new Set(ids).size).toBe(matching);
  });
});
