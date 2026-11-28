/**
 * Access rule for a team detail page.
 *
 * Public teams (visibility = 'public') are visible to everyone. Any other
 * team (private, unlisted, or an unknown value) is visible only to an active
 * member of that team. Anyone else gets a 404, so the team's name, description
 * and profile are not served to anonymous visitors.
 *
 * The rows stay in the database. This only controls who the page is served to.
 */
export function canViewTeamPage(
  visibility: string | null | undefined,
  viewerIsActiveMember: boolean,
): boolean {
  if (visibility === 'public') return true;
  return viewerIsActiveMember;
}
