import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Recorder standing in for the Supabase client: it captures every table, select,
// filter and join the route builds, and returns rows we control.
type Call = { table: string; select?: string; filters: Array<[string, unknown[]]> };
const calls: Call[] = [];
let fixtureRows: any[] = [];
let teamRow: any = { id: 'team-1' };

function builder(table: string) {
  const call: Call = { table, filters: [] };
  calls.push(call);
  const b: any = {
    select(s: string) { call.select = s; return b; },
    then(res: (v: unknown) => unknown) {
      if (table === 'fixtures') return res({ data: fixtureRows, count: fixtureRows.length, error: null });
      return res({ data: [], count: 0, error: null });
    },
    maybeSingle() {
      if (table === 'leagues') return Promise.resolve({ data: { id: 'league-1' }, error: null });
      if (table === 'team_workspaces') return Promise.resolve({ data: teamRow, error: null });
      return Promise.resolve({ data: null, error: null });
    },
  };
  for (const m of ['eq', 'neq', 'in', 'not', 'or', 'gte', 'lte', 'lt', 'order', 'range', 'limit']) {
    b[m] = (...args: unknown[]) => { call.filters.push([m, args]); return b; };
  }
  return b;
}

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => builder(t) }) }));

async function get(qs = '') {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://x.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key-not-real';
  const { GET } = await import('@/app/api/scores/route');
  const { NextRequest } = await import('next/server');
  return GET(new NextRequest('http://localhost/api/scores' + qs));
}

beforeEach(() => { calls.length = 0; fixtureRows = []; teamRow = { id: 'team-1' }; });

describe('/api/scores privacy: the database query', () => {
  it('joins both teams with !inner so a fixture cannot survive without a public team', async () => {
    await get('?league=pwhl');
    const fx = calls.find((c) => c.table === 'fixtures')!;
    expect(fx.select).toMatch(/home_team:team_workspaces!home_team_id!inner\(/);
    expect(fx.select).toMatch(/away_team:team_workspaces!away_team_id!inner\(/);
  });

  it('filters BOTH joined teams to visibility = public in the database', async () => {
    await get('?league=pwhl');
    const fx = calls.find((c) => c.table === 'fixtures')!;
    expect(fx.filters).toContainEqual(['eq', ['home_team.visibility', 'public']]);
    expect(fx.filters).toContainEqual(['eq', ['away_team.visibility', 'public']]);
  });

  it('applies the filters on every time mode and with an explicit date range', async () => {
    for (const qs of ['?time=current', '?time=recent', '?time=historical', '?from=2026-11-20&to=2026-11-30', '?league=all']) {
      calls.length = 0;
      await get(qs);
      const fx = calls.find((c) => c.table === 'fixtures')!;
      expect(fx.filters).toContainEqual(['eq', ['home_team.visibility', 'public']]);
      expect(fx.filters).toContainEqual(['eq', ['away_team.visibility', 'public']]);
    }
  });

  it('a private team slug does not resolve in the team filter', async () => {
    await get('?team=pwhl-vancouver');
    const lookup = calls.find((c) => c.table === 'team_workspaces')!;
    expect(lookup.filters).toContainEqual(['eq', ['slug', 'pwhl-vancouver']]);
    expect(lookup.filters).toContainEqual(['eq', ['visibility', 'public']]);
  });

  it('selects no visibility, contact or ownership field to return', async () => {
    await get();
    const fx = calls.find((c) => c.table === 'fixtures')!;
    expect(fx.select).not.toMatch(/contact|created_by|email|phone/);
  });
});

describe('/api/scores: response and caching', () => {
  const publicGame: any = {
    id: 'g1', scheduled_at: '2026-11-23T00:00:00Z', status: 'completed', home_score: 3, away_score: 2,
    home_team: { id: 'a', name: 'Boston Fleet', slug: 'boston-fleet', logo_url: null },
    away_team: { id: 'b', name: 'Minnesota Frost', slug: 'minnesota-frost', logo_url: null },
    league: { id: 'l', name: 'PWHL', slug: 'pwhl' },
  };

  it('returns public games with their normal shape and count', async () => {
    fixtureRows = [publicGame];
    const res = await get('?league=pwhl');
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.data[0].home_team.name).toBe('Boston Fleet');
    expect(Object.keys(body.data[0]).sort()).toEqual(['away_score', 'away_team', 'home_score', 'home_team', 'id', 'league', 'scheduled_at', 'status'].sort());
  });

  it('only ever serves bodies that are identical for every viewer, so public caching is safe', async () => {
    const res = await get('?league=pwhl');
    expect(res.headers.get('cache-control')).toMatch(/public/);
    const src = readFileSync(join(process.cwd(), 'src/app/api/scores/route.ts'), 'utf8');
    // No per-viewer behaviour: the route must not read a session, so one cached body cannot differ by user.
    expect(src).not.toMatch(/auth\(\)|currentUser|getToken|cookies\(\)|headers\(\)/);
  });
});
