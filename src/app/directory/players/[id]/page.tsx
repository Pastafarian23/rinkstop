import type { Metadata } from 'next';
import PlayerDetail from './PlayerDetailClient';
import ClaimThisListingMount from '@/components/ClaimThisListingMount';
import { getEntityOwner, getFollowersCount } from '@/lib/ownership';
import { supabaseAdmin } from '@/lib/supabase';

interface Props {
  params: Promise<{ id: string }>;
}

const POSITION_FULL: Record<string, string> = {
  center: 'Center', left_wing: 'Left Wing', right_wing: 'Right Wing',
  defenseman: 'Defenseman', defense: 'Defenseman', goalie: 'Goalie',
  goaltender: 'Goalie', forward: 'Forward',
};

const COUNTRY_NAMES: Record<string, string> = {
  CAN: 'Canada', USA: 'United States', US: 'United States',
  RUS: 'Russia', SWE: 'Sweden', FIN: 'Finland', CZE: 'Czechia',
  SVK: 'Slovakia', DEU: 'Germany', GER: 'Germany', CHE: 'Switzerland',
  NOR: 'Norway', DNK: 'Denmark', FRA: 'France', AUT: 'Austria',
  GBR: 'United Kingdom', LAT: 'Latvia', BLR: 'Belarus', SVN: 'Slovenia',
  ITA: 'Italy', NLD: 'Netherlands', AUS: 'Australia', JPN: 'Japan',
  KOR: 'South Korea', CHN: 'China', KAZ: 'Kazakhstan', UKR: 'Ukraine',
  POL: 'Poland', HUN: 'Hungary', EST: 'Estonia', LTU: 'Lithuania',
};

// Defensive BASE_URL: in Vercel production, NEXT_PUBLIC_SITE_URL is the real
// https://rinkstop.com. In local dev, .env has http://localhost:3456 which
// would fail server-to-server fetches during tests. Substitute the public
// URL when the env points to localhost so JSON-LD generation works in both.
const _RAW = process.env.NEXT_PUBLIC_SITE_URL || '';
const BASE_URL = _RAW.includes('localhost') || _RAW.includes('127.0.0.1')
  ? 'https://rinkstop.com'
  : (_RAW || 'https://rinkstop.com');

function buildPlayerDescription(player: any): string {
  const fullName = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim();
  const teamName = player.teams?.name || player.current_team_name || 'their current team';
  const leagueName = player.teams?.leagues?.name || '';
  const position = POSITION_FULL[player.position] || player.position || 'Hockey Player';
  const facts: string[] = [];
  if (player.jersey_number != null) facts.push(`#${player.jersey_number}`);
  if (player.height_cm) facts.push(`${player.height_cm} cm tall`);
  if (player.weight_kg) facts.push(`${player.weight_kg} kg`);
  if (player.shoots) facts.push(`shoots ${player.shoots === 'L' ? 'left' : 'right'}`);
  if (player.birth_place) facts.push(`from ${player.birth_place}`);
  if (player.nationality && player.nationality.length <= 3) {
    facts.push(COUNTRY_NAMES[player.nationality] || player.nationality);
  } else if (player.nationality) {
    facts.push(player.nationality);
  }
  const factsStr = facts.length > 0 ? ` (${facts.join(', ')})` : '';
  const leagueStr = leagueName ? ` in the ${leagueName}` : '';
  return `${fullName}${factsStr} is a ${position} who plays for the ${teamName}${leagueStr}. View full profile, career stats, and highlights on RinkStop.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(
      `${BASE_URL}/api/players?id=${id}`,
      { cache: 'no-store' }
    );
    const json = await res.json();
    const player = json?.data?.[0];

    if (!player) {
      return { title: 'Player Not Found' };
    }

    const fullName = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || 'Player';
    const teamName = player.teams?.name || player.current_team_name || 'Hockey Player';
    const leagueName = player.teams?.leagues?.name || '';
    const description = buildPlayerDescription(player);
    const title = `${fullName} - ${POSITION_FULL[player.position] || 'Hockey'} | ${teamName}${leagueName ? ` (${leagueName})` : ''} | RinkStop`;

    return {
      title,
      description,
      openGraph: {
        title: `${fullName}`,
        description,
        type: 'profile',
        firstName: player.first_name,
        lastName: player.last_name,
        ...(player.headshot_url
          ? { images: [{ url: player.headshot_url, width: 200, height: 200, alt: fullName }] }
          : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: `${fullName}`,
        description,
        ...(player.headshot_url ? { images: [player.headshot_url] } : {}),
      },
      alternates: {
        canonical: `https://rinkstop.com/directory/players/${id}`,
      },
    };
  } catch (err) {
    console.error('Player metadata error:', err);
    return { title: 'Player' };
  }
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;

  // Parallelize the 3 server-side lookups: owner, follower count, and the
  // player record for JSON-LD. All three queries are independent, so a
  // single Promise.all makes TTFB = max(query time) instead of sum. Saves
  // ~400ms per page load vs. running them sequentially.
  const [owner, initialFollowersCount, playerRow] = await Promise.all([
    getEntityOwner('player', id),
    getFollowersCount('player', id),
    supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, position, headshot_url, nationality, height_cm, weight_kg, teams(name, leagues(name))')
      .eq('id', id)
      .maybeSingle(),
  ]);

  // Server-side JSON-LD: Person (athlete) + BreadcrumbList.
  // Query the player record directly via supabaseAdmin (no self-loop HTTP
  // hop). The client component re-fetches its own data for the actual UI;
  // this is a duplicate read, not a coupled one — but it goes straight to
  // the DB now, not through the public /api/players endpoint, which
  // saves one full round trip per page load.
  const player = playerRow.data;
  let playerJsonLd: object | null = null;
  if (player) {
    const fullName = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim();
    const teamName = (player.teams as any)?.name;
    const leagueName = (player.teams as any)?.leagues?.name;
    const position = POSITION_FULL[player.position] || player.position || 'Hockey Player';

    playerJsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Person',
          name: fullName,
          jobTitle: `Professional Ice Hockey Player — ${position}`,
          sport: 'Ice hockey',
          url: `${BASE_URL}/directory/players/${id}`,
          ...(player.headshot_url ? { image: player.headshot_url } : {}),
          ...(teamName
            ? { affiliation: { '@type': 'SportsTeam', name: teamName, ...(leagueName ? { memberOf: { '@type': 'SportsOrganization', name: leagueName } } : {}) } }
            : {}),
          ...(player.nationality && player.nationality.length <= 3
            ? { nationality: COUNTRY_NAMES[player.nationality] || player.nationality }
            : {}),
          ...(player.height_cm ? { height: { '@type': 'QuantitativeValue', value: player.height_cm, unitCode: 'CMT' } } : {}),
          ...(player.weight_kg ? { weight: { '@type': 'QuantitativeValue', value: player.weight_kg, unitCode: 'KGM' } } : {}),
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
            { '@type': 'ListItem', position: 2, name: 'Players', item: `${BASE_URL}/directory/players` },
            { '@type': 'ListItem', position: 3, name: fullName, item: `${BASE_URL}/directory/players/${id}` },
          ],
        },
      ],
    };
  }

  return (
    <>
      {playerJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(playerJsonLd) }}
        />
      )}
      {/* Claim this listing — only renders on unclaimed players. Renders above
          the main client component so the CTA is the first thing an unverified
          visitor sees when they land on the page. */}
      <ClaimThisListingMount entityType="player" entityId={id} />
      <PlayerDetail id={id} ownerUserId={owner?.userId ?? null} initialFollowersCount={initialFollowersCount} />
    </>
  );
}
