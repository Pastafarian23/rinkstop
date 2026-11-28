import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canViewTeamPage } from '@/lib/team-visibility-access';

describe('canViewTeamPage: who may see a team detail page', () => {
  it('public teams are visible to anonymous visitors', () => {
    expect(canViewTeamPage('public', false)).toBe(true);
  });
  it('private teams are hidden from anonymous visitors (404)', () => {
    expect(canViewTeamPage('private', false)).toBe(false);
  });
  it('unlisted teams are hidden from anonymous visitors (404)', () => {
    expect(canViewTeamPage('unlisted', false)).toBe(false);
  });
  it('an unknown or empty visibility value is hidden from anonymous visitors', () => {
    expect(canViewTeamPage(null, false)).toBe(false);
    expect(canViewTeamPage('', false)).toBe(false);
  });
  it('an active member keeps access to a private team', () => {
    expect(canViewTeamPage('private', true)).toBe(true);
  });
  it('an active member keeps access to an unlisted team', () => {
    expect(canViewTeamPage('unlisted', true)).toBe(true);
  });
});

describe('wiring: the detail page gates non-public teams before rendering', () => {
  const PAGE = readFileSync(join(process.cwd(), 'src/app/directory/teams/[slug]/page.tsx'), 'utf8');

  it('the page calls canViewTeamPage and 404s when it returns false', () => {
    expect(PAGE).toMatch(/if \(!canViewTeamPage\(team\.visibility, await viewerIsActiveTeamMember\(team\.id\)\)\) \{\s*notFound\(\);/);
  });

  it('the gate runs before any team profile data is rendered', () => {
    const gate = PAGE.indexOf('canViewTeamPage(team.visibility');
    const render = PAGE.indexOf('<PublicTeamProfile');
    expect(gate).toBeGreaterThan(0);
    expect(render).toBeGreaterThan(gate);
  });

  it('membership is checked on active rows only (left_at is null)', () => {
    expect(PAGE).toMatch(/viewerIsActiveTeamMember[\s\S]{0,400}\.is\('left_at', null\)/);
  });

  it('metadata returns the generic not-found response for non-public teams', () => {
    expect(PAGE).toMatch(/if \(!team \|\| \(team as \{ visibility\?: string \}\)\.visibility !== 'public'\) \{/);
  });
});
