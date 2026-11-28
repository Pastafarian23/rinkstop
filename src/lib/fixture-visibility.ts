/**
 * Visibility rules for fixtures (games).
 *
 * A fixture joins two team_workspaces rows (home and away). Public pages and
 * APIs read fixtures with a privileged client, so the team's visibility has
 * to be checked explicitly: if either team is not public (private, unlisted
 * or an unknown value), the fixture is not served publicly. Otherwise a
 * private team's name and a link to its page leak through game lists, game
 * pages and the game APIs.
 *
 * A fixture side with no joined team row has nothing private to leak, so it
 * is left as it was. The rows stay in the database; this only controls what
 * is served.
 */
export type FixtureTeamRef = { id?: string | null; visibility?: string | null } | null | undefined;
export type FixtureLike = {
  home_team?: FixtureTeamRef | FixtureTeamRef[];
  away_team?: FixtureTeamRef | FixtureTeamRef[];
};

function one(team: FixtureTeamRef | FixtureTeamRef[]): FixtureTeamRef {
  return Array.isArray(team) ? team[0] : team;
}

export function teamRefIsPublic(team: FixtureTeamRef | FixtureTeamRef[]): boolean {
  const t = one(team);
  if (!t) return true;
  return t.visibility === 'public';
}

export function isPublicFixture(f: FixtureLike | null | undefined): boolean {
  if (!f) return false;
  return teamRefIsPublic(f.home_team) && teamRefIsPublic(f.away_team);
}

export function filterPublicFixtures<T extends FixtureLike>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).filter(isPublicFixture);
}

/** Ids of the non-public teams in a fixture (used for member-only access). */
export function nonPublicTeamIds(f: FixtureLike | null | undefined): string[] {
  if (!f) return [];
  const ids: string[] = [];
  for (const side of [f.home_team, f.away_team]) {
    const t = one(side);
    if (t && t.visibility !== 'public' && t.id) ids.push(t.id);
  }
  return ids;
}

/**
 * Access rule for a fixture detail page. Public fixtures are visible to
 * everyone. A fixture with a non-public team is visible only to a viewer who
 * is an active member of every non-public team in it.
 */
export function canViewFixture(
  f: FixtureLike | null | undefined,
  memberTeamIds: ReadonlySet<string> | readonly string[],
): boolean {
  if (!f) return false;
  if (isPublicFixture(f)) return true;
  const member = new Set(memberTeamIds);
  const hidden = nonPublicTeamIds(f);
  if (hidden.length === 0) return false; // non-public but no id to check: fail closed
  return hidden.every((id) => member.has(id));
}
