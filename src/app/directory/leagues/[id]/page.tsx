import type { Metadata } from 'next';
import LeagueDetailClient from './LeagueDetailClient';
import ClaimThisListingMount from '@/components/ClaimThisListingMount';
import { getFollowersCount } from '@/lib/ownership';
import { supabaseAdmin } from '@/lib/supabase';

const RAW_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
const BASE_URL = RAW_BASE_URL.includes('localhost') || RAW_BASE_URL.includes('127.0.0.1')
  ? 'https://rinkstop.com'
  : (RAW_BASE_URL || 'https://rinkstop.com');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${BASE_URL}/api/leagues`, { cache: 'no-store' });
    const leagues = await res.json();
    const league = leagues.find((l: any) => l.id === id || l.slug === id);
    if (league) {
      return {
        title: `${league.name}`,
        description: `${league.name} — ${league.country}. ${(league.level || '').replace(/_/g, ' ')} hockey league on RinkStop.`,
        openGraph: {
          title: `${league.name}`,
          images: league.logo_url
            ? [{ url: league.logo_url, width: 400, height: 400 }]
            : [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
        },
        alternates: { canonical: `${BASE_URL}/directory/leagues/${league.slug || league.id}` },
      };
    }
  } catch {
    /* ignore */
  }
  return { title: 'League' };
}

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Parallelize the follower count + league record lookup. The previous
  // code did the follower count first, then a wasteful fetch(/api/leagues)
  // that returned ALL 240 leagues just to find one by id. Now: one direct
  // supabaseAdmin query for the league (cheap indexed read) parallelized
  // with the follower count.
  const [initialFollowersCount, leagueRow] = await Promise.all([
    getFollowersCount('league', id),
    supabaseAdmin
      .from('leagues')
      .select('id, name, slug, alternateName, website_url, logo_url, country')
      .or(`id.eq.${id},slug.eq.${id}`)
      .maybeSingle(),
  ]);
  const league = leagueRow.data;

  // Server-side JSON-LD: SportsOrganization + BreadcrumbList. Built from
  // the same record we just fetched — no extra query.
  let leagueJsonLd: object | null = null;
  if (league) {
    leagueJsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SportsOrganization',
          name: league.name,
          sport: 'Ice hockey',
          url: `${BASE_URL}/directory/leagues/${league.slug || league.id}`,
          ...(league.alternateName ? { alternateName: league.alternateName } : {}),
          ...(league.website_url ? { sameAs: [league.website_url] } : {}),
          ...(league.logo_url ? { logo: league.logo_url } : {}),
          ...(league.country ? { address: { '@type': 'PostalAddress', addressCountry: league.country } } : {}),
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
            { '@type': 'ListItem', position: 2, name: 'Leagues', item: `${BASE_URL}/directory/leagues` },
            { '@type': 'ListItem', position: 3, name: league.name, item: `${BASE_URL}/directory/leagues/${league.slug || league.id}` },
          ],
        },
      ],
    };
  }

  return (
    <>
      {leagueJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(leagueJsonLd) }}
        />
      )}
      {/* Claim this listing — only renders on unclaimed leagues. Renders above
          the main client component. Note: leagues aren't a first-class claim
          type in the DB yet, so the CTA is a best-effort gate. */}
      <ClaimThisListingMount entityType="league" entityId={id} />
      <LeagueDetailClient id={id} initialFollowersCount={initialFollowersCount} />
    </>
  );
}
