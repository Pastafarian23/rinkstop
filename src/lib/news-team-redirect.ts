// /lib/news-team-redirect.ts
//
// Shared logic for /news/{league}/{team-slug} → /directory/teams/{slug}
// redirects. Used by per-league routes in src/app/news/{nhl,ahl,...}/.
//
// Each per-league route file is a thin shell that calls resolveAndRedirect
// from this module. The shared logic is identical across leagues — the
// team_workspaces table is league-agnostic.
//
// Returns: 'redirect' (caller should redirect()), 'notFound' (caller should
// notFound()), or 'pillar' (no teamSlug segments — let the pillar page
// handle it; caller should notFound()).

import { notFound, redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export type RedirectAction = { kind: 'redirect'; target: string } | { kind: 'notFound' };

export async function resolveTeamRedirect(
  teamSlug: string[] | undefined,
): Promise<RedirectAction> {
  const segments = Array.isArray(teamSlug) ? teamSlug : [];
  if (segments.length === 0) {
    // /news/{league} with no teamSlug segments — fall through to pillar.
    return { kind: 'notFound' };
  }
  const slug = segments[0];
  if (!slug) return { kind: 'notFound' };

  const { data } = await supabaseAdmin
    .from('team_workspaces')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();

  if (data?.slug) {
    return { kind: 'redirect', target: `/directory/teams/${data.slug}` };
  }
  return { kind: 'notFound' };
}
