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

  // If we have multiple segments (e.g. /news/nhl/draft/{slug}), try the
  // LAST segment as a news article slug first. This catches deep links
  // like /news/nhl/draft/article-slug that the catch-all [[...teamSlug]]
  // would otherwise 404.
  if (segments.length >= 2) {
    const lastSlug = segments[segments.length - 1];
    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('slug')
      .eq('slug', lastSlug)
      .eq('status', 'published')
      .maybeSingle();
    if (post?.slug) {
      return { kind: 'redirect', target: `/news/${post.slug}` };
    }
  }

  const { data } = await supabaseAdmin
    .from('team_workspaces')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();

  if (data?.slug) {
    return { kind: 'redirect', target: `/directory/teams/${data.slug}` };
  }
  // 2026-09-21 GSC fix: if no team matched, check if the slug is actually a
  // news article. /news/{league}/{article-slug} URLs were 404'ing and
  // showing up in GSC as 'Blocked due to other 4xx issue'. Redirect to
  // the canonical 3-segment /news/{article-slug} form instead.
  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('slug')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (post?.slug) {
    return { kind: 'redirect', target: `/news/${post.slug}` };
  }
  return { kind: 'notFound' };
}
