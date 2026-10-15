import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import GamePageClient from './GamePageClient';
import { withDefaultOg } from '@/lib/metadata-defaults';
import { ScoresheetQRPanel } from '@/components/ScoresheetQRPanel';
import FollowGameButton from '@/components/FollowGameButton';
import { isGameIndexable } from '@/lib/game-indexable';
import {
  getTeamForm,
  getH2H,
  getNextGame,
  getSameDayGames,
  type TeamForm,
  type H2HRow,
  type NextGame,
  type SameDayGame,
} from '@/lib/game-modules';
import {
  getVenueAndBoxscore,
  getLinkedArticles,
  getLinkedHighlights,
  getHistoricalAliases,
  type VenueData,
  type BroadcastData,
  type RecapLinkData,
  type BoxscoreLite,
  type LinkedArticle,
  type LinkedHighlight,
  type HistoricalAlias,
} from '@/lib/game-detail-modules';
import { displayNameForGame } from '@/lib/franchise-name-lookup';

// 2026-10-14 (Arnel 13:38 directive): server-render the data-driven
// modules (team form, H2H, next games, same-day, recap) in the
// initial HTML.  Per the user spec, GamePageClient keeps only
// interactive parts (ShareButton, countdown timer, add-to-calendar
// ICS download, FollowButton).
//
// Tiered ISR revalidation is delegated to per-module unstable_cache
// wrappers in src/lib/game-modules.ts.  Errors and empty results
// are never cached.

export const revalidate = 0;
export const dynamicParams = true;
export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  return [];
}

const BASE_URL = 'https://rinkstop.com';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

interface FixtureRow {
  id: string;
  scheduled_at: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
  home_score: number | null;
  away_score: number | null;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  game_data: any;
  home_team: { id: string; name: string; slug: string; logo_url: string | null } | null;
  away_team: { id: string; name: string; slug: string; logo_url: string | null } | null;
  league: { id: string; name: string; slug: string; level: string | null; country: string | null } | null;
}

// 2026-10-15 (Arnel 09:03 step 3): cache key includes id, status, and
// tier so a game that flips status (scheduled → in_progress → completed)
// lands on a fresh key.  Old keys age out naturally at their tier TTL.
const FIXTURE_CACHE_VERSION = 'v3';

function tierForStatus(status: FixtureRow['status'] | undefined, scheduledAt: string | undefined): number {
  if (!status) return 3600;
  if (status === 'in_progress') return 30;
  if (status === 'completed' || status === 'cancelled') return 86400;
  if (status === 'scheduled' || status === 'postponed') {
    if (!scheduledAt) return 3600;
    const minutesUntil = (new Date(scheduledAt).getTime() - Date.now()) / 60000;
    if (minutesUntil < 0) return 30;
    if (minutesUntil < 60 * 24 * 7) return 300;
    return 3600;
  }
  return 3600;
}

const probeStatusCached = (id: string) => unstable_cache(
  async (): Promise<{ status: FixtureRow['status']; scheduled_at: string } | null> => {
    try {
      const sb = getSupabase();
      const { data } = await sb.from('fixtures').select('status, scheduled_at').eq('id', id).maybeSingle();
      if (!data) return null;
      return { status: data.status as FixtureRow['status'], scheduled_at: data.scheduled_at };
    } catch { return null; }
  },
  ['game-detail-probe', FIXTURE_CACHE_VERSION, id],
  { revalidate: 30, tags: ['game-detail', `game:${id}`] }
);

const fetchGameByStatus = (id: string, status: FixtureRow['status'], scheduledAt: string) => {
  const tier = tierForStatus(status, scheduledAt);
  return unstable_cache(
    async (): Promise<FixtureRow | null> => {
      try {
        const sb = getSupabase();
        const { data: fixture, error } = await sb
          .from('fixtures')
          .select(`id, scheduled_at, status, home_score, away_score, league_id, home_team_id, away_team_id, game_data,
            home_team:teams!fixtures_home_team_id_fkey(id, name, slug, logo_url),
            away_team:teams!fixtures_away_team_id_fkey(id, name, slug, logo_url),
            league:leagues(id, name, slug, level, country)`)
          .eq('id', id)
          .maybeSingle();
        if (error || !fixture) return null;
        return fixture as unknown as FixtureRow;
      } catch { return null; }
    },
    // Key includes status + tier so a status flip invalidates cleanly.
    ['game-detail-fixture', FIXTURE_CACHE_VERSION, id, status, String(tier)],
    { revalidate: tier, tags: ['game-detail', `game:${id}`] }
  );
};

async function fetchGame(id: string): Promise<FixtureRow | null> {
  const probe = await probeStatusCached(id)();
  if (!probe) return null;
  return fetchGameByStatus(id, probe.status, probe.scheduled_at)();
}

function buildRecap(g: FixtureRow, homeDisplayName: string, awayDisplayName: string): string | null {
  if (g.status !== 'completed' || g.home_score === null || g.away_score === null) return null;
  if (g.home_score > g.away_score) {
    return `${homeDisplayName} won ${g.home_score}–${g.away_score} over ${awayDisplayName}.`;
  }
  if (g.away_score > g.home_score) {
    return `${awayDisplayName} won ${g.away_score}–${g.home_score} at ${homeDisplayName}.`;
  }
  return `Final: ${awayDisplayName} ${g.away_score}–${g.home_score} ${homeDisplayName}.`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const game = await fetchGame(id);
  if (!game) {
    return {
      title: 'Game Not Found | RinkStop',
      description: 'Hockey game details not available.',
      alternates: { canonical: `${BASE_URL}/directory/games/${id}` },
      robots: { index: false, follow: true },
    };
  }
  const homeName = game.home_team?.name ?? 'Home';
  const awayName = game.away_team?.name ?? 'Away';
  const leagueName = game.league?.name ?? 'Hockey';
  const dateStr = new Date(game.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const title = `${awayName} at ${homeName} — ${dateStr} | ${leagueName}`;
  const description = `${awayName} vs ${homeName} on ${dateStr} in the ${leagueName}. Live score, boxscore, and game details on RinkStop.`;
  const ogImage = game.home_team?.logo_url || `${BASE_URL}/og-image.png`;

  // Indexability is decided from real data below in the page body
  // (we fetch the modules in the page itself and pass the
  // boolean into metadata).  We mirror the same condition here
  // by calling the same getters with the same status + scheduled_at
  // — the result is consistent with the page's isGameIndexable().
  const [homeForm, awayForm, h2h, homeNext, awayNext, sameDay] = await Promise.all([
    getTeamForm(game.league_id, game.home_team_id, game.status, game.scheduled_at),
    getTeamForm(game.league_id, game.away_team_id, game.status, game.scheduled_at),
    getH2H(game.league_id, game.home_team_id, game.away_team_id, game.id, game.status, game.scheduled_at),
    getNextGame(game.league_id, game.home_team_id, game.scheduled_at, game.status, game.scheduled_at),
    getNextGame(game.league_id, game.away_team_id, game.scheduled_at, game.status, game.scheduled_at),
    getSameDayGames(
      game.league_id,
      `${game.scheduled_at.slice(0, 10)}T00:00:00Z`,
      `${game.scheduled_at.slice(0, 10)}T23:59:59Z`,
      game.id,
      game.status,
      game.scheduled_at,
    ),
  ]);
  const isUpcomingWithinWeek = game.status === 'scheduled'
    && (new Date(game.scheduled_at).getTime() - Date.now()) < 7 * 86400000;
  const isCompletedWithScore = game.status === 'completed'
    && game.home_score !== null && game.away_score !== null;
  const indexable = isGameIndexable({
    status: game.status,
    bothTeamsHaveForm: !!(homeForm && awayForm),
    hasH2H: h2h.length > 0,
    hasHomeNextGame: !!homeNext,
    hasAwayNextGame: !!awayNext,
    hasSameDayGames: sameDay.length > 0,
    isCompletedWithScore,
    isUpcomingWithinWeek,
  });
  return {
    title,
    description: description.slice(0, 240),
    alternates: { canonical: `${BASE_URL}/directory/games/${id}` },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: withDefaultOg({
      title: `${awayName} @ ${homeName}`,
      description,
      url: `${BASE_URL}/directory/games/${id}`,
      siteName: 'RinkStop',
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${awayName} at ${homeName}` }],
    }),
    twitter: {
      card: 'summary_large_image',
      title: `${awayName} @ ${homeName}`,
      description,
      images: [ogImage],
    },
  };
}

export default async function GameDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const game = await fetchGame(id);

  if (!game) {
    notFound();
  }

  // Fetch all data-driven modules in parallel.  Each is wrapped in
  // its own unstable_cache with tiered revalidation.
  const [homeForm, awayForm, h2h, homeNext, awayNext, sameDay] = await Promise.all([
    getTeamForm(game.league_id, game.home_team_id, game.status, game.scheduled_at),
    getTeamForm(game.league_id, game.away_team_id, game.status, game.scheduled_at),
    getH2H(game.league_id, game.home_team_id, game.away_team_id, game.id, game.status, game.scheduled_at),
    getNextGame(game.league_id, game.home_team_id, game.scheduled_at, game.status, game.scheduled_at),
    getNextGame(game.league_id, game.away_team_id, game.scheduled_at, game.status, game.scheduled_at),
    getSameDayGames(
      game.league_id,
      `${game.scheduled_at.slice(0, 10)}T00:00:00Z`,
      `${game.scheduled_at.slice(0, 10)}T23:59:59Z`,
      game.id,
      game.status,
      game.scheduled_at,
    ),
  ]);

  const homeName = game.home_team?.name ?? 'Home';
  const awayName = game.away_team?.name ?? 'Away';
  const leagueName = game.league?.name ?? 'Hockey';

  // 2026-10-15: server-rendered boxscore / venue / linked / historical.
  // Each is its own unstable_cache call with the game id (and status +
  // tier) in the key.  All hide themselves on no-data.
  const { venue, broadcasts, recap: recapLinks, boxscore } = await getVenueAndBoxscore(
    game.id,
    game.game_data,
    game.status,
    game.scheduled_at,
    homeName,
    awayName,
    game.home_score,
    game.away_score,
    null, // abbrev not in DB
    null,
  );
  const gameDate = game.scheduled_at.slice(0, 10);
  const [linkedArticles, linkedHighlights] = await Promise.all([
    getLinkedArticles(
      game.id,
      game.game_data,
      gameDate,
      game.home_team?.name ?? null,
      game.away_team?.name ?? null,
      game.status,
      game.scheduled_at,
    ),
    getLinkedHighlights(
      game.id,
      gameDate,
      game.home_team?.name ?? null,
      game.away_team?.name ?? null,
      game.status,
      game.scheduled_at,
    ),
  ]);
  const historicalAliases = getHistoricalAliases(
    game.home_team?.slug ?? null,
    game.away_team?.slug ?? null,
    game.scheduled_at,
  );

  // Date-aware franchise name resolution: old Phoenix Coyotes games
  // show "Phoenix Coyotes" not "Utah Hockey Club".  When the team
  // isn't in the canonical list (e.g. AHL / KHL / NCAA), displayNameForGame
  // falls back to the raw slug, which looks broken in JSON-LD — use
  // the DB name in that case.
  const homeDisplay = game.home_team?.slug ? displayNameForGame(game.home_team.slug, game.scheduled_at) : null;
  const awayDisplay = game.away_team?.slug ? displayNameForGame(game.away_team.slug, game.scheduled_at) : null;
  const homeRenderName = (homeDisplay && homeDisplay.display && homeDisplay.display !== game.home_team?.slug)
    ? homeDisplay.display
    : homeName;
  const awayRenderName = (awayDisplay && awayDisplay.display && awayDisplay.display !== game.away_team?.slug)
    ? awayDisplay.display
    : awayName;

  // SportsEvent JSON-LD
  const sportsEvent = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${awayRenderName} at ${homeRenderName}`,
    startDate: game.scheduled_at,
    url: `${BASE_URL}/directory/games/${id}`,
    eventStatus:
      game.status === 'completed' ? 'https://schema.org/EventCompleted' :
      game.status === 'in_progress' ? 'https://schema.org/EventLive' :
      game.status === 'cancelled' ? 'https://schema.org/EventCancelled' :
      'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    sport: 'Ice Hockey',
    homeTeam: game.home_team ? { '@type': 'SportsTeam', name: homeRenderName, url: `${BASE_URL}/directory/teams/${game.home_team.slug}` } : undefined,
    awayTeam: game.away_team ? { '@type': 'SportsTeam', name: awayRenderName, url: `${BASE_URL}/directory/teams/${game.away_team.slug}` } : undefined,
    ...(game.status === 'completed' && game.home_score !== null && game.away_score !== null ? {
      description: `Final: ${awayRenderName} ${game.away_score}–${game.home_score} ${homeRenderName}.`,
    } : {}),
  };

  // BreadcrumbList JSON-LD (server-rendered, not behind a client component)
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Scores', item: `${BASE_URL}/directory/games` },
      { '@type': 'ListItem', position: 3, name: leagueName, item: game.league?.slug ? `${BASE_URL}/directory/${game.league.slug}` : `${BASE_URL}/directory/games` },
      { '@type': 'ListItem', position: 4, name: `${awayRenderName} at ${homeRenderName}`, item: `${BASE_URL}/directory/games/${id}` },
    ],
  };

  const recap = buildRecap(game, homeRenderName, awayRenderName);
  const isUpcomingWithinWeek = game.status === 'scheduled'
    && (new Date(game.scheduled_at).getTime() - Date.now()) < 7 * 86400000;

  // Decide indexable for the page-side decision (the metadata
  // function already ran with the same data, but we want the
  // components themselves to be able to read this if needed).
  const isCompletedWithScore = game.status === 'completed'
    && game.home_score !== null && game.away_score !== null;
  const indexable = isGameIndexable({
    status: game.status,
    bothTeamsHaveForm: !!(homeForm && awayForm),
    hasH2H: h2h.length > 0,
    hasHomeNextGame: !!homeNext,
    hasAwayNextGame: !!awayNext,
    hasSameDayGames: sameDay.length > 0,
    isCompletedWithScore,
    isUpcomingWithinWeek,
  });

  const qrEnabled = game.status === 'scheduled';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEvent) }}
      />
      <ScoresheetQRPanel
        fixtureId={game.id}
        status={game.status}
        qrEnabled={qrEnabled}
      />
      {/* 2026-10-15: server-rendered FollowGameButton client leaf.
          No auth, no DB — reads/writes the same rs_followed_games
          localStorage key that the rest of the app uses for
          follow state. Renders two small buttons (one per team). */}
      {game.away_team && game.home_team && (
        <FollowGameButton
          awayTeam={{ slug: game.away_team.slug, name: awayRenderName }}
          homeTeam={{ slug: game.home_team.slug, name: homeRenderName }}
        />
      )}
      <GamePageClient
        id={id}
        game={game}
        modules={{
          homeForm,
          awayForm,
          h2h,
          homeNext,
          awayNext,
          sameDay,
          recap,
          homeRenderName,
          awayRenderName,
          indexable,
          isCompletedWithScore,
          isUpcomingWithinWeek,
        }}
        detail={{
          venue,
          broadcasts,
          recapLinks,
          boxscore,
          linkedArticles,
          linkedHighlights,
          historicalAliases,
        }}
      />
    </>
  );
}
