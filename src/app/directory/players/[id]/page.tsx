import type { Metadata } from 'next';
import PlayerDetail from './PlayerDetailClient';
import PlayerSEOCopy from './PlayerSEOCopy';
import ClaimThisListingMount from '@/components/ClaimThisListingMount';
import { getEntityOwner, getFollowersCount } from '@/lib/ownership';
import { supabaseAdmin } from '@/lib/supabase';
import { buildPlayerFAQs, buildPlayerIntro } from '@/lib/player-context';

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

  // Social: look up owner + follower count in parallel (cheap, indexed).
  // Player pages may not have a claimed owner — `owner` is null in that
  // case and the message button won't render.
  const [owner, initialFollowersCount] = await Promise.all([
    getEntityOwner('player', id),
    getFollowersCount('player', id),
  ]);

  // Server-side JSON-LD: Person (athlete) + BreadcrumbList + FAQPage.
  // Also reuse the same fetched player row to build the SEO copy block
  // (server-rendered About / FAQ section) at the bottom of the page.
  // Query the player record directly via supabaseAdmin (no self-loop HTTP
  // hop). The client component re-fetches its own data for the actual UI;
  // this is a duplicate read, not a coupled one — but it goes straight to
  // the DB now, not through the public /api/players endpoint, which
  // saves one full round trip per page load.
  let playerJsonLd: object | null = null;
  let seoPlayer: any = null;
  let seoFaqs: { question: string; answer: string }[] = [];
  let seoIntro: string = '';
  try {
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, slug, position, headshot_url, nationality, height_cm, weight_kg, jersey_number, shoots, catches, birth_date, bio, updated_at, teams(name, slug, leagues(name, slug, country))')
      .eq('id', id)
      .maybeSingle();
    if (player) {
      const fullName = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || 'Hockey Player';
      const teamName = (player.teams as any)?.name;
      const teamSlug = (player.teams as any)?.slug;
      const leagueName = (player.teams as any)?.leagues?.name;
      const leagueSlug = (player.teams as any)?.leagues?.slug;
      const leagueCountry = (player.teams as any)?.leagues?.country;
      const position = POSITION_FULL[player.position] || player.position || 'Hockey Player';

      const faqs = buildPlayerFAQs({
        fullName,
        firstName: player.first_name,
        position: player.position,
        jerseyNumber: player.jersey_number,
        shoots: player.shoots,
        catches: player.catches,
        heightCm: player.height_cm,
        weightKg: player.weight_kg,
        birthDate: player.birth_date,
        nationality: player.nationality,
        bio: player.bio,
        teamName,
        teamSlug,
        leagueName,
        leagueSlug,
        leagueCountry,
        updatedAt: player.updated_at,
      });

      seoFaqs = faqs;
      seoPlayer = player;
      seoIntro = buildPlayerIntro({
        fullName,
        firstName: player.first_name,
        position: player.position,
        jerseyNumber: player.jersey_number,
        shoots: player.shoots,
        catches: player.catches,
        heightCm: player.height_cm,
        weightKg: player.weight_kg,
        birthDate: player.birth_date,
        nationality: player.nationality,
        bio: player.bio,
        teamName,
        teamSlug,
        leagueName,
        leagueSlug,
        leagueCountry,
        updatedAt: player.updated_at,
      });

      const jsonLdGraph: any[] = [
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
        {
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer.replace(/<[^>]+>/g, '') },
          })),
        },
      ];

      playerJsonLd = {
        '@context': 'https://schema.org',
        '@graph': jsonLdGraph,
      };
    }
  } catch (err) {
    // JSON-LD is best-effort. Page must still render.
    playerJsonLd = null;
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
      {seoPlayer && (
        <PlayerSEOCopy
          player={seoPlayer}
          faqs={seoFaqs}
          intro={seoIntro}
        />
      )}
    </>
  );
}
