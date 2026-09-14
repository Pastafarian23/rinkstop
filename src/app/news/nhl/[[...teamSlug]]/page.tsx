// /news/nhl/[[...teamSlug]]
//
// WS27 PR4 — fix 404 on /news/nhl/{team} URLs (e.g. /news/nhl/boston-bruins).
// These URLs return 404 because the [subpillar] segment requires either a known
// subpillar slug or a post slug. Team profile URLs like /news/nhl/boston-bruins
// are invalid — the correct URL is /directory/teams/boston-bruins.
//
// This handler resolves the teamSlug to team_workspaces. If found → redirect to
// /directory/teams/{slug}. If not found → notFound().
//
// WS27 PR7 — refactored to use shared /lib/news-team-redirect logic so we can
// ship the same redirect for other league pillars without copy-pasting the
// Supabase lookup.
import { notFound, redirect } from 'next/navigation';
import { resolveTeamRedirect } from '@/lib/news-team-redirect';

export default async function NhlTeamRedirect({
  params,
}: {
  params: Promise<{ teamSlug?: string[] }>;
}) {
  const { teamSlug } = await params;
  const action = await resolveTeamRedirect(teamSlug);
  if (action.kind === 'redirect') {
    redirect(action.target);
  }
  notFound();
}
