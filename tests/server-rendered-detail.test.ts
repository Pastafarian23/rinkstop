import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup, renderToReadableStream } from 'react-dom/server';

// Waits for Suspense boundaries, then returns the complete server HTML.
async function renderHtml(el: any): Promise<string> {
  const stream = await renderToReadableStream(el as any);
  await stream.allReady;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out + decoder.decode();
}

// Test-only data source. Replaces the Supabase client for these server-rendered
// pages; no network, no database, no production configuration.
const fx = vi.hoisted(() => ({ rink: null as any, team: null as any }));

// Signed-out Clerk stand-in (staging-only), so client hooks render without a provider.
vi.mock('@clerk/nextjs', () => import('../staging-stubs/clerk-signed-out'));
vi.mock('@clerk/nextjs/server', () => import('../staging-stubs/clerk-signed-out'));
// No App Router in unit tests: navigation helpers and hooks are inert.
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
  redirect: (url: string) => { throw new Error('NEXT_REDIRECT:' + url); },
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, prefetch() {}, back() {} }),
}));

vi.mock('@/lib/supabase', () => {
  const rowsFor = (table: string): any[] =>
    table === 'rinks' ? (fx.rink ? [fx.rink] : []) : table === 'team_workspaces' ? (fx.team ? [fx.team] : []) : [];
  const make = (table: string): any => {
    const chain: any = {};
    const self = () => chain;
    for (const m of ['select', 'eq', 'neq', 'ilike', 'or', 'in', 'order', 'range', 'limit', 'is', 'not', 'gte', 'lte', 'filter', 'contains', 'match', 'returns', 'throwOnError', 'abortSignal']) chain[m] = self;
    chain.maybeSingle = async () => ({ data: rowsFor(table)[0] ?? null, error: null });
    chain.single = async () => ({ data: rowsFor(table)[0] ?? null, error: null });
    chain.then = (res: any, rej: any) => Promise.resolve({ data: rowsFor(table), error: null, count: rowsFor(table).length }).then(res, rej);
    return chain;
  };
  const client = { from: (t: string) => make(t), rpc: async () => ({ data: null, error: null }) };
  return { supabase: client, supabaseAdmin: client };
});

import RinkDetailPage from '@/app/directory/rinks/[slug]/page';
import PublicTeamPage from '@/app/directory/teams/[slug]/page';

const RINK = {
  id: 'rk-1', name: 'Fixture Detail Arena', slug: 'fixture-detail-arena', city: 'Howell', province_state: 'MI',
  country: 'USA', address: '100 Synthetic Way, Howell, MI', latitude: 42.6, longitude: -83.9, capacity: 500,
  ice_size: 'NHL', surface_type: 'Ice', website_url: 'https://example.invalid/arena', logo_url: null,
  cover_photo_url: null, is_active: true, notes: 'Public editorial copy about the arena.', notes_generated: null,
  meta_description: 'Fixture arena description.', status: 'active', opening_hours_json: null,
  qr_identifier: 'ab12cd34-public-id-0001', qr_revoked_at: null, claimable: true, timezone: 'America/Detroit',
  created_at: '2026-01-01', updated_at: '2026-01-01', source: 'fixture', place_id: null, google_website: null,
  google_maps_url: null, static_map_url: null, league: null, cover_photo_verified_at: null,
  cover_photo_source: null, seo_h1: null, seo_title: null, verification_tier: null, claimed_by_user_id: 'user-secret-999',
  owner_email: 'owner-private@example.invalid',
};

const TEAM = {
  id: 'tm-1', name: 'Fixture Federation Team', slug: 'fixture-federation-team', short_name: null, home_rink_id: null,
  home_city: 'Chandigarh', home_country: 'India', country_code: 'IN', age_category: 'adult', age_label: 'Adult',
  age_min: null, age_max: null, level: 'Senior', season_label: '2025-26', description: 'Fixture team.',
  visibility: 'public', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01', avatar_url: null,
  banner_url: null, federation_id: 'fed-in', organization_id: null, league_id: null, website_url: null,
  division: null, home_state: null, timezone: null, is_published: true,
  federation: { id: 'fed-in', name: 'Hockey India', slug: 'in' }, league: null, organization: null,
  founded_on: null, contact_email: 'team-private@example.invalid',
};

beforeEach(() => { fx.rink = null; fx.team = null; });

async function renderRink(slug: string) {
  const el = await RinkDetailPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) } as any);
  return renderHtml(el);
}

describe('rink detail (server-rendered HTML, mocked data source)', () => {
  it('renders the active public rink with its name and address', async () => {
    fx.rink = { ...RINK };
    const html = await renderRink('fixture-detail-arena');
    expect(html).toContain('Fixture Detail Arena');
    expect(html).toContain('100 Synthetic Way');
  });

  it('shows the public QR identifier (intended public display, truncated)', async () => {
    fx.rink = { ...RINK };
    const html = await renderRink('fixture-detail-arena');
    expect(html).toContain('ab12cd34');
    expect(html).toContain('0001');
  });

  it('hides QR display when the rink is revoked and never renders the revocation timestamp', async () => {
    fx.rink = { ...RINK, qr_revoked_at: '2026-03-03T03:03:03.000Z' };
    const html = await renderRink('fixture-detail-arena');
    expect(html).not.toContain('2026-03-03');
    expect(html).not.toMatch(/QR: ab12cd34/);
  });

  it('never exposes claimer ids, owner or contact fields in HTML', async () => {
    fx.rink = { ...RINK };
    const html = await renderRink('fixture-detail-arena');
    for (const secret of ['user-secret-999', 'owner-private@example.invalid', 'claimed_by_user_id', 'owner_email', 'service_role', 'sk_live']) {
      expect(html.includes(secret), `HTML contains ${secret}`).toBe(false);
    }
  });
});

describe('team profile federation link (server-rendered, mocked data source)', () => {
  it('links the federation to its /federations destination', async () => {
    fx.team = { ...TEAM };
    const el = await PublicTeamPage({ params: Promise.resolve({ slug: 'fixture-federation-team' }) } as any);
    const html = renderToStaticMarkup(el as any);
    expect(html).toContain('Hockey India');
    expect(html).toContain('href="/federations/in"');
  });

  it('never exposes team contact fields in HTML', async () => {
    fx.team = { ...TEAM };
    const el = await PublicTeamPage({ params: Promise.resolve({ slug: 'fixture-federation-team' }) } as any);
    const html = renderToStaticMarkup(el as any);
    expect(html.includes('team-private@example.invalid')).toBe(false);
  });
});
