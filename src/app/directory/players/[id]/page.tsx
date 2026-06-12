import type { Metadata } from 'next';
import PlayerDetail from './PlayerDetailClient';

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
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com'}/api/players?id=${id}`,
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
        title: `${fullName} | RinkStop`,
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
        title: `${fullName} | RinkStop`,
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
  return <PlayerDetail id={id} />;
}
