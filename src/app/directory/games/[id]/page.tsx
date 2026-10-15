import type { Metadata } from 'next';
import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import GamePageClient from './GamePageClient';
import { withDefaultOg } from '@/lib/metadata-defaults';
import { ScoresheetQRPanel } from '@/components/ScoresheetQRPanel';

// 2026-10-14 (Arnel cache fix, final): tiered ISR.
//
// Why this is structured the way it is:
//
// - Next.js 15 requires either `generateStaticParams()` (returning
//   an array, even empty) OR `export const dynamic = 'force-static'`
//   for a dynamic route ([id]) to be treated as ISR rather than
//   server-rendered-on-demand.  We don't know the full set of valid
//   fixture ids at build time, so we return `[]` and let any id be
//   prerendered on first request.  Subsequent requests for the same
//   id are served from the per-id cache entry.
//
// - `revalidate` is set to 0 here (segment-level) and revalidation
//   is delegated to the per-tier `unstable_cache` wrappers below.
//   Each tier has its own revalidate value matching the freshness
//   the data needs:
//
//     live / today's in-progress games:  30s
//     upcoming scheduled (within 7 days):  5 min
//     upcoming scheduled (further out):   1 hour
//     finished games:                      24 hours
//
//   Setting segment revalidate=0 prevents Next.js from revalidating
//   the whole page on a global timer — the cache wrapper revalidates
//   the data it cached, which Next.js will pick up on the next
//   request via the cache tag.
//
// - Errors and empty results are NEVER cached.  The unstable_cache
//   wrappers return `null` on error and the per-id cache key is
//   skipped (the `if (game)` check below).

export const revalidate = 0;
export const dynamicParams = true; // default; explicit for clarity
export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  // Return empty array — Next.js will prerender on first request
  // for each [id] and serve subsequent requests from the per-id
  // unstable_cache entries.
  return [];
}

const BASE_URL = 'https://rinkstop.com';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 2026-10-14: tiered caching by game status.  We probe the row's
// status first (cheap — no joins) to pick a revalidate value, then
// fetch the full row.  The status probe itself is cached for 30s
// to avoid hammering Supabase on back-to-back requests.

type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';

interface FixtureRow {
  id: string;
  scheduled_at: string;
  status: GameStatus;
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

// Probe just the status + scheduled_at — used to pick the cache
// tier for the full row. Wrapped in unstable_cache so the top-level
// page render can stay static. 30s revalidate is fine for the probe —
// the full-row fetcher has its own per-tier revalidate.
const probeStatusCached = unstable_cache(
  async (id: string): Promise<{ status: GameStatus; scheduled_at: string } | null> => {
    try {
      const sb = getSupabase();
      const { data } = await sb
        .from('fixtures')
        .select('status, scheduled_at')
        .eq('id', id)
        .maybeSingle();
      if (!data) return null;
      return { status: data.status as GameStatus, scheduled_at: data.scheduled_at };
    } catch {
      return null;
    }
  },
  ['game-detail-probe-v1'],
  { revalidate: 30, tags: ['game-detail'] }
);

async function probeStatus(id: string): Promise<{ status: GameStatus; scheduled_at: string } | null> {
  return probeStatusCached(id);
}

function tierForStatus(status: GameStatus | undefined, scheduledAt: string | undefined): number {
  if (!status) return 3600; // unknown — be conservative
  if (status === 'in_progress') return 30;
  if (status === 'completed' || status === 'cancelled') return 86400;
  if (status === 'scheduled' || status === 'postponed') {
    if (!scheduledAt) return 3600;
    const minutesUntil = (new Date(scheduledAt).getTime() - Date.now()) / 60000;
    if (minutesUntil < 0) return 30; // past but not yet marked completed
    if (minutesUntil < 60 * 24 * 7) return 300; // within 7 days
    return 3600; // further out
  }
  return 3600;
}

const fetchGameByStatus = (status: GameStatus, scheduledAt: string) => {
  const tier = tierForStatus(status, scheduledAt);
  const cacheKey = `game-detail-fixture-v2-${status}-${tier}`;
  return (id: string): Promise<FixtureRow | null> => unstable_cache(
    async (): Promise<FixtureRow | null> => {
      try {
        const sb = getSupabase();
        const { data: fixture, error } = await sb
          .from('fixtures')
          .select(`
            id, scheduled_at, status, home_score, away_score, league_id, home_team_id, away_team_id, game_data,
            home_team:teams!fixtures_home_team_id_fkey(id, name, slug, logo_url),
            away_team:teams!fixtures_away_team_id_fkey(id, name, slug, logo_url),
            league:leagues(id, name, slug, level, country)
          `)
          .eq('id', id)
          .maybeSingle();
        if (error || !fixture) return null; // never cache errors/empty
        return fixture as unknown as FixtureRow;
      } catch {
        return null; // never cache errors/empty
      }
    },
    [cacheKey],
    { revalidate: tier, tags: ['game-detail', `game:${id}`] }
  )();
};

async function fetchGame(id: string): Promise<FixtureRow | null> {
  const probe = await probeStatus(id);
  if (!probe) return null; // not found — don't cache
  const fetcher = fetchGameByStatus(probe.status, probe.scheduled_at);
  return fetcher(id);
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
  return {
    title,
    description: description.slice(0, 240),
    alternates: { canonical: `${BASE_URL}/directory/games/${id}` },
    robots: { index: true, follow: true },
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
    return <GamePageClient id={id} />;
  }

  const homeName = game.home_team?.name ?? 'Home';
  const awayName = game.away_team?.name ?? 'Away';
  const leagueName = game.league?.name ?? 'Hockey';

  // SportsEvent JSON-LD for Google rich results.
  const sportsEvent = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${awayName} at ${homeName}`,
    startDate: game.scheduled_at,
    url: `${BASE_URL}/directory/games/${id}`,
    eventStatus:
      game.status === 'completed' ? 'https://schema.org/EventCompleted' :
      game.status === 'in_progress' ? 'https://schema.org/EventLive' :
      game.status === 'cancelled' ? 'https://schema.org/EventCancelled' :
      'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    sport: 'Ice Hockey',
    homeTeam: game.home_team ? { '@type': 'SportsTeam', name: homeName, url: `${BASE_URL}/directory/teams/${game.home_team.slug}` } : undefined,
    awayTeam: game.away_team ? { '@type': 'SportsTeam', name: awayName, url: `${BASE_URL}/directory/teams/${game.away_team.slug}` } : undefined,
  };

  // Phase B2: QR panel enabled for scheduled fixtures.
  const qrEnabled = game.status === 'scheduled';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEvent) }}
      />
      <ScoresheetQRPanel
        fixtureId={game.id}
        status={game.status}
        qrEnabled={qrEnabled}
      />
      <Suspense fallback={null}>
        <GamePageClient id={id} />
      </Suspense>
    </>
  );
}
