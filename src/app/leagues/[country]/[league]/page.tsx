import { permanentRedirect } from 'next/navigation';

interface Props {
  params: Promise<{ country: string; league: string }>;
}

/**
 * Legacy /leagues/[country]/[league] route — RETIRED.
 *
 * Each league has its own canonical URL in the new directory:
 *   /leagues/us/nhl     → /directory/nhl
 *   /leagues/ca/ahl     → /directory/ahl
 *   /leagues/se/shl     → /directory/shl
 *   etc.
 *
 * The new directory uses a single-segment slug ("/directory/nhl") not
 * the country-prefixed path the old route used. 308-redirect to the
 * new URL so all link equity flows to the canonical page.
 */
export default async function LeagueCountryPage({ params }: Props) {
  const { league } = await params;
  permanentRedirect(`/directory/${league}`);
}
