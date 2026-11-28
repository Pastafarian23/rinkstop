import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Private/unlisted team workspaces must stay out of public discovery
// (search, suggest, related-directory, sitemap) and must not be indexed.
// They remain in the database and are still reachable by owners and
// members through their own routes. Source-level pins, because these
// queries run against the admin client and cannot be exercised without
// Supabase.

const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('private team workspaces are excluded from public discovery', () => {
  it('search [type] team query filters to visibility = public', () => {
    const src = read('src/app/api/search/[type]/route.ts');
    const block = src.slice(src.indexOf("if (type === 'team')"));
    expect(block.slice(0, 400)).toMatch(/\.eq\('visibility', 'public'\)/);
  });

  it('search results team query filters to visibility = public', () => {
    const src = read('src/app/api/search/results/route.ts');
    const i = src.indexOf(".select('id, name, slug, home_city, home_country, leagues(name)', { count: 'exact' })");
    expect(i).toBeGreaterThan(-1);
    expect(src.slice(i, i + 300)).toMatch(/\.eq\('visibility', 'public'\)/);
  });

  it('search suggest team query filters to visibility = public', () => {
    const src = read('src/app/api/search/suggest/route.ts');
    const i = src.indexOf("include('team')");
    expect(i).toBeGreaterThan(-1);
    expect(src.slice(i, i + 400)).toMatch(/\.eq\('visibility', 'public'\)/);
  });

  it('related-directory team query filters to visibility = public', () => {
    const src = read('src/app/api/related-directory/route.ts');
    const i = src.indexOf("from('team_workspaces')");
    expect(i).toBeGreaterThan(-1);
    expect(src.slice(i, i + 200)).toMatch(/\.eq\('visibility', 'public'\)/);
  });

  it('team sitemap only lists public workspaces', () => {
    const src = read('src/app/sitemap-teams.xml/route.ts');
    const i = src.indexOf("from('team_workspaces')");
    expect(src.slice(i, i + 300)).toMatch(/\.eq\('visibility', 'public'\)/);
  });

  it('team detail page never indexes a non-public workspace', () => {
    const src = read('src/app/directory/teams/[slug]/page.tsx');
    expect(src).toMatch(/workspace not public'?,\s*uniquenessScore: 0 \}/);
    // Indexing must not fall through to the field-count heuristic for private teams.
    expect(src).not.toMatch(/: thinDecision;/);
  });
});
