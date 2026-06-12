import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ country: string; league: string; team: string }>;
}

function formatName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Legacy /teams/[country]/[league]/[team] route — RETIRED.
 *
 * The /directory/teams/{slug} route is now the canonical home for team
 * data. This route used to render its own page (with home_rink, games,
 * same-league teams), but the content is fully covered by the new
 * /directory/teams/[slug] route — and exposing both at the same data
 * caused Google Search Console to flag "Duplicate without user-selected
 * canonical" for the team page.
 *
 * We 308-redirect to the canonical URL. 308 (vs 301) preserves the
 * request method and is the Next.js recommendation for permanent
 * server-side redirects. All link equity flows to /directory/teams/{slug}.
 */
export default async function TeamPage({ params }: Props) {
  const { team } = await params;
  permanentRedirect(`/directory/teams/${team}`);
}

// Minimal metadata — the redirect fires before any rendering, but
// generateMetadata still runs for crawlers that hit the URL before
// following the 308. We don't want the legacy route to appear in
// search results.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { team } = await params;
  const teamName = formatName(team);
  return {
    title: `${teamName} | RinkStop`,
    robots: { index: false, follow: true },
  };
}

