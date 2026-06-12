import { permanentRedirect } from 'next/navigation';

/**
 * Legacy /hockey route — RETIRED.
 *
 * The /directory hub is now the canonical home for browsing hockey
 * leagues/teams by country. This page was rendering its own country
 * grid (a duplicate of /directory) AND the page was erroring with
 * HTTP 500 because the self-call to /api/hockey/countries fails in
 * the Vercel Edge runtime. Permanent redirect to /directory instead.
 */
export default function HockeyPage() {
  permanentRedirect('/directory');
}
