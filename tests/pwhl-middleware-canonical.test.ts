import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => ({}) } }));

import { PWHL_CANONICAL_SLUG_LIST, isPwhlCanonicalSlugPure } from '@/lib/pwhl-canonical-slugs';
import { PWHL_FRANCHISES } from '@/lib/pwhl-franchises';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('dependency-free canonical slug list (used by the Edge middleware)', () => {
  it('is identical to the registry (no drift)', () => {
    expect([...PWHL_CANONICAL_SLUG_LIST].sort()).toEqual(PWHL_FRANCHISES.map((f) => f.slug).sort());
  });
  it('has no imports (safe for the Edge runtime)', () => {
    expect(read('src/lib/pwhl-canonical-slugs.ts')).not.toMatch(/^import /m);
  });
  it('recognises canonical slugs only', () => {
    expect(isPwhlCanonicalSlugPure('montreal-victoire')).toBe(true);
    expect(isPwhlCanonicalSlugPure('montréal-victoire')).toBe(false);
    expect(isPwhlCanonicalSlugPure('pwhl-detroit')).toBe(false);
  });
});

describe('middleware never redirects a canonical PWHL slug', () => {
  const src = read('src/middleware.ts');
  it('imports the pure list', () => {
    expect(src).toContain("import { isPwhlCanonicalSlugPure } from './lib/pwhl-canonical-slugs';");
  });
  it('skips both the slug-redirect table and the ASCII-fold fallback for canonical slugs', () => {
    expect(src).toContain("if (slug && !slug.includes('.') && !isPwhlCanonicalSlugPure(slug)) {\n        let toSlug = await lookupTeamSlugRedirect(slug);");
    // the fold fallback sits inside the same guarded block
    const i = src.indexOf('!isPwhlCanonicalSlugPure(slug)');
    const j = src.indexOf('lookupTeamSlugByFoldedSlug(slug)', i);
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
    expect(j - i).toBeLessThan(900);
  });
});
