import { describe, it, expect, vi, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { findActiveLeague, pickLeague, LeagueLookupError, type LeagueRow } from '@/lib/league-lookup';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LEAGUES: LeagueRow[] = [
  { id: 'a1111111-0000-0000-0000-000000000001', slug: 'tatra-cup-europe', name: 'Tatra Cup Europe', is_active: true },
  { id: 'b2222222-0000-0000-0000-000000000002', slug: 'wch-iiia-world', name: 'WCH IIIA World', is_active: true },
];

type Result = { data: unknown; error: { code?: string; message: string } | null };

// Fake Supabase chain that records the calls made. Cast once, in tests only.
function fakeClient(result: Result, calls: string[] = []): SupabaseClient {
  const chain = {
    from: (table: string) => {
      calls.push(`from:${table}`);
      return chain;
    },
    select: (cols: string) => {
      calls.push(`select:${cols}`);
      return chain;
    },
    eq: (col: string, val: unknown) => {
      calls.push(`eq:${col}=${String(val)}`);
      return chain;
    },
    order: async (col: string) => {
      calls.push(`order:${col}`);
      return result;
    },
  };
  return chain as unknown as SupabaseClient;
}

function throwingClient(err: unknown): SupabaseClient {
  return {
    from: () => {
      throw err;
    },
  } as unknown as SupabaseClient;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('league lookup: valid league retrieval', () => {
  it('finds a league by slug', async () => {
    const found = await findActiveLeague(fakeClient({ data: LEAGUES, error: null }), 'tatra-cup-europe');
    expect(found?.name).toBe('Tatra Cup Europe');
  });

  it('finds a league by id', async () => {
    const found = await findActiveLeague(fakeClient({ data: LEAGUES, error: null }), 'b2222222-0000-0000-0000-000000000002');
    expect(found?.slug).toBe('wch-iiia-world');
  });

  it('queries the same default set as the route: active leagues ordered by name', async () => {
    const calls: string[] = [];
    await findActiveLeague(fakeClient({ data: LEAGUES, error: null }, calls), 'tatra-cup-europe');
    expect(calls).toEqual(['from:leagues', 'select:*', 'eq:is_active=true', 'order:name']);
  });
});

describe('league lookup: genuine not-found returns null (page calls notFound)', () => {
  it('returns null for an unknown slug', async () => {
    expect(await findActiveLeague(fakeClient({ data: LEAGUES, error: null }), 'no-such-league')).toBeNull();
  });

  it('returns null when the league is absent from the active list (inactive is filtered by the query)', async () => {
    expect(await findActiveLeague(fakeClient({ data: [], error: null }), 'tatra-cup-europe')).toBeNull();
  });

  it('matches exactly, not by substring', () => {
    expect(pickLeague(LEAGUES, 'tatra')).toBeNull();
    expect(pickLeague(LEAGUES, 'wch-iiia-world')?.name).toBe('WCH IIIA World');
  });
});

describe('league lookup: database errors are logged and thrown, never turned into a 404', () => {
  it('throws LeagueLookupError and logs the code and message on a query error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = fakeClient({ data: null, error: { code: '42501', message: 'permission denied for table leagues' } });

    await expect(findActiveLeague(client, 'tatra-cup-europe')).rejects.toBeInstanceOf(LeagueLookupError);

    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(spy.mock.calls[0]);
    expect(logged).toContain('42501');
    expect(logged).toContain('permission denied');
  });

  it('the thrown error does not contain row data or the requested slug', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = fakeClient({ data: null, error: { code: 'XX000', message: 'boom' } });
    const err = await findActiveLeague(client, 'secret-slug').catch((e: Error) => e);
    expect(err).toBeInstanceOf(LeagueLookupError);
    expect((err as Error).message).not.toContain('secret-slug');
  });

  it('throws when the payload is not an array (a server error, not a 404)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      findActiveLeague(fakeClient({ data: { unexpected: true }, error: null }), 'tatra-cup-europe'),
    ).rejects.toBeInstanceOf(LeagueLookupError);
    expect(spy).toHaveBeenCalled();
  });
});

describe('league lookup: unexpected programming exceptions propagate', () => {
  it('does not swallow a thrown TypeError from the client', async () => {
    const defect = new TypeError('client.from is not a function');
    await expect(findActiveLeague(throwingClient(defect), 'tatra-cup-europe')).rejects.toBe(defect);
  });
});

describe('league page regression: no server-side self-fetch of /api/leagues', () => {
  const pagePath = join(
    process.cwd(),
    'src/app/directory/leagues/[id]/page.tsx',
  );
  const src = readFileSync(pagePath, 'utf8');

  it('does not fetch /api/leagues from the server-rendered page', () => {
    expect(src).not.toMatch(/fetch\([^)]*\/api\/leagues/);
  });

  it('reads the league through findActiveLeague', () => {
    expect(src).toMatch(/findActiveLeague\(/);
    expect(src).toMatch(/from '@\/lib\/league-lookup'/);
  });

  it('does not use the service-role client for the league lookup', () => {
    const getLeagueBody = src.slice(src.indexOf('async function getLeague('), src.indexOf('async function getLeague(') + 400);
    expect(getLeagueBody).not.toMatch(/supabaseAdmin/);
  });
});
