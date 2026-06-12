import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ country: string; city: string; rink: string }>;
}

function formatName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Legacy /rinks/[country]/[city]/[rink] route — RETIRED.
 *
 * The /directory/rinks/{slug} route is now the canonical home for rink
 * data. This route used to render its own page (with home_teams, games,
 * nearby rinks), but the content is fully covered by the new
 * /directory/rinks/[slug] route — and exposing both at the same data
 * caused Google Search Console to flag "Duplicate without user-selected
 * canonical" for the rink page.
 *
 * We 308-redirect to the canonical URL.
 */
export default async function RinkDetailPage({ params }: Props) {
  const { rink } = await params;
  permanentRedirect(`/directory/rinks/${rink}`);
}

// Minimal metadata — the redirect fires before any rendering, but
// generateMetadata still runs for crawlers that hit the URL before
// following the 308. We don't want the legacy route to appear in
// search results.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rink } = await params;
  const rinkName = formatName(rink);
  return {
    title: `${rinkName} | RinkStop`,
    robots: { index: false, follow: true },
  };
}
