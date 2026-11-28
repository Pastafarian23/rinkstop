import { beforeEach, describe, expect, it, vi } from 'vitest';

let currentUser: string | null = null;
const tables: Record<string, any[]> = {};

function builder(table: string) {
  const b: any = {};
  const done = () => Promise.resolve({ data: tables[table] ?? [], error: null });
  for (const m of ['select', 'eq', 'is', 'in', 'or', 'order', 'limit', 'gte', 'lt', 'not']) b[m] = () => b;
  b.maybeSingle = () => Promise.resolve({ data: (tables[table] ?? [])[0] ?? null, error: null });
  b.then = (res: (v: unknown) => unknown) => done().then(res);
  return b;
}

vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: currentUser }) }));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => builder(t) } }));

async function get(qs = '') {
  const { GET } = await import('@/app/api/scores/mine/route');
  const { NextRequest } = await import('next/server');
  return GET(new NextRequest('http://localhost/api/scores/mine' + qs));
}

const pub = (id: string, name: string, slug: string): any => ({ id, name, slug, visibility: 'public', logo_url: null });
const priv = (id: string, name: string, slug: string): any => ({ id, name, slug, visibility: 'private', logo_url: null });
const game = (id: string, home: any, away: any): any => ({
  id, scheduled_at: '2026-11-30T00:00:00Z', status: 'scheduled', home_score: null, away_score: null,
  season: '2026', league_id: 'l1', home_team: home, away_team: away, league: { id: 'l1', name: 'PWHL', slug: 'pwhl' },
});

beforeEach(() => {
  currentUser = null;
  for (const k of Object.keys(tables)) delete tables[k];
});

describe('/api/scores/mine: access', () => {
  it('rejects an anonymous request with 401 and returns no games', async () => {
    const res = await get();
    expect(res.status).toBe(401);
    expect((await res.json()).data).toEqual([]);
  });

  it('is never cacheable by a shared cache, for anonymous and signed-in responses', async () => {
    const anon = await get();
    expect(anon.headers.get('cache-control')).toMatch(/no-store/);
    expect(anon.headers.get('cache-control')).toMatch(/private/);
    currentUser = 'user_member';
    tables.team_members = [{ team_id: 'x1' }];
    tables.fixtures = [];
    const signed = await get();
    expect(signed.headers.get('cache-control')).toMatch(/no-store/);
    expect(signed.headers.get('cache-control')).toMatch(/private/);
    expect(signed.headers.get('vary')).toMatch(/Cookie/i);
  });

  it('a signed-in user with no team memberships gets nothing', async () => {
    currentUser = 'user_nobody';
    tables.team_members = [];
    const body = await (await get()).json();
    expect(body.data).toEqual([]);
  });

  it('rejects malformed dates', async () => {
    currentUser = 'user_member';
    const res = await get('?from=not-a-date');
    expect(res.status).toBe(400);
  });
});

describe('/api/scores/mine: which games a member receives', () => {
  beforeEach(() => { currentUser = 'user_member'; tables.team_members = [{ team_id: 'x1' }]; });

  it('returns a private-team game the viewer belongs to', async () => {
    tables.fixtures = [game('g1', priv('x1', 'Secret Team', 'secret'), pub('p1', 'Open Team', 'open'))];
    const body = await (await get()).json();
    expect(body.data.map((g: any) => g.id)).toEqual(['g1']);
    expect(body.data[0].home_team.name).toBe('Secret Team');
  });

  it('does not repeat public games (they come from the public list)', async () => {
    tables.fixtures = [game('g2', pub('p1', 'A', 'a'), pub('p2', 'B', 'b'))];
    const body = await (await get()).json();
    expect(body.data).toEqual([]);
  });

  it('withholds a game with a second private team the viewer does not belong to', async () => {
    tables.fixtures = [game('g3', priv('x1', 'Mine', 'mine'), priv('x2', 'Not Mine', 'not-mine'))];
    const body = await (await get()).json();
    expect(body.data).toEqual([]);
  });

  it('returns a game between two private teams when the viewer belongs to both', async () => {
    tables.team_members = [{ team_id: 'x1' }, { team_id: 'x2' }];
    tables.fixtures = [game('g4', priv('x1', 'Mine', 'mine'), priv('x2', 'Also Mine', 'also'))];
    const body = await (await get()).json();
    expect(body.data.map((g: any) => g.id)).toEqual(['g4']);
  });

  it('never includes the visibility flag in the response', async () => {
    tables.fixtures = [game('g5', priv('x1', 'Mine', 'mine'), pub('p1', 'Open', 'open'))];
    const text = JSON.stringify(await (await get()).json());
    expect(text).not.toMatch(/visibility/);
  });

  it('applies the team filter to the viewer games only', async () => {
    tables.fixtures = [
      game('g6', priv('x1', 'Mine', 'mine'), pub('p1', 'Open', 'open')),
      game('g7', priv('x1', 'Mine', 'mine'), pub('p2', 'Other', 'other')),
    ];
    const body = await (await get('?team=other')).json();
    expect(body.data.map((g: any) => g.id)).toEqual(['g7']);
  });
});
