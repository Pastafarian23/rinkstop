import { redirect } from 'next/navigation';

/**
 * /directory/standings → /standings
 *
 * 2026-10-01 fix (Arnel feedback): the menu/footer link to
 * /directory/standings was hitting the catch-all [country] route,
 * which rendered the "Hockey in Standings" country page (placeholder
 * country that doesn't exist). Standings is a SITE FEATURE, not a
 * directory of countries, leagues, or cities. The actual implementation
 * lives at /standings (the league-picker index) and
 * /standings/nhl/[season] (the NHL table) and is fully built.
 *
 * This page is a 1-line redirect that lets the canonical menu URLs
 * (which the user sees in the footer + dropdown + nav quick links)
 * resolve to the right page without changing every link source.
 *
 * SEO: Next.js redirect emits a 307 by default, which preserves
 * PageRank correctly.
 */
export default function DirectoryStandingsRedirect() {
  redirect('/standings');
}

export const dynamic = 'force-static';
export const revalidate = 3600;