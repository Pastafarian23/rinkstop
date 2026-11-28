import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let currentUser: string | null = null;
const tables: Record<string, any[]> = {};

function builder(table: string) {
  let inCol = '';
  const b: any = {};
  for (const m of ['select', 'eq', 'is', 'or', 'order', 'limit', 'gt', 'not']) b[m] = () => b;
  b.in = (col: string) => { inCol = col; return b; };
  b.then = (res: (v: unknown) => unknown) => {
    let rows = tables[table] ?? [];
    if (table === 'team_workspaces') rows = rows.filter((r) => (inCol === 'slug' ? true : true));
    return Promise.resolve({ data: rows, error: null }).then(res);
  };
  return b;
}
// team_workspaces is queried twice (by slug, then opponents by id); serve each from its own list.
let twCalls = 0;
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: currentUser }) }));
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => {
      if (t === 'team_workspaces') {
        const key = twCalls++ === 0 ? 'tw_slugs' : 'tw_opps';
        const b: any = {};
        for (const m of ['select', 'eq', 'in']) b[m] = () => b;
        b.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: tables[key] ?? [], error: null }).then(res);
        return b;
      }
      return builder(t);
    },
  },
}));

async function get(slugs: string) {
  const { GET } = await import('@/app/api/followed-teams-games/route');
  const { NextRequest } = await import('next/server');
  return GET(new NextRequest('http://localhost/api/followed-teams-games?slugs=' + slugs));
}

const team = (id: string, slug: string, visibility: string): any => ({ id, name: slug.toUpperCase(), slug, avatar_url: null, visibility });
const game = (id: string, home: string, away: string, status: string): any => ({
  id, scheduled_at: '2026-11-30T00:00:00Z', status, home_score: 1, away_score: 0, home_team_id: home, away_team_id: away,
});

beforeEach(() => {
  currentUser = null; twCalls = 0;
  for (const k of Object.keys(tables)) delete tables[k];
});

describe('/api/followed-teams-games privacy', () => {
  it('returns nothing for a private team requested by an anonymous visitor', async () => {
    tables.tw_slugs = [team('p', 'secret', 'private')];
    const body = await (await get('secret')).json();
    expect(body.teams).toEqual([]);
    expect(JSON.stringify(body)).not.toMatch(/SECRET|"p"/);
  });

  it('still returns a public team with its opponent', async () => {
    tables.tw_slugs = [team('a', 'open', 'public')];
    tables.fixtures = [game('g1', 'a', 'o', 'completed')];
    tables.tw_opps = [team('o', 'rival', 'public')];
    const res = await get('open');
    const body = await res.json();
    expect(body.teams.length).toBe(1);
    expect(body.teams[0].team.slug).toBe('open');
    expect(body.teams[0].lastGame.opponent.slug).toBe('rival');
    expect(JSON.stringify(body)).not.toMatch(/visibility/);
    expect(res.headers.get('cache-control') || '').not.toMatch(/no-store/);
  });

  it('drops a game against a private opponent and does not name that opponent', async () => {
    tables.tw_slugs = [team('a', 'open', 'public')];
    tables.fixtures = [game('g2', 'a', 'q', 'completed')];
    tables.tw_opps = [team('q', 'hidden-rival', 'private')];
    const body = await (await get('open')).json();
    expect(body.teams[0].lastGame).toBeNull();
    expect(JSON.stringify(body)).not.toMatch(/hidden-rival|HIDDEN-RIVAL/);
  });

  it('shows a private team to an active member, and marks the response private, no-store', async () => {
    currentUser = 'user_member';
    tables.team_members = [{ team_id: 'p' }];
    tables.tw_slugs = [team('p', 'secret', 'private')];
    tables.fixtures = [];
    tables.tw_opps = [];
    const res = await get('secret');
    const body = await res.json();
    expect(body.teams[0].team.slug).toBe('secret');
    expect(res.headers.get('cache-control')).toMatch(/private, no-store/);
    expect(res.headers.get('vary')).toMatch(/Cookie/i);
  });

  it('does not show a private team to a signed-in user who is not a member', async () => {
    currentUser = 'user_other';
    tables.team_members = [{ team_id: 'someone-elses' }];
    tables.tw_slugs = [team('p', 'secret', 'private')];
    const body = await (await get('secret')).json();
    expect(body.teams).toEqual([]);
  });
});

describe('wiring: staff record, QA counts, redirects and the reviewed helpers', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
  it('the community coach record is public-only', () => {
    expect(read('src/lib/staff-record.ts')).toMatch(/\.eq\('id', rawId\)\s*\n\s*\/\/[^\n]*\n\s*\.eq\('team_workspaces\.visibility', 'public'\)\s*\n\s*\.maybeSingle\(\)/);
  });
  it('QA content counts only public teams', () => {
    expect(read('src/lib/qa-content-generator.ts')).toContain(".eq('is_active', true).eq('visibility', 'public')");
  });
  it('timeline-builder stays viewer-scoped (signed-in dashboard callers pass the user id)', () => {
    expect(read('src/lib/timeline-builder.ts')).toContain('managerUserId: string');
    expect(read('src/app/dashboard/profile/page.tsx')).toContain('buildTimeline(pid, userId)');
  });
  it('team-notifications has no public caller', () => {
    expect(read('src/app/api/team/[slug]/posts/route.ts')).toContain('fanOutTeamNotification');
  });
});
