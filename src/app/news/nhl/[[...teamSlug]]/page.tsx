// WS27 PR4 — fix 404 on /news/nhl/{team} URLs (e.g. /news/nhl/boston-bruins).
// These URLs return 404 because the [subpillar] segment requires either a known
// subpillar slug (draft, analysis, pwhl, etc.) or a post slug. Team profile
// URLs like /news/nhl/boston-bruins are invalid — the correct URL is
// /directory/teams/boston-bruins.
//
// This handler resolves the teamSlug to team_workspaces. If found → redirect to
// /directory/teams/{slug}. If not found → notFound().
import { notFound, redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export default async function NhlTeamRedirect({
  params,
}: {
  params: Promise<{ teamSlug?: string[] }>;
}) {
  const { teamSlug } = await params;
  // [[...teamSlug]] matches 0 or more segments.
  // /news/nhl         → teamSlug = [] / undefined
  // /news/nhl/boston-bruins → teamSlug = ['boston-bruins']
  // /news/nhl/boston-bruins/stats → teamSlug = ['boston-bruins', 'stats']
  const segments = Array.isArray(teamSlug) ? teamSlug : [];
  if (segments.length === 0) {
    // /news/nhl with no extra path — let the pillar page handle it.
    notFound();
    return;
  }
  // Use the first segment as the team slug; ignore any trailing segments.
  const slug = segments[0];
  if (!slug) {
    notFound();
    return;
  }

  const { data } = await supabaseAdmin
    .from('team_workspaces')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();

  if (data?.slug) {
    redirect(`/directory/teams/${data.slug}`);
  }

  // Unknown slug — not a team we track.
  notFound();
}
