// Team-count wording for league pages (B-3, staging, 2026-11-27).
// Replaces "0 teams tracked" with "Teams not yet listed" when a league has no active teams.
// Real counts (1 or more) are unchanged. Pure: no database or network access.

export const NO_TEAMS_LABEL = 'Teams not yet listed';

// Existing claim route used by the league page's ownership block. Reused, not new.
export function claimLeagueHref(leagueName: string): string {
  return `/add-listing?type=league&name=${encodeURIComponent(leagueName || '')}`;
}

export function teamsSummary(teamCount: number): string {
  if (!Number.isFinite(teamCount) || teamCount <= 0) return NO_TEAMS_LABEL;
  return `${teamCount} team${teamCount === 1 ? '' : 's'}`;
}
