import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  canViewFixture,
  filterPublicFixtures,
  isPublicFixture,
  nonPublicTeamIds,
} from '@/lib/fixture-visibility';

const pub = { id: 'p1', visibility: 'public' };
const priv = { id: 'x1', visibility: 'private' };
const priv2 = { id: 'x2', visibility: 'private' };
const unlisted = { id: 'u1', visibility: 'unlisted' };

describe('isPublicFixture', () => {
  it('a game between two public teams is public', () => {
    expect(isPublicFixture({ home_team: pub, away_team: { id: 'p2', visibility: 'public' } })).toBe(true);
  });
  it('a game with a private home team is not public', () => {
    expect(isPublicFixture({ home_team: priv, away_team: pub })).toBe(false);
  });
  it('a game with a private away team is not public', () => {
    expect(isPublicFixture({ home_team: pub, away_team: priv })).toBe(false);
  });
  it('a game with an unlisted team is not public', () => {
    expect(isPublicFixture({ home_team: pub, away_team: unlisted })).toBe(false);
  });
  it('an unknown or missing visibility value fails closed', () => {
    expect(isPublicFixture({ home_team: { id: 'a', visibility: null }, away_team: pub })).toBe(false);
    expect(isPublicFixture({ home_team: { id: 'a' }, away_team: pub })).toBe(false);
    expect(isPublicFixture({ home_team: { id: 'a', visibility: '' }, away_team: pub })).toBe(false);
  });
  it('a side with no joined team row has nothing private to leak', () => {
    expect(isPublicFixture({ home_team: null, away_team: pub })).toBe(true);
  });
  it('handles an embed returned as a one-element array', () => {
    expect(isPublicFixture({ home_team: [priv], away_team: pub })).toBe(false);
    expect(isPublicFixture({ home_team: [pub], away_team: [pub] })).toBe(true);
  });
  it('a missing fixture is not public', () => {
    expect(isPublicFixture(null)).toBe(false);
    expect(isPublicFixture(undefined)).toBe(false);
  });
});

describe('filterPublicFixtures', () => {
  it('drops games that involve a non-public team and keeps order', () => {
    const rows = [
      { id: 'g1', home_team: pub, away_team: pub },
      { id: 'g2', home_team: priv, away_team: pub },
      { id: 'g3', home_team: pub, away_team: unlisted },
      { id: 'g4', home_team: pub, away_team: pub },
    ];
    expect(filterPublicFixtures(rows).map((r) => r.id)).toEqual(['g1', 'g4']);
  });
  it('tolerates null and undefined input', () => {
    expect(filterPublicFixtures(null)).toEqual([]);
    expect(filterPublicFixtures(undefined)).toEqual([]);
  });
});

describe('canViewFixture: who may open a game page', () => {
  const game = { home_team: priv, away_team: pub };
  it('anyone may open a public game', () => {
    expect(canViewFixture({ home_team: pub, away_team: pub }, [])).toBe(true);
  });
  it('an anonymous visitor may not open a game with a private team', () => {
    expect(canViewFixture(game, [])).toBe(false);
  });
  it('an active member of the private team may open it', () => {
    expect(canViewFixture(game, ['x1'])).toBe(true);
    expect(canViewFixture(game, new Set(['x1']))).toBe(true);
  });
  it('a member of an unrelated team may not', () => {
    expect(canViewFixture(game, ['someone-else'])).toBe(false);
  });
  it('a member of only one of two private teams may not', () => {
    expect(canViewFixture({ home_team: priv, away_team: priv2 }, ['x1'])).toBe(false);
    expect(canViewFixture({ home_team: priv, away_team: priv2 }, ['x1', 'x2'])).toBe(true);
  });
  it('a non-public team with no id fails closed', () => {
    expect(canViewFixture({ home_team: { visibility: 'private' }, away_team: pub }, ['x1'])).toBe(false);
  });
  it('nonPublicTeamIds lists only the non-public teams', () => {
    expect(nonPublicTeamIds({ home_team: priv, away_team: pub })).toEqual(['x1']);
    expect(nonPublicTeamIds({ home_team: priv, away_team: unlisted })).toEqual(['x1', 'u1']);
    expect(nonPublicTeamIds({ home_team: pub, away_team: pub })).toEqual([]);
  });
});

describe('wiring: every public surface that joins fixtures to teams applies the rule', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

  const LISTS = [
    'src/app/directory/leagues/[id]/page.tsx',
    'src/app/page.tsx',
    'src/app/directory/players/[id]/page.tsx',
  ];
  for (const file of LISTS) {
    it(file + ' selects team visibility and filters with filterPublicFixtures', () => {
      const src = read(file);
      expect(src).toContain("from '@/lib/fixture-visibility'");
      expect(src).toContain('filterPublicFixtures(');
      expect(src).toMatch(/fixtures_home_team_id_fkey\(name, slug, visibility\)/);
      expect(src).toMatch(/fixtures_away_team_id_fkey\(name, slug, visibility\)/);
    });
  }

  it('the league page filters recent, upcoming and today lists and over-fetches before filtering', () => {
    const src = read('src/app/directory/leagues/[id]/page.tsx');
    expect(src).toMatch(/recentFixtures = filterPublicFixtures\(recentData/);
    expect(src).toMatch(/upcomingFixtures = filterPublicFixtures\(upcomingData/);
    expect(src).toMatch(/todayFixtures: any\[\] = filterPublicFixtures\(todayData/);
    expect(src.match(/\.limit\(25\);/g)?.length).toBe(2);
  });

  it('the league page title count only counts public teams', () => {
    const src = read('src/app/directory/leagues/[id]/page.tsx');
    expect(src).toMatch(/\.eq\('is_active', true\)\s*\/\/[^\n]*\n\s*\.eq\('visibility', 'public'\);\s*\n\s*if \(typeof count === 'number'\) teamCount = count;/);
  });

  it('the game page 404s unless the viewer may see the game, for the page and its metadata', () => {
    const src = read('src/app/directory/games/[id]/page.tsx');
    expect(src).toContain('canViewFixture(game, members)');
    expect(src.match(/await fetchViewableGame\(id\)/g)?.length).toBe(2);
    // The raw fetch is only called from inside fetchViewableGame.
    expect(src.match(/await fetchGame\(id\)/g)?.length).toBe(1);
    expect(src).toMatch(/fixtures_home_team_id_fkey\(id, name, slug, visibility,/);
    expect(src).toMatch(/fixtures_away_team_id_fkey\(id, name, slug, visibility,/);
    expect(src).toContain("const FIXTURE_CACHE_VERSION = 'v4';");
  });

  it('the game page checks membership with an active (left_at is null) team_members row', () => {
    const src = read('src/app/directory/games/[id]/page.tsx');
    expect(src).toMatch(/\.from\('team_members'\)[\s\S]{0,200}\.is\('left_at', null\)/);
  });

  it('the game API and the box score API return 404 for a non-public game', () => {
    const game = read('src/app/api/game/[id]/route.ts');
    expect(game).toMatch(/if \(!f \|\| !isPublicFixture\(f as any\)\) \{[\s\S]{0,160}status: 404/);
    expect(game).toMatch(/fixtures_home_team_id_fkey\(id, name, slug, visibility,/);
    const box = read('src/app/api/game/[id]/boxscore/route.ts');
    expect(box).toMatch(/if \(fx && !isPublicFixture\(fx as any\)\) \{[\s\S]{0,200}status: 404/);
    expect(box).toMatch(/fixtures_home_team_id_fkey\(name, visibility\)/);
  });

  it('the game share image shows no team names for a non-public game', () => {
    const src = read('src/app/directory/games/[id]/opengraph-image.tsx');
    expect(src).toContain('if (game && isPublicFixture(game as any)) {');
    expect(src).toMatch(/fixtures_home_team_id_fkey\(id, name, slug, visibility,/);
  });
});
