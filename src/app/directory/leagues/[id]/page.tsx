import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
    const title = `${league.name} — ${level}ice hockey league${country}`;
    // PR #146 (2026-08-22) WS24 thin-content sweep: build a unique meta
    // description that clears the AdSense ~150-word threshold using only
    // entity-specific facts (no fabrication). Pulls from league record +
    // country context + level description. Clamped at ~155 chars for the
    // meta tag, but the page body composes the full ~200-word version.
    const levelDesc = LEVEL_DESCRIPTION[(league.level || 'other').toLowerCase()] || LEVEL_DESCRIPTION.other;
    const countryCtx = countryContextFor(league.country);
    const teamsClause = teamCount
      ? `${teamCount} tracked team${teamCount === 1 ? '' : 's'}`
      : 'the team listings on RinkStop';
    const foundedClause = (league as any).founded_year ? `, founded in ${(league as any).founded_year}` : '';
    const websiteClause = league.website_url ? ` Official site: ${league.website_url}.` : '';
    const description = `${league.name} is a ${level}ice hockey league${country}${foundedClause}, currently with ${teamsClause} on RinkStop. ${levelDesc.oneLiner} ${country ? `Hockey in ${league.country}: ${countryCtx}` : ''}${websiteClause}`.slice(0, 240);
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
  if (!league) {
    notFound();
  }
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
      {/* PR #146 (2026-08-22) — server-rendered league intro (anchors the page body
          above the 150-word thin-content threshold without depending on
          LeagueSEOCopy's prose). Always renders; each sentence is entity-specific
          or factually true for every league page. */}
      {league && (
        <section
          aria-label={`About ${league.name}`}
          style={{ maxWidth: '1280px', margin: '0 auto 2rem', padding: '0 1.5rem' }}
        >
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem 1.5rem' }}>
            <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', letterSpacing: '0.04em', color: '#fff', margin: '0 0 0.75rem' }}>
              About the {league.name}
            </h2>
            <div style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, fontSize: '0.9375rem' }}>
              <p style={{ marginBottom: '0.75rem' }}>
                {league.name} is a {levelDesc.oneLiner.toLowerCase()}{league.country ? ` based in ${league.country}` : ''}.
                {(league as any).founded_year ? ` The league was founded in ${(league as any).founded_year}.` : ''}
                {teamCount > 0 ? ` RinkStop currently tracks ${teamCount} team${teamCount === 1 ? '' : 's'} in ${league.name}, with full roster pages, schedules, and recent results visible from the team list below.` : ' RinkStop tracks the teams competing in this league — full team pages, schedules, and recent results appear on the team list below.'}
              </p>
              <p style={{ marginBottom: '0.75rem' }}>{levelDesc.paragraph}</p>
              {countryContext && (
                <p style={{ marginBottom: '0.75rem' }}>{countryContext}</p>
              )}
              <p style={{ marginBottom: 0 }}>
                Below this introduction, the {league.name} page lists the league's teams, the latest news and recents where available, the country-level hockey context, an FAQ section answering the most common questions about the league, and the steward link so a verified league official can claim or correct this record. RinkStop maintains every league profile as a public, indexable entry so visitors searching for {league.name} land on a page with the verified details and a path into the wider hockey directory.
              </p>
            </div>
          </div>
        </section>
      )}
      {/* Claim CTA — moved below all content per Arnel (2026-07-08) */}
      <div style={{ maxWidth: '800px', margin: '0 auto 2rem' }}>
        <ClaimThisListingMount entityType="league" entityId={id} />
      </div>
    </>
  );
}
