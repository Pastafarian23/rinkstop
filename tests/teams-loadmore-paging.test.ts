import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readListPage } from '@/lib/directory-fetch';
import {
  TEAMS_PAGE_SIZE,
  applyTeamsPage,
  initialTeamsPageState,
  type TeamsPageState,
} from '@/lib/teams-paging';

// Regression for the Teams "Load more" duplicates. Production showed 191 cards
// with 143 unique teams after two clicks. Causes:
//   1. /api/user-teams ignores `offset`, so every click re-appended the same
//      first rows, and dedupe only ran inside each batch.
//   2. The client advanced the server offset by the merged list length, which
//      includes rows from the other query, so the cursor drifted.
//   3. The server-rendered first page ordered by name without an id tie-breaker.
//      /api/teams uses name, then id, so rows with equal names could fall on
//      different sides of the page boundary and be skipped.
// These tests run a simulated multi-page list through the same paging code the
// client uses. The dataset repeats names, leaves an uneven final page, and
// includes inactive rows.

type Row = {
  id: string;
  name: string;
  country_code: string;
  level: string;
  is_active: boolean;
  created_at: number;
};

type Filter = { country?: string; level?: string };

// Deterministic dataset. Names repeat heavily, so ties cross page boundaries.
// Ids are a permutation, so id order differs from insertion order.
function makeDataset(n: number): Row[] {
  const countries = ['CA', 'US', 'PH', 'IN', 'AU'];
  const levels = ['pro', 'youth', 'adult'];
  const rows: Row[] = [];
  let state = 2463534242;
  for (let i = 0; i < n; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    rows.push({
      id: `t${state.toString(16).padStart(8, '0')}-${String(i).padStart(4, '0')}`,
      name: `Team ${String(i % 37).padStart(2, '0')}`,
      country_code: countries[i % countries.length],
      level: levels[i % levels.length],
      is_active: i % 11 !== 0,
      created_at: (i * 7919) % 100000,
    });
  }
  return rows;
}

function byNameThenId(a: Row, b: Row): number {
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

function matches(r: Row, f: Filter): boolean {
  if (!r.is_active) return false;
  if (f.country && r.country_code !== f.country) return false;
  if (f.level && r.level !== f.level) return false;
  return true;
}

// Mirrors /api/teams: filter, order by name then id, range, exact count.
function serveTeams(rows: Row[], f: Filter, offset: number, limit: number) {
  const ordered = rows.filter((r) => matches(r, f)).sort(byNameThenId);
  return { data: ordered.slice(offset, offset + limit), count: ordered.length };
}

// Mirrors the server-rendered first page. The name query fetches one extra row
// for the lookahead, and only the first page is kept. `byIdTieBreak` true is the
// fixed order (name, then id, same as /api/teams). false is the old name-only order.
function serveInitial(rows: Row[], f: Filter, byIdTieBreak: boolean) {
  const filtered = rows.filter((r) => matches(r, f));
  const named = byIdTieBreak
    ? [...filtered].sort(byNameThenId)
    : [...filtered].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const nameRows = named.slice(0, TEAMS_PAGE_SIZE);
  const nameHasMore = named.length > TEAMS_PAGE_SIZE;
  const user = [...filtered].sort((a, b) => b.created_at - a.created_at).slice(0, TEAMS_PAGE_SIZE);
  const seen = new Set<string>();
  const teams: Row[] = [];
  for (const t of [...nameRows, ...user]) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    teams.push(t);
  }
  return { teams, nameRows: nameRows.length, nameHasMore };
}

function startState(key: string, seed: ReturnType<typeof serveInitial>): TeamsPageState<Row> {
  return initialTeamsPageState<Row>(key, seed.nameRows, seed.nameHasMore);
}

// Runs the client paging loop until hasMore is false.
function loadAll(rows: Row[], f: Filter, byIdTieBreak = true) {
  const key = JSON.stringify(f);
  const seed = serveInitial(rows, f, byIdTieBreak);
  let state = startState(key, seed);
  let fetches = 0;
  let total: number | null = null;
  while (state.hasMore && fetches < 1000) {
    const requestedOffset = state.cursor;
    const page = serveTeams(rows, f, requestedOffset, TEAMS_PAGE_SIZE);
    total = page.count;
    state = applyTeamsPage(state, {
      key,
      requestedOffset,
      rows: page.data,
      total: page.count,
      seedTeams: seed.teams,
    });
    fetches++;
  }
  return { shown: [...seed.teams, ...state.teams], fetches, total, state };
}

const DATA = makeDataset(1000);

const FILTERS: Array<{ label: string; f: Filter }> = [
  { label: 'no filter', f: {} },
  { label: 'country CA', f: { country: 'CA' } },
  { label: 'country PH', f: { country: 'PH' } },
  { label: 'level pro', f: { level: 'pro' } },
  { label: 'country AU + level adult', f: { country: 'AU', level: 'adult' } },
];

describe('Load more returns each team exactly once', () => {
  for (const { label, f } of FILTERS) {
    it(`no duplicates, no skips, exact total: ${label}`, () => {
      const expected = serveTeams(DATA, f, 0, Number.MAX_SAFE_INTEGER);
      const { shown, total, fetches } = loadAll(DATA, f);
      const ids = shown.map((t) => t.id);

      // Each team appears once.
      expect(new Set(ids).size).toBe(ids.length);
      // Every team that matches the filter is shown.
      expect(new Set(ids)).toEqual(new Set(expected.data.map((t) => t.id)));
      // The shown count equals the server's exact count.
      expect(ids.length).toBe(expected.count);
      expect(total ?? expected.count).toBe(expected.count);
      // No empty fetch after the list ends: fetches are bounded by the page count.
      expect(fetches).toBeLessThanOrEqual(Math.ceil(expected.count / TEAMS_PAGE_SIZE));
    });
  }

  it('the dataset has an uneven last page and repeated names', () => {
    const { count } = serveTeams(DATA, {}, 0, 1);
    expect(count % TEAMS_PAGE_SIZE).not.toBe(0);
    const names = new Set(DATA.map((r) => r.name));
    expect(names.size).toBeLessThan(DATA.length / 10);
  });

  it('a filter with no teams shows nothing and makes no request', () => {
    const { shown, fetches } = loadAll(DATA, { country: 'ZZ' });
    expect(shown).toEqual([]);
    expect(fetches).toBe(0);
  });

  it('a filter with exactly one page does not request a second page', () => {
    const rows = DATA.filter((r) => r.is_active).slice(0, TEAMS_PAGE_SIZE);
    const { shown, fetches } = loadAll(rows, {});
    expect(shown.length).toBe(TEAMS_PAGE_SIZE);
    expect(fetches).toBe(0);
  });
});

describe('applyTeamsPage ignores responses it must not apply', () => {
  const f: Filter = {};
  const key = JSON.stringify(f);
  const seed = serveInitial(DATA, f, true);

  it('a repeated request for the same offset is ignored', () => {
    const start = startState(key, seed);
    const page = serveTeams(DATA, f, start.cursor, TEAMS_PAGE_SIZE);
    const once = applyTeamsPage(start, { key, requestedOffset: start.cursor, rows: page.data, total: page.count, seedTeams: seed.teams });
    const twice = applyTeamsPage(once, { key, requestedOffset: start.cursor, rows: page.data, total: page.count, seedTeams: seed.teams });
    expect(twice).toBe(once);
    expect(twice.teams.length).toBe(once.teams.length);
  });

  it('a response for another filter is ignored', () => {
    const start = startState(key, seed);
    const other = serveTeams(DATA, { country: 'CA' }, start.cursor, TEAMS_PAGE_SIZE);
    const next = applyTeamsPage(start, { key: JSON.stringify({ country: 'CA' }), requestedOffset: start.cursor, rows: other.data, total: other.count, seedTeams: seed.teams });
    expect(next).toBe(start);
  });

  it('an out-of-order response that starts past the cursor is ignored', () => {
    const start = startState(key, seed);
    const ahead = serveTeams(DATA, f, start.cursor + TEAMS_PAGE_SIZE, TEAMS_PAGE_SIZE);
    const next = applyTeamsPage(start, { key, requestedOffset: start.cursor + TEAMS_PAGE_SIZE, rows: ahead.data, total: ahead.count, seedTeams: seed.teams });
    expect(next).toBe(start);
  });

  it('a seed team returned again by the ordered list is not appended twice', () => {
    const start = startState(key, seed);
    const seedIds = new Set(seed.teams.map((t) => t.id));
    const page = serveTeams(DATA, f, start.cursor, TEAMS_PAGE_SIZE);
    const next = applyTeamsPage(start, { key, requestedOffset: start.cursor, rows: page.data, total: page.count, seedTeams: seed.teams });
    for (const t of next.teams) expect(seedIds.has(t.id)).toBe(false);
  });

  it('a short page ends the list, even without a total', () => {
    const start = initialTeamsPageState<Row>(key, TEAMS_PAGE_SIZE, true);
    const short = DATA.slice(0, 5);
    const next = applyTeamsPage(start, { key, requestedOffset: start.cursor, rows: short, total: null, seedTeams: [] });
    expect(next.hasMore).toBe(false);
  });

  it('a full page with an exact total at the end sets hasMore to false', () => {
    const rows = DATA.filter((r) => r.is_active).slice(0, 2 * TEAMS_PAGE_SIZE);
    const start = initialTeamsPageState<Row>(key, TEAMS_PAGE_SIZE, true);
    const page = serveTeams(rows, {}, start.cursor, TEAMS_PAGE_SIZE);
    const next = applyTeamsPage(start, { key, requestedOffset: start.cursor, rows: page.data, total: page.count, seedTeams: [] });
    expect(next.cursor).toBe(2 * TEAMS_PAGE_SIZE);
    expect(next.hasMore).toBe(false);
  });
});

describe('the old behaviour produced duplicates and the test would catch it', () => {
  // Mirrors the previous client: offset = merged length, and a second
  // endpoint that ignores offset and returns the same rows on every call.
  function legacyLoadAll(rows: Row[], f: Filter) {
    const seed = serveInitial(rows, f, false);
    const shown: Row[] = [...seed.teams];
    const userFirst = [...rows.filter((r) => matches(r, f))].sort((a, b) => b.created_at - a.created_at).slice(0, TEAMS_PAGE_SIZE);
    for (let click = 0; click < 2; click++) {
      const offset = shown.length;
      const named = serveTeams(rows, f, offset, TEAMS_PAGE_SIZE).data;
      const batch = [...named, ...userFirst];
      const seen = new Set<string>();
      const unique: Row[] = [];
      for (const t of batch) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        unique.push(t);
      }
      shown.push(...unique);
    }
    return shown;
  }

  it('the legacy merge repeats teams, so the assertions above would fail for it', () => {
    const shown = legacyLoadAll(DATA, {});
    const ids = shown.map((t) => t.id);
    expect(new Set(ids).size).toBeLessThan(ids.length);
  });
});

describe('server-rendered first page uses the same order as /api/teams', () => {
  // Without an id tie-breaker, a name shared across the page boundary can put
  // a team in the wrong place. The seed then omits it and the cursor never
  // returns it. Checked on the same dataset, with no user rows in the seed.
  function skippedByNameOnlySeed(rows: Row[]) {
    const f: Filter = {};
    const seed = serveInitial(rows, f, false);
    const seedNameIds = new Set(seed.teams.slice(0, TEAMS_PAGE_SIZE).map((t) => t.id));
    const firstPageApi = serveTeams(rows, f, 0, TEAMS_PAGE_SIZE).data.map((t) => t.id);
    return firstPageApi.filter((id) => !seedNameIds.has(id));
  }

  it('the name-only seed skips a team that /api/teams page one contains', () => {
    expect(skippedByNameOnlySeed(DATA).length).toBeGreaterThan(0);
  });

  it('the id tie-broken seed skips nothing', () => {
    const f: Filter = {};
    const seed = serveInitial(DATA, f, true);
    const seedNameIds = new Set(seed.teams.slice(0, TEAMS_PAGE_SIZE).map((t) => t.id));
    const firstPageApi = serveTeams(DATA, f, 0, TEAMS_PAGE_SIZE).data.map((t) => t.id);
    expect(firstPageApi.filter((id) => !seedNameIds.has(id))).toEqual([]);
  });
});

describe('readListPage returns the server count', () => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  it('returns data and the exact count', async () => {
    const r = await readListPage(json({ data: [{ id: 'a' }], count: 2656 }));
    expect(r).toEqual({ ok: true, data: [{ id: 'a' }], count: 2656 });
  });

  it('returns count null when the body has no count', async () => {
    const r = await readListPage(json({ data: [] }));
    expect(r).toEqual({ ok: true, data: [], count: null });
  });

  it('still treats a failed request as failed, never as an empty page', async () => {
    expect((await readListPage(json({ error: 'x' }, 500))).ok).toBe(false);
    expect((await readListPage(json({ data: 'nope' }))).ok).toBe(false);
  });
});

describe('client and server source wiring', () => {
  const CLIENT = readFileSync(join(process.cwd(), 'src/app/directory/teams/TeamsIndexClient.tsx'), 'utf8');
  const PAGE = readFileSync(join(process.cwd(), 'src/app/directory/teams/page.tsx'), 'utf8');
  const API = readFileSync(join(process.cwd(), 'src/app/api/teams/route.ts'), 'utf8');

  it('Load more does not call /api/user-teams', () => {
    expect(CLIENT).not.toMatch(/fetch\(\s*`\/api\/user-teams/);
  });

  it('Load more uses the shared paging helpers, not a local offset', () => {
    expect(CLIENT).toMatch(/applyTeamsPage\(/);
    expect(CLIENT).toMatch(/initialTeamsPageState/);
    expect(CLIENT).not.toMatch(/const offset = teams\.length/);
  });

  it('the first-page query tie-breaks on id after name and keeps one lookahead row', () => {
    expect(PAGE).toMatch(/\.order\('name'\)[\s\S]{0,160}\.order\('id'\)[\s\S]{0,160}\.range\(offset, offset \+ limit\)/);
    expect(PAGE).toMatch(/nameFetched\.slice\(0, limit\)/);
  });

  it('/api/teams orders by name then id', () => {
    expect(API).toMatch(/\.order\(orderCol,[\s\S]{0,60}\)\s*\.order\('id'/);
  });

  it('the "tracks more than" copy uses the canonical count, not the merged list length', () => {
    expect(PAGE).not.toMatch(/tracks more than \{initialTeams\.length/);
    expect(PAGE).toMatch(/teamsN != null \? `more than \$\{teamsN\.toLocaleString\(\)\}/);
  });
});
