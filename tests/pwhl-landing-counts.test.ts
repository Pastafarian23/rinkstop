import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const PAGE = read('src/app/directory/pwhl/page.tsx');
const CLIENT = read('src/app/directory/pwhl/PWHLClient.tsx');
const LANDING = read('src/app/directory/DirectoryLandingClient.tsx');

describe('PWHL landing: official franchise count', () => {
  it('one constant of 12 with its source, used for title, description and JSON-LD', () => {
    expect(PAGE).toMatch(/const PWHL_FRANCHISE_COUNT = 12;/);
    expect(PAGE).toMatch(/thepwhl\.com/);
    expect(PAGE).toContain('const n = PWHL_FRANCHISE_COUNT;');
    expect(PAGE).not.toMatch(/const n = teams\.length/);
    expect(PAGE).not.toMatch(/\$\{teams\.length\}/);
  });
  it('the hero, the stats strip and the directory card all say 12', () => {
    expect(CLIENT).toContain('12 teams across the United States and Canada');
    expect(CLIENT).toContain("{ label: 'Teams', value: '12' }");
    expect(CLIENT).not.toContain("value: '6'");
    expect(LANDING).toContain("count: '12'");
    expect(LANDING).not.toContain("count: '6'");
  });
});

describe('PWHL landing: stale or unsupported claims are gone', () => {
  const all = PAGE + CLIENT;
  for (const bad of [
    'Philadelphia',
    'Hilary Knight',
    '23 players',
    '3-game series',
    '9 teams',
    'Editor-in-Chief',
    'bring the league to 9',
    'Boston Fleet win the Walter Cup',
    'defeating the New York Sirens',
    'coming soon',
    'late November to early May',
  ]) {
    it('does not contain: ' + bad, () => {
      expect(all).not.toContain(bad);
    });
  }
});

describe('PWHL landing: official 2026-27 structure is stated', () => {
  for (const needle of [
    '180 games',
    'December 5, 2026 to April 18, 2027',
    '30 games: 18 within its conference and 12 against the other conference',
    'top four in each conference',
    'best-of-five Walter Cup Finals',
    '24 active roster spots',
    'Detroit Clutch',
    'Hamilton Havoc',
    'San Jose Sea Lions',
    'Vegas Vanguards',
    'won it in 2024 and 2025',
  ]) {
    it('states: ' + needle, () => {
      expect(PAGE).toContain(needle);
    });
  }
  it('keeps the byline title rule', () => {
    expect(PAGE).toContain('By Arnel Larracas, Founder, RinkStop.');
  });
});
