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

import { GET } from '@/app/api/leagues/route';

beforeEach(() => {
  h.tables = {
    leagues: Array.from({ length: 30 }, (_, i) => ({
      id: `lg-${String(i).padStart(2, '0')}`,
      name: `League ${String(i).padStart(2, '0')}`,
      slug: `league-${i}`,
      country: i % 2 ? 'USA' : 'Canada',
      level: 'Junior',
      is_active: true,
    })),
  };
  h.claims = { 'lg-03': { tier: 'org_pro', org_tier: null, user_id: 'user-secret-123', claim_id: 'c1' } };
});

async function list(qs: string) {
  return (await GET(new NextRequest(`http://localhost/api/leagues?${qs}`))).json();
}

describe('GET /api/leagues privacy', () => {
  it('never returns claimed_by_user_id, even for claimed leagues', async () => {
    const rows = await list('');
    for (const r of rows) expect(r).not.toHaveProperty('claimed_by_user_id');
    const claimed = rows.find((r: any) => r.id === 'lg-03');
    expect(claimed.claimed_by_tier).toBe('org_pro');
    expect(JSON.stringify(rows)).not.toContain('user-secret-123');
  });

  it('single-league lookup by id also omits the user id', async () => {
    const rows = await list('id=lg-03');
    expect(JSON.stringify(rows)).not.toContain('user-secret-123');
  });
});

describe('GET /api/leagues listing behaviour is unchanged', () => {
  it('returns every active league, ordered by name, with no duplicates', async () => {
    const rows = await list('');
    expect(rows).toHaveLength(30);
    expect(new Set(rows.map((r: any) => r.id)).size).toBe(30);
    const names = rows.map((r: any) => r.name);
    expect([...names].sort()).toEqual(names);
  });

  it('country and search filters narrow the result set', async () => {
    const usa = await list('country=USA');
    expect(usa.every((r: any) => r.country === 'USA')).toBe(true);
    expect(usa).toHaveLength(15);
    const searched = await list('search=League 1');
    expect(searched.length).toBeGreaterThan(0);
    expect(searched.every((r: any) => r.name.includes('League 1'))).toBe(true);
  });
});
