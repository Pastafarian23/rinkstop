import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('player passport: career and stats never reveal a non-public team to other viewers', () => {
  it('the career section selects visibility and masks name and link unless the viewer owns the passport', () => {
    const src = read('src/app/profile/[slug]/passport/HockeyCareerSection.tsx');
    expect(src).toContain('team:team_workspaces(slug, name, visibility)');
    expect(src).toContain("if (!isOwner && t && t.visibility !== 'public')");
    expect(src).toContain("team: null, team_name_snapshot: 'Private team'");
    // the unmasked selection is no longer used
    expect(src).not.toContain('team:team_workspaces(slug, name)\n');
  });
  it('the stats section masks the stored team name for non-owners', () => {
    const src = read('src/app/profile/[slug]/passport/HockeyStatsSection.tsx');
    expect(src).toContain('team:team_workspaces(visibility)');
    expect(src).toContain("if (!isOwner && t && t.visibility !== 'public') return { ...r, team: null, team_name_snapshot: 'Private team' };");
  });
  it('the public player stats API masks a non-public team name', () => {
    const src = read('src/app/api/players/[id]/stats/route.ts');
    expect(src).toContain('hockey_player_team_history!left(id, team_name, team_logo_url, team:team_workspaces(visibility))');
    expect(src).toContain("t && t.visibility !== 'public' ? 'Private team' : h?.team_name || null");
  });
});

describe('internal and admin-only routes stay gated', () => {
  it('corrections review requires an admin', () => {
    expect(read('src/app/api/corrections/[id]/review/route.ts')).toContain("getAdminFromRequest(request, 'corrections_review')");
  });
  it('highlightly roster sync requires internal auth', () => {
    expect(read('src/app/api/highlightly/players/roster-sync/route.ts')).toContain('requireInternalAuth(request)');
  });
});
