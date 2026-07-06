import type { Metadata } from 'next';
import LeagueDetailClient from './LeagueDetailClient';
import LeagueSEOCopy from './LeagueSEOCopy';
import ClaimThisListingMount from '@/components/ClaimThisListingMount';
import { getFollowersCount } from '@/lib/ownership';
import { buildLeagueFAQs, countryContextFor, LEVEL_DESCRIPTION } from '@/lib/league-context';

const RAW_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
const BASE_URL = RAW_BASE_URL.includes('localhost') || RAW_BASE_URL.includes('127.0.0.1')
  ? 'https://rinkstop.com'
  : (RAW_BASE_URL || 'https://rinkstop.com');

async function getLeague(slugOrId: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/leagues`, { cache: 'no-store' });
    if (!res.ok) return null;
    const leagues = await res.json();
    if (!Array.isArray(leagues)) return null;
    return leagues.find((l: any) => l.id === slugOrId || l.slug === slugOrId) || null;
  } catch {
    return null;
  }
}

async function getLeagueTeams(leagueId: string) {
  try {
    const res = await fetch(`${BASE_URL}/api/teams?leagueId=${leagueId}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const league = await getLeague(id);
  if (league) {
    const country = league.country ? ` in ${league.country}` : '';
    const level = league.level ? `${(league.level as string).replace(/_/g, ' ')} ` : '';
    const teamCount =
      typeof league.team_count === 'number'
        ? league.team_count
        : undefined;
    const title = `${league.name} — ${level}ice hockey league${country} | RinkStop`;
    const description = teamCount
      ? `${league.name} is a ${level}ice hockey league${country}. Browse the ${teamCount} tracked team${teamCount === 1 ? '' : 's'}, latest news, and how the league connects to the wider hockey structure in ${league.country || 'its region'}.`
      : `${league.name} is a ${level}ice hockey league${country}. Discover the league's teams, latest news, and how to follow games on RinkStop.`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: league.logo_url
          ? [{ url: league.logo_url, width: 400, height: 400 }]
          : [{ url: 'https://rinkstop.com/og-image.png', width: 1200, height: 630 }],
      },
      alternates: { canonical: `${BASE_URL}/directory/leagues/${league.slug || league.id}` },
    };
  }
  return { title: 'League' };
}

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const initialFollowersCount = await getFollowersCount('league', id);

  const league = await getLeague(id);
  const teams = league ? await getLeagueTeams(league.id) : [];
  const teamCount = Array.isArray(teams) ? teams.length : 0;
  const levelKey = (league?.level || 'other').toLowerCase();
  const levelDesc = LEVEL_DESCRIPTION[levelKey] || LEVEL_DESCRIPTION.other;

  const faqs = league
    ? buildLeagueFAQs({
        name: league.name,
        country: league.country,
        level: league.level,
        teamCount,
        websiteUrl: league.website_url,
        description: league.description,
        updatedAt: league.updated_at,
      })
    : [];

  const countryContext = league ? countryContextFor(league.country) : '';

  // JSON-LD: SportsOrganization + BreadcrumbList + FAQPage + (optional) Person author
  const leagueJsonLd: object[] = [];
  if (league) {
    leagueJsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'SportsOrganization',
      name: league.name,
      sport: 'Ice hockey',
      url: `${BASE_URL}/directory/leagues/${league.slug || league.id}`,
      ...(league.alternateName ? { alternateName: league.alternateName } : {}),
      ...(league.website_url ? { sameAs: [league.website_url] } : {}),
      ...(league.logo_url ? { logo: league.logo_url } : {}),
      ...(league.country ? { address: { '@type': 'PostalAddress', addressCountry: league.country } } : {}),
      ...(league.description ? { description: league.description } : {}),
    });
    leagueJsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Leagues', item: `${BASE_URL}/directory/leagues` },
        { '@type': 'ListItem', position: 3, name: league.name, item: `${BASE_URL}/directory/leagues/${league.slug || league.id}` },
      ],
    });
    if (faqs.length > 0) {
      leagueJsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer.replace(/<[^>]+>/g, '') },
        })),
      });
    }
  }

  return (
    <>
      {leagueJsonLd.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(leagueJsonLd) }}
        />
      )}
      <ClaimThisListingMount entityType="league" entityId={id} />
      <LeagueDetailClient id={id} initialFollowersCount={initialFollowersCount} />
      {league && (
        <LeagueSEOCopy
          league={league}
          teamCount={teamCount}
          levelDesc={levelDesc}
          countryContext={countryContext}
          faqs={faqs}
        />
      )}
    </>
  );
}
