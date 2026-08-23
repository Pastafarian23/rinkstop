import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PlayerDetail from './PlayerDetailClient';
import PlayerSEOCopy from './PlayerSEOCopy';
import ClaimThisListingMount from '@/components/ClaimThisListingMount';
import { getEntityOwner, getFollowersCount } from '@/lib/ownership';
import { supabaseAdmin } from '@/lib/supabase';
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
  CAN: 'Canada', USA: 'United States', US: 'United States',
  RUS: 'Russia', SWE: 'Sweden', FIN: 'Finland', CZE: 'Czech Republic',
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
  const fullName = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || 'Player';
  const teamName = player.teams?.name || player.current_team_name || null;
  const leagueName = player.teams?.leagues?.name || '';
  const position = POSITION_FULL[player.position] || player.position || null;

  // Build facts list. Skip the empty fallbacks — if a field is missing, we
  // don't want fabricated text like 'plays for their current team'.
  const facts: string[] = [];
  if (player.nationality && player.nationality.length <= 3) {
    facts.push(COUNTRY_NAMES[player.nationality] || player.nationality);
  } else if (player.nationality) {
    facts.push(player.nationality);
  }
  if (player.jersey_number != null) facts.push(`#${player.jersey_number}`);
  if (player.shoots) facts.push(`shoots ${player.shoots === 'L' ? 'left' : 'right'}`);
  if (player.height_cm) facts.push(`${player.height_cm} cm tall`);
  if (player.weight_kg) facts.push(`${player.weight_kg} kg`);
  if (player.birth_place) facts.push(`from ${player.birth_place}`);

  // Sparse-data path: when position + team + nationality are all missing,
  // the player is barely in the DB yet — don't fabricate context. Return a
  // minimal description that just identifies the player without claiming
  // they play for a specific team or position.
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
    const teamName = player.teams?.name || player.current_team_name || null;
    const leagueName = player.teams?.leagues?.name || '';
    const position = POSITION_FULL[player.position] || player.position || null;
    const description = buildPlayerDescription(player);
    // Root layout template appends ' | RinkStop'. Strip any trailing suffix
    // from the DB seo_title so we don't get 'X | RinkStop | RinkStop'.
    const stripSuffix = (s: string) => s.replace(/\s*\|\s*RinkStop\s*$/, '');
    const rawSeoTitle = (player as any).seo_title as string | undefined;
    // Build a clean title that doesn't fabricate the team position when
    // they're missing. Avoid the previous bug where a missing team fell
    // back to the literal string 'Hockey Player', producing
    // 'X - Hockey | Hockey Player | RinkStop'.
    let titlePart: string;
    if (rawSeoTitle && stripSuffix(rawSeoTitle)) {
      titlePart = stripSuffix(rawSeoTitle);
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

  // Reject obviously invalid ids before social lookups. Look up by either
  // UUID id OR slug — the route param is named [id] for backward compat
  // but URLs like /directory/players/leevi-aaltonen come in as slug.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const { data: playerExists } = isUuid
    ? await supabaseAdmin.from('players').select('id').eq('id', id).maybeSingle()
    : await supabaseAdmin.from('players').select('id').eq('slug', id).maybeSingle();
  if (!playerExists) {
    notFound();
  }

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
  try {
    const playerQuery = isUuid
      ? supabaseAdmin.from('players').select('id, first_name, last_name, slug, position, headshot_url, nationality, height_cm, weight_kg, jersey_number, shoots, catches, birth_date, bio, updated_at, teams(name, slug, leagues(name, slug, country))').eq('id', id).maybeSingle()
      : supabaseAdmin.from('players').select('id, first_name, last_name, slug, position, headshot_url, nationality, height_cm, weight_kg, jersey_number, shoots, catches, birth_date, bio, updated_at, teams(name, slug, leagues(name, slug, country))').eq('slug', id).maybeSingle();
    const { data: player } = await playerQuery;
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

      const jsonLdGraph: any[] = [
        {
          '@type': 'Person',
          name: fullName,
          jobTitle: `Professional Ice Hockey Player — ${position}`,
          sport: 'Ice hockey',
          url: `${BASE_URL}/directory/players/${id}`,
          ...(player.headshot_url ? { image: player.headshot_url } : {}),
          ...(teamName
            ? { affiliation: { '@type': 'SportsTeam', name: teamName, url: teamSlug ? `${BASE_URL}/directory/teams/${teamSlug}` : undefined, ...(leagueName ? { memberOf: { '@type': 'SportsOrganization', name: leagueName, url: leagueSlug ? `${BASE_URL}/directory/leagues/${leagueSlug}` : undefined } } : {}) } }
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
      <PlayerDetail id={id} ownerUserId={owner?.userId ?? null} initialFollowersCount={initialFollowersCount} />
      {seoPlayer && (
        <PlayerSEOCopy
          player={seoPlayer}
          career={{}}
        />
      )}
      {/* Claim CTA — moved below all content per Arnel (2026-07-08) */}
      <div style={{ maxWidth: '800px', margin: '2rem auto 0' }}>
        <ClaimThisListingMount entityType="player" entityId={id} />
      </div>

      {/* WS16 PR2 — AdSense display ad below player profile, above footer. */}
      <div style={{ maxWidth: '1200px', margin: '1.5rem auto', padding: '0 1rem' }}>
        
      </div>
    </>
  );
}
