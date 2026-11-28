import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('PWHL landing copy uses the official franchise count', () => {
  const PAGE = read('src/app/directory/pwhl/page.tsx');
  it('defines one constant of 12 with its source', () => {
    expect(PAGE).toMatch(/const PWHL_FRANCHISE_COUNT = 12;/);
    expect(PAGE).toMatch(/thepwhl\.com/);
  });
  it('title, description and JSON-LD use the constant, not database rows', () => {
    expect(PAGE).toContain('const n = PWHL_FRANCHISE_COUNT;');
    expect(PAGE).not.toMatch(/const n = teams\.length/);
    expect(PAGE).not.toMatch(/\$\{teams\.length\}/);
  });
  it('2026-27 season copy says 12 teams, not 9', () => {
    expect(PAGE).toContain('each of the 12 teams in 2026-27');
    expect(PAGE).not.toContain('each of the 9 teams in 2026-27');
  });
});

describe('directory landing card shows 12 PWHL teams', () => {
  const LANDING = read('src/app/directory/DirectoryLandingClient.tsx');
  it('the PWHL card count and description agree', () => {
    expect(LANDING).toContain("count: '12'");
    expect(LANDING).toContain('12 teams across North America');
    expect(LANDING).not.toContain("count: '6'");
  });
});
