import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PlayerDetail from './PlayerDetailClient';
import PlayerSEOCopy from './PlayerSEOCopy';
import ClaimThisListingMount from '@/components/ClaimThisListingMount';
import { getEntityOwner, getFollowersCount } from '@/lib/ownership';
import { buildPlayerFAQs } from '@/lib/player-context';

interface Props {
  params: Promise<{ id: string }>;
}

const POSITION_FULL: Record<string, string> = {
  center: 'Center', left_wing: 'Left Wing', right_wing: 'Right Wing',
  defenseman: 'Defenseman', defense: 'Defenseman', goalie: 'Goalie',
  goaltender: 'Goalie', forward: 'Forward',
};

const COUNTRY_NAMES: Record<string, string> = {
  CAN: 'Canada', USA: 'United States', RUS: 'Russia', SWE: 'Sweden',
  FIN: 'Finland', CZE: 'Czech Republic', SVK: 'Slovakia', DEU: 'Germany',
  CHE: 'Switzerland', NOR: 'Norway', DNK: 'Denmark', FRA: 'France',
  GBR: 'United Kingdom', LAT: 'Latvia', ITA: 'Italy', NLD: 'Netherlands',
  AUS: 'Australia', JPN: 'Japan', KOR: 'South Korea', POL: 'Poland',
};

const _RAW = process.env.NEXT_PUBLIC_SITE_URL || '';
const BASE_URL = _RAW.includes('localhost') ? 'https://rinkstop.com' : (_RAW || 'https://rinkstop.com');

// Direct Supabase admin client — bypasses the lazy-proxy in lib/supabase.ts
// which may have initialization-order issues in Vercel serverless.
function getDirectAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[player-page] missing env vars: URL=', url, 'KEY=', key ? 'SET' : 'MISSING');
    return null;
  }
  return createClient(url, key);
}

function buildPlayerDescription(player: any): string {
  const fullName = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || 'Player';
  const teamArr: any[] = Array.isArray(player.teams) ? player.teams : (player.teams ? [player.teams] : []);
  const team0 = teamArr[0];
  const league0 = team0?.leagues ? (Array.isArray(team0.leagues) ? team0.leagues[0] : team0.leagues) : null;
  const teamName = team0?.name || player.current_team_name || null;
  const leagueName = league0?.name || '';
  const position = POSITION_FULL[player.position] || player.position || null;

  const facts: string[] = [];
  if (player.nationality && player.nationality.length <= 3) {
    facts.push(COUNTRY_NAMES[player.nationality] || player.nationality);
  }
  if (player.jersey_number != null) facts.push(`#${player.jersey_number}`);
  if (player.shoots) facts.push(`shoots ${player.shoots === 'L' ? 'left' : 'right'}`);
  if (player.height_cm) facts.push(`${player.height_cm} cm tall`);
  if (player.weight_kg) facts.push(`${player.weight_kg} kg`);

  if (!position && !teamName && facts.length === 0) {
    return `${fullName} — hockey player profile with stats, team history, and career highlights on RinkStop.`;
  }

  const factsStr = facts.length > 0 ? ` (${facts.join(', ')})` : '';
  const positionClause = position ? `a ${position}` : 'a hockey player';
  const teamClause = teamName ? ` who plays for ${teamName}` : '';
  const leagueClause = leagueName ? ` in the ${leagueName}` : '';
  return `${fullName}${factsStr} is ${positionClause}${teamClause}${leagueClause} — full profile, stats, and career highlights on RinkStop.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  try {
    const sb = getDirectAdminClient();
    if (!sb) return { title: 'Player' };

    const { data: player } = await sb
      .from('players')
      .select('id, first_name, last_name, position, nationality, headshot_url, seo_title, current_team_name, teams(name, leagues(name))')
      .eq(isUuid ? 'id' : 'slug', id)
      .maybeSingle();

    if (!player) return { title: 'Player Not Found' };

    const team0: any = Array.isArray(player.teams) ? player.teams[0] : player.teams;
    const league0: any = team0?.leagues ? (Array.isArray(team0.leagues) ? team0.leagues[0] : team0.leagues) : null;
    const fullName = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || 'Player';
    const teamName = team0?.name || player.current_team_name || null;
    const leagueName = league0?.name || '';
    const position = POSITION_FULL[player.position] || player.position || null;
    const description = buildPlayerDescription(player);
    const stripSuffix = (s: string) => s.replace(/\s*\|\s*RinkStop\s*$/, '');

    let titlePart: string;
    if (player.seo_title && stripSuffix(player.seo_title)) {
      titlePart = stripSuffix(player.seo_title);
    } else if (position && teamName) {
      titlePart = `${fullName} – ${position} | ${teamName}${leagueName ? ` (${leagueName})` : ''}`;
    } else if (position) {
      titlePart = `${fullName} – ${position} | Hockey Player Profile`;
    } else if (teamName) {
      titlePart = `${fullName} – ${teamName}${leagueName ? ` (${leagueName})` : ''} | Hockey Player Profile`;
    } else {
      titlePart = `${fullName} – Hockey Player Profile`;
    }

    return {
      title: titlePart,
      description,
      openGraph: {
        title: fullName,
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
        title: fullName,
        description,
        ...(player.headshot_url ? { images: [player.headshot_url] } : {}),
      },
      alternates: { canonical: `https://rinkstop.com/directory/players/${id}` },
    };
  } catch (err) {
    console.error('Player metadata error:', err);
    return { title: 'Player' };
  }
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const sb = getDirectAdminClient();
  if (!sb) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>Configuration error — please try again.</div>;
  }

  const { data: seoPlayer, error: playerError } = await sb
    .from('players')
    .select('id, first_name, last_name, slug, position, headshot_url, nationality, height_cm, weight_kg, jersey_number, shoots, catches, birth_date, bio, updated_at, highlightly_id, teams(name, slug, leagues(name, slug, country))')
    .eq(isUuid ? 'id' : 'slug', id)
    .maybeSingle();

  if (playerError) {
    console.error('[player-page] DB error:', playerError);
  }

  if (!seoPlayer) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Player Not Found</h1>
        <p style={{ color: '#666' }}>We could not find a player with that name.</p>
      </div>
    );
  }

  const [owner, initialFollowersCount] = await Promise.all([
    getEntityOwner('player', id),
    getFollowersCount('player', id),
  ]);

  let unifiedStats: any[] = [];
  try {
    const { data: passportStats } = await sb
      .from('hockey_player_stats_season')
      .select(`
        id, season_id, level, games_played, goals, assists, plus_minus, penalty_minutes,
        goalie_games_played, wins, losses, goals_against, saves, shutouts,
        save_percentage, gaa, verification_source, verified_by, verified_at,
        hockey_seasons!inner(label, start_date),
        hockey_player_team_history!left(id, team_name),
        leagues!left(id, name, slug)
      `)
      .eq('player_id', seoPlayer.id)
      .order('hockey_seasons(start_date)', { ascending: false });

    unifiedStats = (passportStats || []).map((s: any) => ({
      id: s.id,
      source: s.verification_source || 'self_reported',
      season: s.hockey_seasons?.label || null,
      league_name: s.leagues?.name || null,
      level: s.level || null,
      team_name: s.hockey_player_team_history?.team_name || null,
      games_played: s.games_played ?? 0,
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      points: (s.goals ?? 0) + (s.assists ?? 0),
      plus_minus: s.plus_minus ?? 0,
      penalty_minutes: s.penalty_minutes ?? 0,
      goalie_games_played: s.goalie_games_played ?? null,
      wins: s.wins ?? null,
      losses: s.losses ?? null,
      goals_against: s.goals_against ?? null,
      saves: s.saves ?? null,
      shutouts: s.shutouts ?? null,
      save_percentage: s.save_percentage ?? null,
      gaa: s.gaa ?? null,
      verification_source: s.verification_source,
      verified_by: s.verified_by || null,
      verified_at: s.verified_at || null,
    }));
  } catch (err) {
    console.error('[player-page] stats fetch failed', err);
  }

  let playerJsonLd: object | null = null;
  try {
    const fullName = `${seoPlayer.first_name ?? ''} ${seoPlayer.last_name ?? ''}`.trim() || 'Hockey Player';
    const teamsArr: any[] = Array.isArray(seoPlayer.teams) ? seoPlayer.teams : (seoPlayer.teams ? [seoPlayer.teams] : []);
    const team0 = teamsArr[0] || {};
    const league0 = team0?.leagues ? (Array.isArray(team0.leagues) ? team0.leagues[0] : team0.leagues) : {};
    const teamName = team0?.name;
    const teamSlug = team0?.slug;
    const leagueName = league0?.name;
    const leagueSlug = league0?.slug;
    const position = POSITION_FULL[seoPlayer.position] || seoPlayer.position || 'Hockey Player';

    const seoFaqs = buildPlayerFAQs({
      fullName, firstName: seoPlayer.first_name, position: seoPlayer.position,
      jerseyNumber: seoPlayer.jersey_number, shoots: seoPlayer.shoots, catches: seoPlayer.catches,
      heightCm: seoPlayer.height_cm, weightKg: seoPlayer.weight_kg, birthDate: seoPlayer.birth_date,
      nationality: seoPlayer.nationality, bio: seoPlayer.bio,
      teamName, teamSlug, leagueName, leagueSlug, leagueCountry: league0?.country,
      updatedAt: seoPlayer.updated_at,
    });

    playerJsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Person',
          name: fullName,
          jobTitle: `Professional Ice Hockey Player — ${position}`,
          sport: 'Ice hockey',
          url: `${BASE_URL}/directory/players/${id}`,
          ...(seoPlayer.headshot_url ? { image: seoPlayer.headshot_url } : {}),
          ...(teamName ? {
            affiliation: {
              '@type': 'SportsTeam', name: teamName,
              url: teamSlug ? `${BASE_URL}/directory/teams/${teamSlug}` : undefined,
              ...(leagueName ? {
                memberOf: { '@type': 'SportsOrganization', name: leagueName, url: leagueSlug ? `${BASE_URL}/directory/leagues/${leagueSlug}` : undefined },
              } : {}),
            },
          } : {}),
          ...(seoPlayer.nationality && seoPlayer.nationality.length <= 3
            ? { nationality: COUNTRY_NAMES[seoPlayer.nationality] || seoPlayer.nationality } : {}),
          ...(seoPlayer.height_cm ? { height: { '@type': 'QuantitativeValue', value: seoPlayer.height_cm, unitCode: 'CMT' } } : {}),
          ...(seoPlayer.weight_kg ? { weight: { '@type': 'QuantitativeValue', value: seoPlayer.weight_kg, unitCode: 'KGM' } } : {}),
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
          mainEntity: seoFaqs.map(f => ({
            '@type': 'Question', name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer.replace(/<[^>]+>/g, '') },
          })),
        },
      ],
    };
  } catch (err) {
    console.error('[player-page] JSON-LD build failed', err);
  }

  return (
    <>
      {playerJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(playerJsonLd) }} />
      )}
      <PlayerDetail
        id={id}
        ownerUserId={owner?.userId ?? null}
        initialFollowersCount={initialFollowersCount}
        initialPlayer={seoPlayer as any}
        unifiedStats={unifiedStats}
      />
      <PlayerSEOCopy player={seoPlayer as any} career={{}} />
      <div style={{ maxWidth: '800px', margin: '2rem auto 0' }}>
        <ClaimThisListingMount entityType="player" entityId={id} />
      </div>
    </>
  );
}
