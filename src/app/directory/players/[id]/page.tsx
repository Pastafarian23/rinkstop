import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PlayerDetail from './PlayerDetailClient';
import PlayerSEOCopy from './PlayerSEOCopy';
import ClaimThisListingMount from '@/components/ClaimThisListingMount';
import { getEntityOwner, getFollowersCount } from '@/lib/ownership';
import { buildPlayerFAQs } from '@/lib/player-context';
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
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('[player-metadata] id=', id, 'isUuid=', isUuid, 'envUrl=', envUrl?.substring(0, 30), 'keySet=', !!envKey);

  try {
    const sb = getDirectAdminClient();
    console.log('[player-metadata] sb created=', !!sb);
    if (!sb) return { title: 'Player' };

    const { data: player } = await sb
      .from('players')
      .select('id, first_name, last_name, position, nationality, headshot_url, teams(name, leagues(name))')
      .eq(isUuid ? 'id' : 'slug', id)
      .maybeSingle();

    if (!player) return { title: 'Player Not Found' };

    const team0: any = Array.isArray(player.teams) ? player.teams[0] : player.teams;
    const league0: any = team0?.leagues ? (Array.isArray(team0.leagues) ? team0.leagues[0] : team0.leagues) : null;
    const fullName = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || 'Player';
    const teamName = team0?.name || null;
    const leagueName = league0?.name || '';
    const position = POSITION_FULL[player.position] || player.position || null;
    const description = buildPlayerDescription(player);
    const stripSuffix = (s: string) => s.replace(/\s*\|\s*RinkStop\s*$/, '');

    let titlePart: string;
    // seo_title column doesn't exist in production DB, so we don't SELECT it here.
    // The page-side SELECT uses an extended field list; metadata uses a leaner one
    // because it's not allowed to fail silently on missing columns.
    const seoTitle = (player as any).seo_title as string | undefined;
    if (seoTitle && stripSuffix(seoTitle)) {
      titlePart = stripSuffix(seoTitle);
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

  // 2026-09-04: Use supabaseAdmin proxy (lazy-init) instead of inline
  // createClient via getDirectAdminClient(). The inline pattern worked
  // for slug URLs but mysteriously returned null for UUID URLs even
  // though the metadata path (which used the proxy) succeeded. The
  // proxy returns the same SupabaseClient type, so this is a safe
  // drop-in.
  // 2026-09-04: Also simplified the SELECT to match the metadata query
  // shape. Removed `slug` and `country` from the join since they're
  // not on the legacy `teams` (national teams) table.
  const { data: seoPlayer, error: playerError } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, slug, position, headshot_url, nationality, height_cm, weight_kg, jersey_number, shoots, catches, birth_date, bio, updated_at, highlightly_id, teams(name, leagues(name))')
    .eq(isUuid ? 'id' : 'slug', id)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerTyped: any = seoPlayer;

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
    const fullName = `${playerTyped.first_name ?? ''} ${playerTyped.last_name ?? ''}`.trim() || 'Hockey Player';
    const teamsArr: any[] = Array.isArray(playerTyped.teams) ? playerTyped.teams : (playerTyped.teams ? [playerTyped.teams] : []);
    const team0 = teamsArr[0] || {};
    const league0 = team0?.leagues ? (Array.isArray(team0.leagues) ? team0.leagues[0] : team0.leagues) : {};
    const teamName = team0?.name;
    const teamSlug = team0?.slug;
    const leagueName = league0?.name;
    const leagueSlug = league0?.slug;
    const position = POSITION_FULL[playerTyped.position] || playerTyped.position || 'Hockey Player';

    const seoFaqs = buildPlayerFAQs({
      fullName, firstName: playerTyped.first_name, position: playerTyped.position,
      jerseyNumber: playerTyped.jersey_number, shoots: playerTyped.shoots, catches: playerTyped.catches,
      heightCm: playerTyped.height_cm, weightKg: playerTyped.weight_kg, birthDate: playerTyped.birth_date,
      nationality: playerTyped.nationality, bio: playerTyped.bio,
      teamName, teamSlug, leagueName, leagueSlug, leagueCountry: league0?.country,
      updatedAt: playerTyped.updated_at,
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
          ...(playerTyped.headshot_url ? { image: playerTyped.headshot_url } : {}),
          ...(teamName ? {
            affiliation: {
              '@type': 'SportsTeam', name: teamName,
              url: teamSlug ? `${BASE_URL}/directory/teams/${teamSlug}` : undefined,
              ...(leagueName ? {
                memberOf: { '@type': 'SportsOrganization', name: leagueName, url: leagueSlug ? `${BASE_URL}/directory/leagues/${leagueSlug}` : undefined },
              } : {}),
            },
          } : {}),
          ...(playerTyped.nationality && playerTyped.nationality.length <= 3
            ? { nationality: COUNTRY_NAMES[playerTyped.nationality] || playerTyped.nationality } : {}),
          ...(playerTyped.height_cm ? { height: { '@type': 'QuantitativeValue', value: playerTyped.height_cm, unitCode: 'CMT' } } : {}),
          ...(playerTyped.weight_kg ? { weight: { '@type': 'QuantitativeValue', value: playerTyped.weight_kg, unitCode: 'KGM' } } : {}),
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
        initialPlayer={playerTyped}
        unifiedStats={unifiedStats}
      />
      <PlayerSEOCopy player={playerTyped} career={{}} />
      <div style={{ maxWidth: '800px', margin: '2rem auto 0' }}>
        <ClaimThisListingMount entityType="player" entityId={id} />
      </div>

      {/* 2026-09-04 Layer 5 (aggressive growth plan) trust footer.
          AdSense hard gate requires byline + methodology + last-updated +
          AI disclosure on every content surface; player pages were the
          last surface missing this footer. */}
      <footer
        style={{
          maxWidth: '1280px',
          margin: '1.5rem auto 3rem',
          padding: '1.5rem 1.5rem 1rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.55)',
          fontSize: '0.75rem',
          lineHeight: 1.6,
        }}
      >
        <div style={{ marginBottom: '0.5rem' }}>
          {`${playerTyped?.first_name ?? ''} ${playerTyped?.last_name ?? ''}`.trim() || 'Player'} data sourced from RinkStop's verified hockey directory.
          {playerTyped?.updated_at ? ` Last updated ${new Date(playerTyped.updated_at).toISOString().split('T')[0]}.` : ''}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <span>By <a href="/about" style={{ color: '#FFB81C', textDecoration: 'underline' }}>Arnel Larracas</a>, Founder &amp; Editor-in-Chief</span>
          <span>•</span>
          <a href="/data-methodology" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'underline' }}>Data methodology</a>
          <span>•</span>
          <a href="/editorial-policy" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'underline' }}>Editorial policy</a>
          <span>•</span>
          <a href="/corrections" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'underline' }}>Report a correction</a>
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          AI tools may be used to assist with research and drafting on RinkStop. All content is reviewed and edited by a human editor before publication.
        </div>
      </footer>
    </>
  );
}
