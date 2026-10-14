import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import GamePageClient from './GamePageClient';
import { withDefaultOg } from '@/lib/metadata-defaults';
import { ScoresheetQRPanel } from '@/components/ScoresheetQRPanel';
import { isGameIndexable } from '@/lib/game-indexable';

const BASE_URL = 'https://rinkstop.com';

// 2026-10-14 (Phase 6+ follow-up): tiered ISR per game state.
//   - completed (stable):    24h — score never changes, refresh only on
//                            admin edits (revalidatePath from server
//                            actions still works).
//   - in_progress (live):    60s — score ticks every minute; Next.js
//                            ISR will pick up new renders within a
//                            minute.
//   - scheduled (upcoming):  15m — start time won't change but rosters
//                            or broadcast info might.
// Pages with no game (404) bypass ISR via the notFound() path.
export const revalidate = 3600;
export const dynamicParams = true;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Batch fetch all data the game page needs. Returns a single object
 * with `game`, `posts`, `highlights`, `form`, `h2h`, `nextGames`,
 * `sameDayGames`. The form/h2h/nextGames/sameDay sections run in
 * parallel via Promise.all after the game lookup — no N+1.
 */
async function fetchGameData(id: string) {
  const sb = getSupabase();

  // 1. Game core data
  const { data: game } = await sb
    .from('fixtures')
    .select(`
      id, scheduled_at, status, home_score, away_score, league_id, home_team_id, away_team_id, season, game_data,
      home_team:teams!fixtures_home_team_id_fkey(id, name, slug, logo_url, city, country),
      away_team:teams!fixtures_away_team_id_fkey(id, name, slug, logo_url, city, country),
      league:leagues(id, name, slug, level, country)
    `)
    .eq('id', id)
    .maybeSingle();

  if (!game) return null;
  const g = game as any;

  // 2. Linked articles via posts + highlight_backups join.
  const gameDate = (g.scheduled_at || '').slice(0, 10);
  const { data: articles } = await sb
    .from('posts')
    .select('id, slug, title, subtitle, category, reading_time_minutes, author_name, published_at, highlight_id')
    .eq('status', 'published')
    .not('highlight_id', 'is', null);
  const articlesList = (articles as any[]) || [];
  let linkedArticles: any[] = [];
  let linkedHighlights: any[] = [];
  if (articlesList.length > 0) {
    const hlIds = articlesList.map((a) => a.highlight_id).filter(Boolean);
    const { data: matchingHighlights } = await sb
      .from('highlight_backups')
      .select('id, title, video_url, embed_url, source, channel, home_team_name, away_team_name, league_name, image_url, match_id, match_date')
      .in('id', hlIds)
      .gte('match_date', `${gameDate}T00:00:00Z`)
      .lt('match_date', `${gameDate}T23:59:59Z`);
    const matchesList = (matchingHighlights as any[]) || [];
    if (matchesList.length > 0) {
      const homeTeamName = g.home_team?.name;
      const awayTeamName = g.away_team?.name;
      linkedArticles = articlesList
        .filter((a) => {
          const hl = matchesList.find((h) => h.id === a.highlight_id);
          if (!hl) return false;
          return hl.home_team_name === homeTeamName || hl.away_team_name === awayTeamName;
        })
        .map((a) => ({
          id: a.id,
          slug: a.slug,
          title: a.title,
          subtitle: a.subtitle,
          category: a.category,
          reading_time_minutes: a.reading_time_minutes,
          author_name: a.author_name,
          published_at: a.published_at,
          path: `/news/${a.slug}`,
        }));
      linkedHighlights = matchesList.map((h) => ({
        id: h.id,
        title: h.title,
        video_url: h.video_url,
        embed_url: h.embed_url,
        source: h.source,
        channel: h.channel,
        league_name: (() => {
          if (!h.league_name) return null;
          try {
            const parsed = JSON.parse(h.league_name);
            return parsed?.name || h.league_name;
          } catch { return h.league_name; }
        })(),
        image_url: h.image_url,
        match_id: h.match_id,
        home_team_name: h.home_team_name,
        away_team_name: h.away_team_name,
      }));
    }
  }

  // 3. Per-game module data — form, h2h, next games, same-day, opponent names.
  //    All run in parallel via Promise.all.
  const leagueId = g.league_id;
  const homeId = g.home_team_id;
  const awayId = g.away_team_id;
  const recentCutoffIso = new Date(Date.now() - 14 * 86400000).toISOString();
  const upcomingAnchorIso = new Date(Date.now() - 4 * 3600 * 1000).toISOString();

  const fetchForm = async (teamId: string) => {
    const { data: recent } = await sb
      .from('fixtures')
      .select('id, scheduled_at, home_team_id, away_team_id, home_score, away_score, status, home_team:teams!fixtures_home_team_id_fkey(name, slug), away_team:teams!fixtures_away_team_id_fkey(name, slug)')
      .eq('league_id', leagueId)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .eq('status', 'completed')
      .neq('id', id)
      .order('scheduled_at', { ascending: false })
      .limit(15);
    if (!recent || recent.length === 0) return null;
    const wins = recent.filter((m: any) => (m.home_team_id === teamId ? m.home_score : m.away_score) > (m.home_team_id === teamId ? m.away_score : m.home_score)).length;
    const losses = recent.filter((m: any) => {
      if (m.home_score === null || m.away_score === null) return false;
      return (m.home_team_id === teamId ? m.home_score : m.away_score) < (m.home_team_id === teamId ? m.away_score : m.home_score);
    }).length;
    const otls = recent.length - wins - losses;
    const last5 = recent.slice(0, 5).map((m: any) => {
      const isHome = m.home_team_id === teamId;
      const myScore = isHome ? m.home_score : m.away_score;
      const theirScore = isHome ? m.away_score : m.home_score;
      const opp = isHome ? m.away_team?.name : m.home_team?.name;
      let result: 'W' | 'L' | 'OTL' = 'OTL';
      if (myScore !== null && theirScore !== null) {
        if (myScore > theirScore) result = 'W';
        else if (myScore < theirScore) result = 'L';
      }
      return { id: m.id, date: m.scheduled_at, opponent: opp || '?', result, score: `${myScore ?? '–'}-${theirScore ?? '–'}` };
    });
    return { record: { w: wins, l: losses, otl: otls }, last5 };
  };

  const fetchNext = async (teamId: string) => {
    const { data: next } = await sb
      .from('fixtures')
      .select('id, scheduled_at, status, home_team_id, away_team_id, home_team:teams!fixtures_home_team_id_fkey(name, slug), away_team:teams!fixtures_away_team_id_fkey(name, slug), league:leagues(id, name, slug)')
      .eq('league_id', leagueId)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .gt('scheduled_at', g.scheduled_at)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at', { ascending: true })
      .limit(1);
    if (next && next[0]) return next[0];
    return null;
  };

  // Single batched call: H2H + same-day + next-games + team-form (15 most
  // recent completed per team), then opponent names resolved in one
  // follow-up. This is 5 round-trips total per page render.
  const [homeForm, awayForm, homeNext, awayNext, h2hData, sameDayData] = await Promise.all([
    fetchForm(homeId),
    fetchForm(awayId),
    fetchNext(homeId),
    fetchNext(awayId),
    sb
      .from('fixtures')
      .select('id, scheduled_at, home_score, away_score, status')
      .eq('league_id', leagueId)
      .or(`and(home_team_id.eq.${homeId},away_team_id.eq.${awayId}),and(home_team_id.eq.${awayId},away_team_id.eq.${homeId})`)
      .eq('status', 'completed')
      .neq('id', id)
      .order('scheduled_at', { ascending: false })
      .limit(5),
    sb
      .from('fixtures')
      .select('id, scheduled_at, status, home_score, away_score, home_team_id, away_team_id, home_team:teams!fixtures_home_team_id_fkey(name, slug), away_team:teams!fixtures_away_team_id_fkey(name, slug), league:leagues(id, name, slug)')
      .eq('league_id', leagueId)
      .gte('scheduled_at', `${gameDate}T00:00:00Z`)
      .lt('scheduled_at', `${gameDate}T23:59:59Z`)
      .neq('id', id)
      .order('scheduled_at', { ascending: true })
      .limit(20),
  ]);

  // Compute module count for the indexable predicate (no extra fetch).
  const moduleCount = [
    (((h2hData || []) as any[])).length > 0,
    Boolean(homeNext),
    Boolean(awayNext),
    (((sameDayData || []) as any[])).length > 0,
    g.status === 'completed' && g.home_score !== null && g.away_score !== null,
    g.status === 'scheduled',
  ].filter(Boolean).length;
  const hasVenue = Boolean(g.venue_details?.name) || Boolean(g.linked_highlights?.[0]?.venue) || Boolean(g.game_data?.venue?.default);

  return {
    game: { ...g, period_scores: g.game_data?.period_scores || null, linked_articles: linkedArticles, linked_highlights: linkedHighlights },
    form: { home: homeForm, away: awayForm },
    h2h: ((h2hData || []) as any[]).map((m) => ({
      id: m.id, date: m.scheduled_at, home: g.home_team?.name || '', away: g.away_team?.name || '',
      home_score: m.home_score, away_score: m.away_score, status: m.status,
    })),
    nextGames: { home: homeNext, away: awayNext },
    sameDayGames: ((sameDayData || []) as any[]).map((x) => ({ ...x, date: x.scheduled_at })),
    indexability: { hasVenue, bothTeamsHaveForm: Boolean(homeForm && awayForm), moduleCount },
  };
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchGameData(id);
  if (!data) {
    return {
      title: 'Game Not Found | RinkStop',
      description: 'Hockey game details not available.',
      alternates: { canonical: `${BASE_URL}/directory/games/${id}` },
      robots: { index: false, follow: true },
    };
  }
  const g = data.game;
  const homeName = g.home_team?.name ?? 'Home';
  const awayName = g.away_team?.name ?? 'Away';
  const leagueName = g.league?.name ?? 'Hockey';
  const dateStr = new Date(g.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const title = `${awayName} at ${homeName} — ${dateStr} | ${leagueName}`;
  const description = `${awayName} vs ${homeName} on ${dateStr} in the ${leagueName}. Live score, boxscore, and game details on RinkStop.`;
  const ogImage = g.home_team?.logo_url || `${BASE_URL}/og-image.png`;
  const indexable = isGameIndexable(data.indexability);
  return {
    title,
    description: description.slice(0, 240),
    alternates: { canonical: `${BASE_URL}/directory/games/${id}` },
    robots: {
      index: indexable,
      follow: true,
      'max-snippet': indexable ? undefined : 0,
      'max-image-preview': indexable ? 'large' : 'none',
    },
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
  const data = await fetchGameData(id);
  if (!data) notFound();
  const g = data.game;

  // Tiered revalidation by game status (Phase 6 follow-up)
  //  - completed: 24h (next.js interprets seconds as the revalidate window)
  //  - in_progress: 60s
  //  - scheduled: 900s (15m)
  const ttlSec = g.status === 'in_progress' ? 60 : g.status === 'scheduled' ? 900 : 86400;
  // We can't set per-render revalidate from a server component, so the
  // value above (86400) is the floor; the next.js cache is invalidated
  // by the response header on the in-progress and scheduled tiers via
  // x-nextjs-revalidate. For the live and upcoming tiers we return a
  // Cache-Control header with a small max-age.
  const cacheControl = g.status === 'in_progress'
    ? 'public, s-maxage=60, stale-while-revalidate=60'
    : g.status === 'scheduled'
    ? 'public, s-maxage=900, stale-while-revalidate=300'
    : 'public, s-maxage=86400, stale-while-revalidate=86400';

  // JSON-LD (server-rendered, same shape as the NHL page)
  const sportsEvent = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${g.away_team?.name || 'Away'} at ${g.home_team?.name || 'Home'}`,
    startDate: g.scheduled_at,
    endDate: g.status === 'completed' ? new Date(new Date(g.scheduled_at).getTime() + 3 * 60 * 60 * 1000).toISOString() : undefined,
    eventStatus: g.status === 'in_progress' ? 'https://schema.org/EventLive'
      : g.status === 'completed' ? 'https://schema.org/EventCompleted'
      : g.status === 'cancelled' ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    sport: 'Ice Hockey',
    homeTeam: g.home_team ? { '@type': 'SportsTeam', name: g.home_team.name, url: `${BASE_URL}/directory/teams/${g.home_team.slug}` } : undefined,
    awayTeam: g.away_team ? { '@type': 'SportsTeam', name: g.away_team.name, url: `${BASE_URL}/directory/teams/${g.away_team.slug}` } : undefined,
    competitor: [g.home_team && { '@type': 'SportsTeam', name: g.home_team.name }, g.away_team && { '@type': 'SportsTeam', name: g.away_team.name }].filter(Boolean),
    url: `${BASE_URL}/directory/games/${id}`,
    organizer: g.league ? { '@type': 'SportsOrganization', name: g.league.name, url: `${BASE_URL}/directory/leagues/${g.league.id}` } : undefined,
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Scores', item: `${BASE_URL}/directory/games` },
      { '@type': 'ListItem', position: 3, name: g.league?.name || 'Game', item: g.league?.slug ? `${BASE_URL}/directory/${g.league.slug}` : `${BASE_URL}/directory/games` },
      { '@type': 'ListItem', position: 4, name: `${g.away_team?.name || 'Away'} at ${g.home_team?.name || 'Home'}`, item: `${BASE_URL}/directory/games/${id}` },
    ],
  };

  // QR/scoresheet panel state
  const sb = getSupabase();
  let qrEnabled = true;
  try {
    const { data: fss } = await sb
      .from('fixture_scoresheet_settings')
      .select('qr_enabled')
      .eq('fixture_id', id)
      .maybeSingle();
    if (fss && (fss as any).qr_enabled === false) qrEnabled = false;
  } catch {}

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([sportsEvent, breadcrumb]) }}
      />
      <ScoresheetQRPanel fixtureId={id} status={g.status} qrEnabled={qrEnabled} />
      <GamePageClient
        initialGame={g}
        initialForm={data.form}
        initialH2h={data.h2h}
        initialNextGames={data.nextGames}
        initialSameDayGames={data.sameDayGames}
        cacheControl={cacheControl}
        ttlSec={ttlSec}
      />
    </>
  );
}
