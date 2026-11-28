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

import { PWHL_FRANCHISES, isPwhlAliasSlug, isPwhlCanonicalSlug, pwhlTemporaryFallbackTarget } from '@/lib/pwhl-franchises';

const CONFIG = readFileSync(join(process.cwd(), 'next.config.js'), 'utf8');
const rules: Array<[string, string]> = [];
for (const line of CONFIG.split('\n')) {
  const m = line.match(/source:\s*'\/directory\/teams\/([^']+)'\s*,\s*destination:\s*'\/directory\/teams\/([^']+)'/);
  if (m) rules.push([m[1], m[2]]);
}
const relevant = rules.filter(([s, d]) => isPwhlCanonicalSlug(s) || isPwhlAliasSlug(s) || isPwhlCanonicalSlug(d) || isPwhlAliasSlug(d));

describe('static redirects in next.config.js never fight the canonical registry', () => {
  it('finds the PWHL-related team redirects', () => {
    expect(relevant.length).toBeGreaterThanOrEqual(5);
  });
  it('no static rule has a canonical slug as its source (a canonical page must never redirect)', () => {
    for (const [s] of relevant) expect(isPwhlCanonicalSlug(s)).toBe(false);
  });
  it('no static rule points at an alias; every destination is a canonical slug', () => {
    for (const [, d] of relevant) {
      expect(isPwhlAliasSlug(d)).toBe(false);
      expect(isPwhlCanonicalSlug(d)).toBe(true);
    }
  });
  it('no redirect chain loops, assuming every canonical page is public', () => {
    const next = new Map<string, string>();
    for (const [s, d] of rules) next.set(s, d);
    for (const f of PWHL_FRANCHISES) for (const a of f.aliases) next.set(a, f.slug);
    // canonical slugs have no outgoing edge
    for (const f of PWHL_FRANCHISES) next.delete(f.slug);
    for (const start of next.keys()) {
      const seen = new Set<string>();
      let cur: string | undefined = start;
      while (cur && next.has(cur)) {
        expect(seen.has(cur)).toBe(false);
        seen.add(cur);
        cur = next.get(cur);
      }
    }
  });
  it('every legacy marketing slug ends at a canonical team in at most two hops', () => {
    const next = new Map<string, string>();
    for (const [s, d] of rules) next.set(s, d);
    for (const f of PWHL_FRANCHISES) for (const a of f.aliases) next.set(a, f.slug);
    for (const [s] of relevant) {
      let cur = s, hops = 0;
      while (next.has(cur)) { cur = next.get(cur)!; hops++; }
      expect(isPwhlCanonicalSlug(cur)).toBe(true);
      expect(hops).toBeLessThanOrEqual(2);
    }
  });
});

describe('temporary Montreal fallback applies only while the canonical page is not public', () => {
  beforeEach(() => { canonicalRow = null; });
  it('redirects the canonical Montreal slug to the working page while no public canonical row exists', async () => {
    expect(await pwhlTemporaryFallbackTarget('montreal-victoire')).toBe('montréal-victoire');
  });
  it('does nothing once the canonical Montreal row is public (no loop)', async () => {
    canonicalRow = { id: 'x' };
    expect(await pwhlTemporaryFallbackTarget('montreal-victoire')).toBeNull();
  });
  it('never applies to any other slug', async () => {
    for (const s of ['boston-fleet', 'toronto-sceptres', 'montreal-victo', 'seattle-storm']) expect(await pwhlTemporaryFallbackTarget(s)).toBeNull();
  });
});
