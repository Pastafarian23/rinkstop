import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const team = (id: string, name: string, slug: string) => ({ id, name, slug, home_city: 'X', home_country: 'USA', is_active: true, visibility: 'public' });

beforeEach(() => {
  h.tables = {
    rinks: [], players: [], leagues: [], brands: [],
    team_workspaces: [
      team('1', 'Boston Fleet', 'boston-fleet'),
      team('2', 'Boston PWHL', 'pwhl-boston-fleet'),
      team('3', 'PWHL Boston', 'pwhl-boston-women'),
      team('4', 'Boston Fleet', 'boston-fleet-pwhl'),
      team('5', 'Seattle Storm', 'seattle-storm'),
      team('6', 'Minnesota Whitecaps', 'minnesota-whitecaps'),
      team('7', 'Minnesota Frost', 'minnesota-frost'),
      team('8', 'Montréal Victoire', 'montréal-victoire'),
      team('9', 'Montreal Victo', 'montreal-victo'),
      team('10', 'Montreal PWHL', 'pwhl-montreal-victoire'),
      team('11', 'PWHL Montreal', 'pwhl-montreal-women'),
    ],
  };
});

async function search(q: string) {
  const res = await GET(new NextRequest('http://localhost/api/search/results?q=' + encodeURIComponent(q) + '&type=team'));
  const body = await res.json();
  return (body.results?.team || body.team || []).map((t: any) => t.slug) as string[];
}

describe('site search lists one entry per PWHL franchise and keeps historical clubs', () => {
  it('searching for Boston returns the canonical team, not the duplicate rows', async () => {
    const slugs = await search('Boston');
    expect(slugs).toContain('boston-fleet');
    expect(slugs).not.toContain('pwhl-boston-fleet');
    expect(slugs).not.toContain('pwhl-boston-women');
    expect(slugs).not.toContain('boston-fleet-pwhl');
  });
  it('Montréal Victoire stays discoverable through its public stand-in; the other Montreal duplicates are hidden', async () => {
    const slugs = await search('Montr');
    expect(slugs).toContain('montréal-victoire');
    expect(slugs).not.toContain('montreal-victo');
    expect(slugs).not.toContain('pwhl-montreal-victoire');
    expect(slugs).not.toContain('pwhl-montreal-women');
  });
  it('Seattle Storm is still found (not an alias, not merged by name)', async () => {
    expect(await search('Seattle')).toContain('seattle-storm');
  });
  it('Minnesota Whitecaps and Minnesota Frost are both found', async () => {
    const slugs = await search('Minnesota');
    expect(slugs).toContain('minnesota-whitecaps');
    expect(slugs).toContain('minnesota-frost');
  });
});
