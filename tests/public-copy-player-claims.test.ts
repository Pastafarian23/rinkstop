// Copy-consistency guard (2026-11-27): public copy must not promise a player-count cap that the
// code does not enforce. Player capacity constants exist but are not enforced anywhere.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const UNSUPPORTED = /(up to|under|≤|first|for)\s*(30|150) players|30-150|up to 150 players|Free for the first 30 players/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

describe('public copy makes no unenforced player-count promise', () => {
  // Scans every source file, including pricing feature lists and API messages. Only comments are exempt.
  const files = walk(join(process.cwd(), 'src'));
  for (const f of files) {
    it(`${f.split('/src/')[1]} has no unsupported player cap`, () => {
      const src = readFileSync(f, 'utf8');
      // Editorial rosters ("typically 25-30 players per team") are factual league descriptions, not our promise.
      const hits = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && UNSUPPORTED.test(l) && !/typically 25-30 players/.test(l));
      expect(hits).toEqual([]);
    });
  }
});

describe('Organization Plus offer benefits stay verified', () => {
  const src = readFileSync(join(process.cwd(), 'src/lib/org-plus-offer.ts'), 'utf8');
  it('no player cap, and the verified team limit is kept', () => {
    expect(src).not.toMatch(/players/i);
    expect(src).toContain('Up to 3 team workspaces');
  });
});


