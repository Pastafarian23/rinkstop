import { describe, it, expect } from 'vitest';
import { interpretLeagueListResponse, LEAGUE_NOT_FOUND_MESSAGE, LEAGUE_ERROR_MESSAGE, LEAGUE_REQUEST_TIMEOUT_MS } from '@/lib/league-load-state';

const LIST = [
  { id: 'a1111111-0000-4000-8000-000000000001', slug: 'tatra-cup-europe', name: 'Tatra Cup Europe' },
  { id: 'b2222222-0000-4000-8000-000000000002', slug: 'wch-iiia-world', name: 'WCH IIIA World' },
];

describe('successful requests', () => {
  it('finds a league by slug', () => {
    const r = interpretLeagueListResponse(true, LIST, 'tatra-cup-europe');
    expect(r).toEqual({ kind: 'found', league: LIST[0] });
  });
  it('finds a league by id', () => {
    expect(interpretLeagueListResponse(true, LIST, LIST[1].id)).toEqual({ kind: 'found', league: LIST[1] });
  });
  it('an empty but valid list is a not-found, not an error', () => {
    expect(interpretLeagueListResponse(true, [], 'tatra-cup-europe')).toEqual({ kind: 'not_found' });
  });
});

describe('failed requests and rate limits', () => {
  it('a non-OK HTTP response (including rate limit 429) is an error', () => {
    expect(interpretLeagueListResponse(false, 'Too many requests', 'tatra-cup-europe')).toEqual({ kind: 'error' });
    expect(interpretLeagueListResponse(false, null, 'tatra-cup-europe')).toEqual({ kind: 'error' });
  });
  it('an OK response with an unexpected shape is an error', () => {
    expect(interpretLeagueListResponse(true, { data: LIST }, 'tatra-cup-europe')).toEqual({ kind: 'error' });
    expect(interpretLeagueListResponse(true, null, 'tatra-cup-europe')).toEqual({ kind: 'error' });
    expect(interpretLeagueListResponse(true, 'oops', 'tatra-cup-europe')).toEqual({ kind: 'error' });
  });
  it('malformed entries are ignored, not crashed on', () => {
    expect(interpretLeagueListResponse(true, [null, 5, 'x'], 'tatra-cup-europe')).toEqual({ kind: 'not_found' });
  });
  it('a timeout is bounded (no indefinite loading)', () => {
    expect(LEAGUE_REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
    expect(LEAGUE_REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(15000);
  });
});

describe('missing leagues', () => {
  it('an unknown slug is not_found', () => {
    expect(interpretLeagueListResponse(true, LIST, 'no-such-league')).toEqual({ kind: 'not_found' });
  });
  it('partial matches are not treated as found', () => {
    expect(interpretLeagueListResponse(true, LIST, 'tatra')).toEqual({ kind: 'not_found' });
  });
});

describe('visitor messages', () => {
  it('messages are plain, do not expose internals, and do not say Loading', () => {
    for (const m of [LEAGUE_NOT_FOUND_MESSAGE, LEAGUE_ERROR_MESSAGE]) {
      expect(m).not.toMatch(/Loading|error code|429|stack|supabase|api\//i);
      expect(m.length).toBeLessThan(160);
    }
  });
});
