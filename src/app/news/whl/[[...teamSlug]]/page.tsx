// /news/whl/[[...teamSlug]]
//
// WS27 PR7 — extend news-pillar team redirect from NHL to all major leagues.
// Resolves /news/whl/{team-slug} → /directory/teams/{slug}. See
// /lib/news-team-redirect for the shared logic.
import { notFound, redirect } from 'next/navigation';
import { resolveTeamRedirect } from '@/lib/news-team-redirect';

export default async function WhlTeamRedirect({
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
