import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let canonicalRow: { id: string } | null = null;
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => {
      const b: any = {};
      for (const m of ['select', 'eq']) b[m] = () => b;
      b.maybeSingle = () => Promise.resolve({ data: canonicalRow, error: null });
      return b;
    },
  },
}));

import {
  PWHL_FRANCHISES,
  isPwhlAliasSlug,
  isPwhlCanonicalSlug,
  normalizePwhlTeams,
  pwhlAliasRedirectTarget,
  pwhlCanonicalForAlias,
} from '@/lib/pwhl-franchises';

const OFFICIAL = [
  'boston-fleet', 'minnesota-frost', 'montreal-victoire', 'new-york-sirens', 'ottawa-charge', 'toronto-sceptres',
  'vancouver-goldeneyes', 'seattle-torrent', 'detroit-clutch', 'hamilton-havoc', 'san-jose-sea-lions', 'vegas-vanguards',
];

describe('registry integrity (official thepwhl.com franchise list and conferences)', () => {
  it('has exactly the 12 official canonical slugs', () => {
    expect(PWHL_FRANCHISES.map((f) => f.slug).sort()).toEqual([...OFFICIAL].sort());
  });
  it('has six teams in each conference', () => {
    expect(PWHL_FRANCHISES.filter((f) => f.conference === 'Eastern').length).toBe(6);
    expect(PWHL_FRANCHISES.filter((f) => f.conference === 'Western').length).toBe(6);
  });
  it('official conference assignments', () => {
    const east = ['boston-fleet', 'hamilton-havoc', 'montreal-victoire', 'new-york-sirens', 'ottawa-charge', 'toronto-sceptres'];
    for (const s of east) expect(PWHL_FRANCHISES.find((f) => f.slug === s)!.conference).toBe('Eastern');
  });
  it('lists 25 aliases, all unique, none equal to a canonical slug', () => {
    const all = PWHL_FRANCHISES.flatMap((f) => f.aliases);
    expect(all.length).toBe(25);
    expect(new Set(all).size).toBe(25);
    for (const a of all) expect(isPwhlCanonicalSlug(a)).toBe(false);
  });
  it('never treats unrelated rows as aliases (no merge by name)', () => {
    expect(isPwhlAliasSlug('seattle-storm')).toBe(false);
    expect(isPwhlAliasSlug('minnesota-whitecaps')).toBe(false);
    expect(pwhlCanonicalForAlias('seattle-storm')).toBeNull();
  });
  it('maps the known legacy slugs to the right franchise', () => {
    expect(pwhlCanonicalForAlias('pwhl-detroit')).toBe('detroit-clutch');
    expect(pwhlCanonicalForAlias('pwhl-las-vegas')).toBe('vegas-vanguards');
    expect(pwhlCanonicalForAlias('toronto-pwhl')).toBe('toronto-sceptres');
    expect(pwhlCanonicalForAlias('montréal-victoire')).toBe('montreal-victoire');
    expect(pwhlCanonicalForAlias('boston-fleet-pwhl')).toBe('boston-fleet');
  });
});

describe('normalizePwhlTeams: exactly one listing per franchise, canonical links', () => {
  const rows = [
    { id: '1', name: 'Boston Fleet', slug: 'boston-fleet' },
    { id: '2', name: 'Boston PWHL', slug: 'pwhl-boston-fleet' },
    { id: '3', name: 'PWHL Boston', slug: 'pwhl-boston-women' },
    { id: '4', name: 'Toronto PWHL', slug: 'toronto-pwhl' },
    { id: '5', name: 'Toronto Sceptres', slug: 'toronto-sceptres' },
    { id: '6', name: 'Montréal Victoire', slug: 'montréal-victoire' },
    { id: '7', name: 'Seattle Storm', slug: 'seattle-storm' },
  ];
  const out = normalizePwhlTeams(rows);
  it('returns exactly 12 entries with the 12 canonical slugs, no duplicates', () => {
    expect(out.length).toBe(12);
    expect(out.map((t) => t.slug).sort()).toEqual([...OFFICIAL].sort());
    expect(new Set(out.map((t) => t.slug)).size).toBe(12);
  });
  it('prefers the row that already carries the canonical slug', () => {
    expect(out.find((t) => t.slug === 'boston-fleet')!.id).toBe('1');
    expect(out.find((t) => t.slug === 'toronto-sceptres')!.id).toBe('5');
  });
  it('falls back to an alias row and applies the canonical name and slug', () => {
    const mtl = out.find((t) => t.slug === 'montreal-victoire')!;
    expect(mtl.id).toBe('6');
    expect(mtl.name).toBe('Montréal Victoire');
  });
  it('lists franchises with no readable row from the registry, with the official name', () => {
    const det = out.find((t) => t.slug === 'detroit-clutch')!;
    expect(det.name).toBe('Detroit Clutch');
    expect(String(det.id)).toBe('pwhl:detroit-clutch');
  });
  it('never includes an unrelated row such as seattle-storm', () => {
    expect(out.some((t) => t.slug === 'seattle-storm' || t.name === 'Seattle Storm')).toBe(false);
  });
  it('with no rows at all still returns the 12 franchises', () => {
    expect(normalizePwhlTeams([]).length).toBe(12);
  });
});

describe('pwhlAliasRedirectTarget: redirect only when the canonical page is public', () => {
  beforeEach(() => { canonicalRow = null; });
  it('redirects a legacy slug when the canonical row is public and active', async () => {
    canonicalRow = { id: 'x' };
    expect(await pwhlAliasRedirectTarget('pwhl-detroit')).toBe('detroit-clutch');
  });
  it('does NOT redirect while the canonical row is missing or not public (no early 404, no private reveal)', async () => {
    canonicalRow = null;
    expect(await pwhlAliasRedirectTarget('pwhl-detroit')).toBeNull();
    expect(await pwhlAliasRedirectTarget('montréal-victoire')).toBeNull();
  });
  it('never redirects a canonical slug (no loops)', async () => {
    canonicalRow = { id: 'x' };
    for (const s of OFFICIAL) expect(await pwhlAliasRedirectTarget(s)).toBeNull();
  });
  it('never redirects a slug that is not a known alias', async () => {
    canonicalRow = { id: 'x' };
    expect(await pwhlAliasRedirectTarget('seattle-storm')).toBeNull();
    expect(await pwhlAliasRedirectTarget('minnesota-whitecaps')).toBeNull();
  });
});

describe('wiring', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
  it('the team page issues a permanent redirect and canonical metadata for aliases', () => {
    const src = read('src/app/directory/teams/[slug]/page.tsx');
    expect(src).toContain("import { notFound, permanentRedirect } from 'next/navigation';");
    expect(src).toContain("permanentRedirect('/directory/teams/' + encodeURIComponent(pwhlTarget))");
    expect(src.match(/pwhlAliasRedirectTarget\(normalizedSlug\)/g)?.length).toBe(2);
    expect(src).toContain("robots: { index: false, follow: true }");
  });
  it('the landing page lists the normalised 12 franchises', () => {
    expect(read('src/app/directory/pwhl/page.tsx')).toContain('normalizePwhlTeams(rawTeams as any[])');
  });
  it('the team sitemap leaves out alias slugs', () => {
    expect(read('src/app/sitemap-teams.xml/route.ts')).toContain('!isPwhlAliasSlug(t.slug)');
  });
});
