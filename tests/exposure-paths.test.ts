import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('privileged public endpoints only return public teams', () => {
  it('the team stats widget does not resolve a non-public team', () => {
    expect(read('src/app/api/widgets/team-stats/[slug]/route.ts')).toMatch(/\.eq\('slug', slug\)\s*\n\s*\/\/[^\n]*\n\s*\.eq\('visibility', 'public'\)/);
  });
  it('related listings by id only resolve public teams', () => {
    expect(read('src/app/api/related-directory/by-id/route.ts')).toMatch(/\.in\('id', teamIds\)[\s\S]{0,120}\.eq\('visibility', 'public'\)/);
  });
  it('the public staff list excludes coaches of non-public teams', () => {
    const src = read('src/app/api/staff/[role]/route.ts');
    expect(src).toContain("team_workspaces!inner(");
    expect(src).toContain(".eq('team_workspaces.visibility', 'public')");
  });
  it('search results show a player team name only for public teams', () => {
    const src = read('src/app/api/search/results/route.ts');
    expect(src).toContain('team_workspaces(name, visibility)');
    expect(src).toContain("team && team.visibility === 'public' ? team.name : undefined");
  });
  it('suggestions show a player team name only for public teams and exclude private-team staff', () => {
    const src = read('src/app/api/search/suggest/route.ts');
    expect(src).toContain('team_workspaces(name, visibility)');
    expect(src).toContain("team && team.visibility === 'public' ? team.name : undefined");
    expect(src).toContain("team_workspaces!inner(name)");
    expect(src).toContain(".eq('team_workspaces.visibility', 'public')");
  });
});

describe('league and region pages count only public teams', () => {
  const dir = join(process.cwd(), 'src/app/directory');
  const pages = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => 'src/app/directory/' + d.name + '/page.tsx')
    .filter((p) => existsSync(join(process.cwd(), p)))
    .filter((p) => /from\('team_workspaces'\)\s*\n\s*\.select\('id', \{ count: 'exact', head: true \}\)/.test(read(p)));

  it('found the league pages that run the count query', () => {
    expect(pages.length).toBeGreaterThanOrEqual(30);
  });
  for (const p of pages) {
    it(p + ' filters visibility = public on the team count', () => {
      expect(read(p)).toMatch(/\.select\('id', \{ count: 'exact', head: true \}\)\s*\n\s*\.eq\('visibility', 'public'\)/);
    });
  }
});

describe('games list: server page and browser client', () => {
  for (const file of ['src/app/directory/games/page.tsx', 'src/app/directory/games/GamesIndexClient.tsx']) {
    it(file + ' joins both teams inner and filters both to public', () => {
      const src = read(file);
      expect(src).not.toMatch(/home_team:team_workspaces!home_team_id\(/);
      expect(src).not.toMatch(/away_team:team_workspaces!away_team_id\(/);
      expect(src).toMatch(/home_team:team_workspaces!home_team_id!inner\(/);
      expect(src).toMatch(/away_team:team_workspaces!away_team_id!inner\(/);
      expect(src).toContain(".eq('home_team.visibility', 'public')");
      expect(src).toContain(".eq('away_team.visibility', 'public')");
    });
    it(file + ' resolves team and search lookups against public teams only', () => {
      const src = read(file);
      expect(src).toContain(".eq('slug', team).eq('visibility', 'public')");
      expect(src).toContain(".select('id').eq('visibility', 'public').ilike('name'");
    });
  }

  it('the server page applies the filter to the main query and both merged-window queries', () => {
    const src = read('src/app/directory/games/page.tsx');
    expect(src.match(/\.eq\('home_team\.visibility', 'public'\)/g)?.length).toBe(3);
    expect(src.match(/\.eq\('away_team\.visibility', 'public'\)/g)?.length).toBe(3);
  });

  it('the shared cache key is versioned so pre-fix cached pages are not reused', () => {
    expect(read('src/app/directory/games/page.tsx')).toContain("'v2-public-only'");
  });

  it('the server page never reads the viewer session (its output is shared via cache)', () => {
    expect(read('src/app/directory/games/page.tsx')).not.toMatch(/auth\(\)|currentUser|cookies\(\)/);
  });

  it('the client keeps member games out of the public list and out of paging', () => {
    const src = read('src/app/directory/games/GamesIndexClient.tsx');
    expect(src).toContain("fetch('/api/scores/mine?'");
    expect(src).toContain('const currentLen = baseGames.length;');
    expect(src).toContain('mergeMemberGames(baseGames, memberGames, q)');
    expect(src).toMatch(/if \(!isSignedIn\) \{\s*\n\s*setMemberGames\(\[\]\);/);
  });
});

describe('the member-only endpoint is gated and uncacheable', () => {
  const src = read('src/app/api/scores/mine/route.ts');
  it('requires a session and uses the same access rule as the game page', () => {
    expect(src).toContain('await auth()');
    expect(src).toContain('canViewFixture(f, memberTeamIds)');
    expect(src).toContain(".is('left_at', null)");
  });
  it('is dynamic and sends private, no-store', () => {
    expect(src).toContain("export const dynamic = 'force-dynamic'");
    expect(src).toContain("'Cache-Control': 'private, no-store, max-age=0'");
  });
});

describe('shared-cache game modules only contain games between public teams', () => {
  const src = read('src/lib/game-modules.ts');
  it('every fixtures query inner-joins both teams and filters both to public', () => {
    expect(src.match(/home_team:team_workspaces!home_team_id!inner\(/g)?.length).toBe(4);
    expect(src.match(/away_team:team_workspaces!away_team_id!inner\(/g)?.length).toBe(4);
    expect(src.match(/\.eq\('home_team\.visibility', 'public'\)/g)?.length).toBe(4);
    expect(src.match(/\.eq\('away_team\.visibility', 'public'\)/g)?.length).toBe(4);
    expect(src).not.toMatch(/home_team:team_workspaces!home_team_id\(/);
  });
  it('the cache keys are versioned so pre-fix cached entries are not reused', () => {
    for (const k of ['team-form-public-v2', 'h2h-public-v2', 'next-game-public-v2', 'same-day-public-v2']) expect(src).toContain("'" + k + "'");
  });
});

describe('news team redirect does not confirm a private team exists', () => {
  it('the team slug lookup is public-only', () => {
    expect(read('src/lib/news-team-redirect.ts')).toMatch(/\.eq\('slug', slug\)\s*\n\s*\/\/[^\n]*\n\s*\.eq\('visibility', 'public'\)\s*\n\s*\.maybeSingle\(\)/);
  });
});

describe('profile role history hides non-public team id and name', () => {
  const src = read('src/lib/unified-profile.ts');
  it('selects visibility and masks id and name through one helper', () => {
    expect(src).toContain(".select('id, name, slug, avatar_url, visibility')");
    expect(src).toContain('const hiddenTeam = (id: unknown): boolean');
    expect(src).toContain('teamId: hiddenTeam(r.team_id) ? null');
    expect(src).toContain('teamName: r.team_id && !hiddenTeam(r.team_id)');
  });
});
