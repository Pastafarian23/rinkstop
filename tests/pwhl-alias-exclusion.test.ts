import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => ({}) } }));

import { PWHL_ALIAS_NOT_IN, PWHL_ALIAS_SLUGS, PWHL_FRANCHISES } from '@/lib/pwhl-franchises';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('alias exclusion filter is built from the registry', () => {
  it('has the 25 legacy aliases and quotes every slug (accented slugs are safe)', () => {
    expect(PWHL_ALIAS_SLUGS.length).toBe(25);
    expect(PWHL_ALIAS_NOT_IN.startsWith('("')).toBe(true);
    expect(PWHL_ALIAS_NOT_IN.endsWith('")')).toBe(true);
    expect(PWHL_ALIAS_NOT_IN).toContain('"montréal-victoire"');
    expect(PWHL_ALIAS_NOT_IN.split('","').length).toBe(25);
  });
  it('never excludes a canonical slug', () => {
    for (const f of PWHL_FRANCHISES) expect(PWHL_ALIAS_NOT_IN).not.toContain('"' + f.slug + '"');
  });
  it('never excludes legitimate historical clubs', () => {
    expect(PWHL_ALIAS_NOT_IN).not.toContain('seattle-storm');
    expect(PWHL_ALIAS_NOT_IN).not.toContain('minnesota-whitecaps');
  });
});

describe('public discovery surfaces exclude legacy PWHL duplicates', () => {
  const FILTER = ".not('slug', 'in', PWHL_ALIAS_NOT_IN)";
  for (const file of [
    'src/app/api/search/results/route.ts',
    'src/app/api/search/suggest/route.ts',
    'src/app/api/related-directory/route.ts',
    'src/app/api/related-directory/by-id/route.ts',
    'src/app/api/teams/route.ts',
  ]) {
    it(file + ' imports and applies the filter', () => {
      const src = read(file);
      expect(src).toContain("import { PWHL_ALIAS_NOT_IN } from '@/lib/pwhl-franchises';");
      expect(src).toContain(FILTER);
    });
  }
  it('the /api/teams lookup by id or slug is not filtered (legacy URLs can still redirect)', () => {
    const src = read('src/app/api/teams/route.ts');
    const i = src.indexOf("query = query.eq('slug', slug).limit(1);");
    const j = src.indexOf(FILTER);
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
  });
  it('the sitemap also leaves out aliases', () => {
    expect(read('src/app/sitemap-teams.xml/route.ts')).toContain('!isPwhlAliasSlug(t.slug)');
  });
});
