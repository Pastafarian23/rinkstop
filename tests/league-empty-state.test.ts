import { describe, it, expect } from 'vitest';
import { teamsSummary, NO_TEAMS_LABEL, claimLeagueHref } from '@/lib/league-empty-state';
import { buildLeagueFAQs } from '@/lib/league-context';

const base = { name: 'Tatra Cup Europe', country: 'Europe', level: 'amateur', websiteUrl: null, description: null } as never;

function teamAnswer(teamCount: number | undefined): string {
  const faqs = buildLeagueFAQs({ ...base, teamCount } as never);
  return faqs.find((f) => /How many teams/.test(f.question))!.answer;
}

describe('summary wording', () => {
  it('zero and missing counts show "Teams not yet listed", never "0 teams"', () => {
    expect(teamsSummary(0)).toBe(NO_TEAMS_LABEL);
    expect(teamsSummary(-1)).toBe(NO_TEAMS_LABEL);
    expect(teamsSummary(NaN)).toBe(NO_TEAMS_LABEL);
    expect(teamsSummary(0)).not.toMatch(/\b0 teams?\b/);
  });
  it('real counts are unchanged', () => {
    expect(teamsSummary(1)).toBe('1 team');
    expect(teamsSummary(8)).toBe('8 teams');
  });
});

describe('claim invitation', () => {
  it('uses the existing league claim route and encodes the name', () => {
    expect(claimLeagueHref('WCH IIIA')).toBe('/add-listing?type=league&name=WCH%20IIIA');
  });
});

describe('FAQ "how many teams" answer', () => {
  it('zero teams: no "0 teams tracked", says not yet listed, invites a claim', () => {
    const a = teamAnswer(0);
    expect(a).not.toMatch(/0 teams/);
    expect(a).toContain('Teams are not yet listed');
    expect(a).toContain('/add-listing?type=league&name=Tatra%20Cup%20Europe');
  });
  it('missing team count keeps the existing verification message', () => {
    expect(teamAnswer(undefined)).toMatch(/being verified/);
  });
  it('a real count keeps the existing wording', () => {
    expect(teamAnswer(5)).toBe('We currently track 5 teams in Tatra Cup Europe. Browse the full team list on this page and follow individual teams for updates.');
  });
});

describe('LeagueRelated empty state (the component that renders the zero-team text)', () => {
  const { readFileSync } = require('node:fs') as typeof import('node:fs');
  const { join } = require('node:path') as typeof import('node:path');
  const src = readFileSync(join(process.cwd(), 'src/components/LeagueRelated.tsx'), 'utf8');
  it('shows exactly "Teams not yet listed." and no old wording', () => {
    expect(src).toContain('Teams not yet listed.');
    expect(src).not.toContain('No teams registered');
  });
  it('keeps the claim invitation using the existing claim route helper', () => {
    expect(src).toContain('claimLeagueHref(leagueName)');
    expect(src).toContain('Claim this league');
  });
  it('still renders the team list when teams exist', () => {
    expect(src).toContain('RelatedContent');
    expect(src).toContain('`Teams in ${leagueName}`');
  });
});
