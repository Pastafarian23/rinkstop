import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('wiring: /api/entities/team/[id] only resolves public teams', () => {
  const src = readFileSync(join(process.cwd(), 'src/app/api/entities/[type]/[id]/route.ts'), 'utf8');

  it("the team lookup filters visibility = 'public'", () => {
    expect(src).toMatch(/from\('team_workspaces'\)\.select\('id, name, slug'\)\.eq\('id', id\)\.eq\('visibility', 'public'\)\.maybeSingle\(\)/);
  });

  it('the other entity lookups are unchanged', () => {
    expect(src).toMatch(/from\('players'\)\.select\('id, first_name, last_name, slug'\)/);
    expect(src).toMatch(/from\('leagues'\)\.select\('id, name, slug'\)/);
  });
});
