'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import ShareButton from '@/components/ShareButton';
import { type SharePayload } from '@/lib/share';
import { formatGameTime, timezoneForGame, disclaimerText } from '@/lib/game-time';
import { displayNameForGame, historicalAliasLabel } from '@/lib/franchise-name-lookup';

const BASE_URL = 'https://rinkstop.com';

interface Game {
  id: string;
  date: string;
  status: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  scheduled_at: string;
  home_team: { name: string; logo_url: string | null; slug: string } | null;
  away_team: { name: string; logo_url: string | null; slug: string } | null;
  league: { id: string; name: string; slug: string; level?: string; country?: string } | null;
  venue_details: any;
  period_scores: any;
  linked_articles?: Array<{
    id: string;
    slug: string;
    title: string;
    subtitle?: string;
    category?: string;
    reading_time_minutes?: number;
    author_name?: string;
    published_at?: string;
    path: string;
  }>;
  linked_highlights?: Array<{
    id: number;
    title: string;
    video_url: string;
    embed_url?: string | null;
    source?: string;
    channel?: string | null;
    league_name?: string;
    image_url?: string | null;
    home_team_name?: string;
    away_team_name?: string;
  }>;
}

interface Boxscore {
  source: string;
  leagueName?: string;
  gameInfo?: any;
  teamStats?: any;
  goals?: any[];
  goalies?: any;
  playerStats?: any;
  periodScores?: { first?: number[]; second?: number[]; third?: number[]; overtime?: number[]; shootout?: number[] };
  scoreDiscrepancy?: { home: { db: number; hl: number }; away: { db: number; hl: number } };
}

const statusStyle: Record<string, { color: string; label: string }> = {
  scheduled: { color: 'rgba(255,255,255,0.4)', label: 'Scheduled' },
  in_progress: { color: '#00d4ff', label: 'In Progress' },
  completed: { color: '#34d399', label: 'Completed' },
  cancelled: { color: '#C8102E', label: 'Cancelled' },
  postponed: { color: '#fbbf24', label: 'Postponed' },
};

function formatDate(d: string, timezone: string) {
  return formatGameTime(d, timezone);
}

/**
 * 2026-10-14 (Phase 6): <head> meta control for thin game pages.
 * We can't use Next.js's metadata API because the page is a client
 * component and the form/h2h/next-games data arrives after mount.
 * So we set/remove a robots meta tag at runtime.
 *
 * Rule (matches the user's spec): noindex unless the page has
 *   - both teams' form data AND
 *   - at least 3 of the data-driven modules populated AND
 *   - (a venue OR a successful status, which we count as a "real"
 *     game record, not just a placeholder).
 */
function ThinPageNoindex({ hasVenue, bothTeamsHaveForm, moduleCount, gameId }: { hasVenue: boolean; bothTeamsHaveForm: boolean; moduleCount: number; gameId: string }): null {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isThin = !(bothTeamsHaveForm && moduleCount >= 3 && hasVenue);
    let tag = document.querySelector('meta[name="robots"][data-rs-thin]') as HTMLMetaElement | null;
    if (isThin) {
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'robots');
        tag.setAttribute('data-rs-thin', '1');
        tag.setAttribute('content', 'noindex,follow');
        document.head.appendChild(tag);
      } else {
        tag.setAttribute('content', 'noindex,follow');
      }
    } else if (tag) {
      tag.remove();
    }
  }, [hasVenue, bothTeamsHaveForm, moduleCount, gameId]);
  return null;
}

function periodLabel(period: number, periodDescriptor: any): string {
  if (!period) return '';
  if (period === 1) return '1st';
  if (period === 2) return '2nd';
  if (period === 3) return '3rd';
  if (period > 3) {
    const otNum = period - 3;
    if (periodDescriptor?.periodType === 'SO') return 'SO';
    return otNum === 1 ? 'OT' : `${otNum}OT`;
  }
  return String(period);
}

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boxscore, setBoxscore] = useState<Boxscore | null>(null);
  const [boxLoading, setBoxLoading] = useState(false);

  // 2026-10-05 fix (Arnel 404 on game detail): the original useEffect
  // called /api/game/${gameId} which returns HTTP 500 on Vercel (the
  // /api/* surface is broken). The catch set error='HTTP 500' and the
  // page rendered 'Game Not Found' even though the row existed in
  // fixtures. Query Supabase directly from the client instead.
  const sbRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!sbRef.current) {
    sbRef.current = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
  }

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    (async () => {
      try {
        const sb = sbRef.current!;
        // 1. Game core data
        const { data: g, error: gErr } = await sb
          .from('fixtures')
          .select(`id, scheduled_at, status, home_score, away_score, league_id, home_team_id, away_team_id, season, game_data, home_team:teams!home_team_id(id, name, slug, logo_url, city, country), away_team:teams!away_team_id(id, name, slug, logo_url, city, country), league:leagues!fixtures_league_id_fkey(id, name, slug, level, country)`)
          .eq('id', gameId)
          .maybeSingle();
        if (cancelled) return;
        if (gErr) { setLoading(false); setError(gErr.message); return; }
        if (!g) { setLoading(false); return; }

        // 2. Linked articles via posts + highlight_backups join.
        // Mirrors the old /api/game/[id] route: find published articles
        // linked to highlights that match this game's teams + date.
        const gameDate = ((g as any).scheduled_at || '').slice(0, 10);
        let linkedArticles: any[] = [];
        let linkedHighlights: any[] = [];
        try {
          const { data: articles } = await sb
            .from('posts')
            .select('id, slug, title, subtitle, category, reading_time_minutes, author_name, published_at, highlight_id')
            .eq('status', 'published')
            .not('highlight_id', 'is', null);
          const articlesList = (articles as any[] | null) || [];
          if (articlesList.length > 0) {
            const hlIds = articlesList.map((a: any) => a.highlight_id).filter(Boolean);
            const { data: matchingHighlights } = await sb
              .from('highlight_backups')
              .select('id, title, video_url, embed_url, source, channel, home_team_name, away_team_name, league_name, image_url, match_id, match_date')
              .in('id', hlIds)
              .gte('match_date', `${gameDate}T00:00:00Z`)
              .lt('match_date', `${gameDate}T23:59:59Z`);
            const matchesList = (matchingHighlights as any[] | null) || [];
            if (matchesList.length > 0) {
              const hlMap = new Map(matchesList.map((h: any) => [h.id, h]));
              const homeTeamName = ((g as any).home_team as any)?.name;
              const awayTeamName = ((g as any).away_team as any)?.name;
              linkedArticles = articlesList
                .filter((a: any) => {
                  const hl = hlMap.get(a.highlight_id);
                  if (!hl) return false;
                  return hl.home_team_name === homeTeamName || hl.away_team_name === awayTeamName;
                })
                .map((a: any) => ({
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
              linkedHighlights = matchesList.map((h: any) => ({
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
        } catch {}

        if (cancelled) return;
        const merged = {
          ...(g as any),
          period_scores: (g as any).game_data?.period_scores || null,
          linked_articles: linkedArticles,
          linked_highlights: linkedHighlights,
        };
        setGame(merged as Game);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setLoading(false);
        setError(e?.message || String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [gameId]);

  // Boxscore: /api/game/[id]/boxscore is also /api/* and returns 500.
  // 2026-10-05: boxscore data is embedded in fixtures.game_data.period_scores
  // (from the Highlightly ingest). The /api route just unwraps it. Render
  // from the game state directly, no extra fetch needed.
  useEffect(() => {
    if (!game) { setBoxLoading(false); return; }
    if (game.status !== 'completed' || game.home_score == null || game.away_score == null) {
      setBoxLoading(false);
      return;
    }
    setBoxLoading(true);
    const ps = (game as any).period_scores;
    if (ps && (Array.isArray(ps.first) || Array.isArray(ps.second) || Array.isArray(ps.third))) {
      setBoxscore({
        source: 'highlightly',
        periodScores: ps,
      } as Boxscore);
    }
    setBoxLoading(false);
  }, [game]);

  // 2026-10-14 (Arnel directive): replace the dead-end
  // "Detailed box score on the league's official site" block with
  // data-driven modules: each team's record + last 5, head-to-head
  // this season, each team's next game, same-day games, an auto
  // recap, and a countdown/Add-to-calendar for upcoming games. Each
  // module is independent — if its query returns 0 rows we render
  // nothing for that module instead of an empty card.
  const [teamForm, setTeamForm] = useState<{
    home: { record: { w: number; l: number; otl: number }; last5: Array<{ id: string; date: string; opponent: string; result: 'W' | 'L' | 'OTL'; score: string }> } | null;
    away: { record: { w: number; l: number; otl: number }; last5: Array<{ id: string; date: string; opponent: string; result: 'W' | 'L' | 'OTL'; score: string }> } | null;
  }>({ home: null, away: null });
  const [h2h, setH2h] = useState<Array<{ id: string; date: string; home: string; away: string; home_score: number | null; away_score: number | null; status: string }>>([]);
  const [nextGames, setNextGames] = useState<{ home: Game | null; away: Game | null }>({ home: null, away: null });
  const [sameDayGames, setSameDayGames] = useState<Array<Game>>([]);

  useEffect(() => {
    if (!game) return;
    const sb = sbRef.current!;
    const leagueId = game.league?.id;
    const homeId = game.home_team_id;
    const awayId = game.away_team_id;
    const gameDate = (game.scheduled_at || game.date || '').slice(0, 10);
    if (!leagueId || !homeId || !awayId) return;

    let cancelled = false;
    (async () => {
      // Team form helper: last 15 completed games for a team, then
      // derive W-L-OTL + last 5.
      const fetchForm = async (teamId: string) => {
        const { data: recent } = await sb
          .from('fixtures')
          .select('id, scheduled_at, home_team_id, away_team_id, home_score, away_score, status, home_team:teams!home_team_id(name, slug), away_team:teams!away_team_id(name, slug)')
          .eq('league_id', leagueId)
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .eq('status', 'completed')
          .neq('id', gameId)
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

      // H2H this season — same matchup, completed only, last 5 of them
      const { data: h2hData } = await sb
        .from('fixtures')
        .select('id, scheduled_at, home_score, away_score, status')
        .eq('league_id', leagueId)
        .or(`and(home_team_id.eq.${homeId},away_team_id.eq.${awayId}),and(home_team_id.eq.${awayId},away_team_id.eq.${homeId})`)
        .eq('status', 'completed')
        .neq('id', gameId)
        .order('scheduled_at', { ascending: false })
        .limit(5);

      // Each team's next game (first scheduled after the current game)
      const fetchNext = async (teamId: string) => {
        const { data: next } = await sb
          .from('fixtures')
          .select('id, scheduled_at, status, home_team_id, away_team_id, home_team:teams!home_team_id(name, slug), away_team:teams!away_team_id(name, slug), league:leagues(id, name, slug)')
          .eq('league_id', leagueId)
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .gt('scheduled_at', game.scheduled_at)
          .in('status', ['scheduled', 'in_progress'])
          .order('scheduled_at', { ascending: true })
          .limit(1);
        if (next && next[0]) return next[0] as any as Game;
        return null;
      };

      // Same-day other games in this league
      const { data: sameDay } = await sb
        .from('fixtures')
        .select('id, scheduled_at, status, home_score, away_score, home_team_id, away_team_id, home_team:teams!home_team_id(name, slug), away_team:teams!away_team_id(name, slug), league:leagues(id, name, slug)')
        .eq('league_id', leagueId)
        .gte('scheduled_at', `${gameDate}T00:00:00Z`)
        .lt('scheduled_at', `${gameDate}T23:59:59Z`)
        .neq('id', gameId)
        .order('scheduled_at', { ascending: true })
        .limit(20);

      const [homeForm, awayForm, homeNext, awayNext] = await Promise.all([
        fetchForm(homeId),
        fetchForm(awayId),
        fetchNext(homeId),
        fetchNext(awayId),
      ]);

      if (cancelled) return;
      setTeamForm({ home: homeForm, away: awayForm });
      setH2h(((h2hData || []) as any[]).map(m => ({
        id: m.id, date: m.scheduled_at, home: m.home_team_id === homeId ? (game.home_team?.name || '') : (game.away_team?.name || ''),
        away: m.away_team_id === awayId ? (game.away_team?.name || '') : (game.home_team?.name || ''),
        home_score: m.home_score, away_score: m.away_score, status: m.status,
      })));
      setNextGames({ home: homeNext, away: awayNext });
      setSameDayGames(((sameDay || []) as any[]).map(g => ({ ...g, date: g.scheduled_at })) as Game[]);
    })();
    return () => { cancelled = true; };
  }, [game, gameId]);

  if (loading) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="skeleton" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 1rem' }} />
        <div className="skeleton" style={{ width: '200px', height: '24px', margin: '0 auto' }} />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div style={{ maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', padding: '4rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '1rem' }}>Game Not Found</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>This game doesn&apos;t exist or has been removed.</p>
        <Link href="/directory/games" style={{ color: '#C8102E', display: 'inline-block', marginTop: '1rem' }}>
          ← Back to Scores
        </Link>
      </div>
    );
  }

  const s = statusStyle[game.status] || statusStyle.scheduled;
  const homeName = game.home_team?.name || 'Home';
  const awayName = game.away_team?.name || 'Away';
  const tz = timezoneForGame({ leagueSlug: game.league?.slug, countryCode: game.league?.country });
  const homeSlug = game.home_team?.slug;
  const awaySlug = game.away_team?.slug;

  // Date-aware franchise name resolution — old Phoenix Coyotes games
  // show "Phoenix Coyotes" not "Utah Hockey Club" (Arnel 2026-10-05).
  const gameDate = game.scheduled_at;
  const homeDisplay = homeSlug ? displayNameForGame(homeSlug, gameDate) : null;
  const awayDisplay = awaySlug ? displayNameForGame(awaySlug, gameDate) : null;
  const homeRenderName = homeDisplay?.display || homeName;
  const awayRenderName = awayDisplay?.display || awayName;
  const homeAlias = homeDisplay ? historicalAliasLabel(homeSlug!, gameDate) : undefined;
  const awayAlias = awayDisplay ? historicalAliasLabel(awaySlug!, gameDate) : undefined;
  const homeChainLink = homeDisplay && homeDisplay.isHistorical ? `/directory/nhl/history#${homeDisplay.currentSlug}` : null;
  const awayChainLink = awayDisplay && awayDisplay.isHistorical ? `/directory/nhl/history#${awayDisplay.currentSlug}` : null;

  // Determine winner for completed games
  const isCompleted = game.status === 'completed' && game.home_score !== null && game.away_score !== null;
  const homeWin = isCompleted && game.home_score! > game.away_score!;
  const awayWin = isCompleted && game.away_score! > game.home_score!;
  const isTie = isCompleted && game.home_score === game.away_score;

  return (
    <div style={{ maxWidth: '900px', marginLeft: 'auto', marginRight: 'auto', padding: '2rem 1rem' }}>
      {/* 2026-10-14 (Phase 6): noindex on thin game pages. Per the
          user's spec, an indexable game page must have:
          - a venue OR a successful status
          - form data for BOTH teams (last 5)
          - at least 3 of the data-driven modules populated
            (h2h, next game each side, same-day, auto recap,
            countdown, add-to-calendar)
          If any of those is missing, drop noindex. We check on the
          client because some of the data (form, h2h, next games)
          is fetched after mount. Use useEffect to flip the meta
          tag once the data is in. */}
      <ThinPageNoindex
        hasVenue={Boolean((game as any).venue_details?.name) || Boolean((game as any).linked_highlights?.[0]?.venue)}
        bothTeamsHaveForm={Boolean(teamForm.home && teamForm.away)}
        moduleCount={[
          h2h.length > 0,
          Boolean(nextGames.home),
          Boolean(nextGames.away),
          sameDayGames.length > 0,
          isCompleted,
          game.status === 'scheduled',
        ].filter(Boolean).length}
        gameId={game.id}
      />
      {/* 2026-10-14 (Phase 6): SportsEvent + BreadcrumbList JSON-LD.
          SportsEvent includes name, startDate (with offset), home/away
          teams, eventStatus, and an optional score string. Breadcrumb
          mirrors the visible nav above. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com/' },
                { '@type': 'ListItem', position: 2, name: 'Scores', item: 'https://rinkstop.com/directory/games' },
                { '@type': 'ListItem', position: 3, name: game.league?.name || 'Game', item: game.league?.slug ? `https://rinkstop.com/directory/${game.league.slug}` : 'https://rinkstop.com/directory/games' },
                { '@type': 'ListItem', position: 4, name: `${awayRenderName} at ${homeRenderName}`, item: `https://rinkstop.com/directory/games/${game.id}` },
              ],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'SportsEvent',
              name: `${awayRenderName} at ${homeRenderName}`,
              startDate: game.scheduled_at || game.date,
              url: `https://rinkstop.com/directory/games/${game.id}`,
              eventStatus: game.status === 'completed'
                ? 'https://schema.org/EventCompleted'
                : game.status === 'in_progress'
                  ? 'https://schema.org/EventLive'
                  : game.status === 'cancelled'
                    ? 'https://schema.org/EventCancelled'
                    : 'https://schema.org/EventScheduled',
              eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
              sport: 'Ice Hockey',
              homeTeam: {
                '@type': 'SportsTeam',
                name: homeRenderName,
                ...(homeSlug ? { url: `https://rinkstop.com/directory/teams/${homeSlug}` } : {}),
              },
              awayTeam: {
                '@type': 'SportsTeam',
                name: awayRenderName,
                ...(awaySlug ? { url: `https://rinkstop.com/directory/teams/${awaySlug}` } : {}),
              },
              ...(isCompleted ? {
                description: `Final: ${awayRenderName} ${game.away_score}–${game.home_score} ${homeRenderName}.`,
              } : {}),
            },
          ]),
        }}
      />
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }} aria-label="Breadcrumb">
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/games" style={{ color: 'rgba(255,255,255,0.4)' }}>Scores</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{awayName} @ {homeName}</span>
      </nav>

      {/* Game Header */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>
          {formatDate(game.scheduled_at || game.date, tz)}
          {game.scheduled_at && (
            <span style={{ display: 'block', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.375rem', fontStyle: 'italic' }}>
              {disclaimerText(tz, 'compact')}
            </span>
          )}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            {awaySlug ? (
              <Link href={`/directory/teams/${awaySlug}`} style={{ textDecoration: 'none' }}>
                {game.away_team?.logo_url && (
                  <img src={game.away_team.logo_url} alt={`${awayRenderName} logo`} style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '0.5rem' }} />
                )}
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: awayWin ? '#34d399' : '#fff' }}>{awayRenderName}</p>
                {awayAlias && awayChainLink && (
                  <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    <Link href={awayChainLink} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
                      {awayAlias}
                    </Link>
                  </p>
                )}
              </Link>
            ) : (
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: awayWin ? '#34d399' : '#fff' }}>{awayRenderName}</p>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: awayWin ? '#34d399' : (game.away_score !== null ? '#fff' : '#555') }}>
                {game.away_score ?? '-'}
              </span>
              <span style={{ color: '#333', fontSize: '1.25rem' }}>@</span>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: homeWin ? '#34d399' : (game.home_score !== null ? '#fff' : '#555') }}>
                {game.home_score ?? '-'}
              </span>
            </div>
            <span style={{
              display: 'inline-block',
              marginTop: '0.75rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '99px',
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: s.color,
              border: `1px solid ${s.color}40`,
            }}>
              {s.label}{isCompleted && !isTie ? (homeWin ? ' · Home Win' : ' · Away Win') : ''}
            </span>
          </div>

          <div style={{ textAlign: 'center' }}>
            {homeSlug ? (
              <Link href={`/directory/teams/${homeSlug}`} style={{ textDecoration: 'none' }}>
                {game.home_team?.logo_url && (
                  <img src={game.home_team.logo_url} alt={`${homeRenderName} logo`} style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '0.5rem' }} />
                )}
                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: homeWin ? '#34d399' : '#fff' }}>{homeRenderName}</p>
                {homeAlias && homeChainLink && (
                  <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    <Link href={homeChainLink} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
                      {homeAlias}
                    </Link>
                  </p>
                )}
              </Link>
            ) : (
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: homeWin ? '#34d399' : '#fff' }}>{homeRenderName}</p>
            )}
          </div>
        </div>

        {game.league?.name && (
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>{game.league.name}</p>
        )}
        {boxscore?.gameInfo?.venue && (
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.25rem' }}>@{boxscore.gameInfo.venue}</p>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <ShareButton
            payload={{
              title: `${awayName} at ${homeName} — RinkStop`,
              text: isCompleted ? `${awayName} at ${homeName} — Final ${game.away_score}-${game.home_score}.` : `${awayName} at ${homeName} on RinkStop.`,
              url: `${typeof window !== 'undefined' ? window.location.origin : 'https://rinkstop.com'}/directory/games/${game.id}`,
            } satisfies SharePayload}
            variant="brand"
          />
        </div>

        {/* Quick links — give the user one tap to the team pages and the
            league page. Competitors (ESPN, NHL.com) all have this on
            the game detail. Without it the user has to navigate back
            to find the teams again. */}
        <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
          {game.home_team?.slug && (
            <Link
              href={`/directory/teams/${game.home_team.slug}`}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '99px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
                textDecoration: 'none',
              }}
            >
              {homeName} →
            </Link>
          )}
          {game.away_team?.slug && (
            <Link
              href={`/directory/teams/${game.away_team.slug}`}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '99px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
                textDecoration: 'none',
              }}
            >
              {awayName} →
            </Link>
          )}
          {game.league?.slug && (
            <Link
              href={`/directory/leagues/${game.league.slug}`}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(200,16,46,0.15)',
                border: '1px solid rgba(200,16,46,0.4)',
                borderRadius: '99px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              {game.league.name} →
            </Link>
          )}
        </div>
      </div>

      {/* Period Scores — prefer game.period_scores (DB-stored from HL ingest),
          fall back to boxscore.periodScores (live HL fetch) when null.
          Per Arnel 2026-09-22 02:49 CDT: enhance scores pages to include
          actual information rather than 'see the league's site'. */}
      {(() => {
        const ps = (game.period_scores && game.period_scores.length > 0)
          ? game.period_scores.map((p: any) => ({ period: p.period, home: p.home, away: p.away }))
          : (boxscore?.periodScores ? [
              { period: 'P1', home: boxscore.periodScores.first?.[0], away: boxscore.periodScores.first?.[1] },
              { period: 'P2', home: boxscore.periodScores.second?.[0], away: boxscore.periodScores.second?.[1] },
              { period: 'P3', home: boxscore.periodScores.third?.[0], away: boxscore.periodScores.third?.[1] },
              { period: 'OT', home: boxscore.periodScores.overtime?.[0], away: boxscore.periodScores.overtime?.[1] },
              { period: 'SO', home: boxscore.periodScores.shootout?.[0], away: boxscore.periodScores.shootout?.[1] },
            ].filter((p) => p.home != null && p.away != null) : []);
        if (ps.length === 0) return null;
        return (
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Period Scores</h3>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {ps.map((p: any, i: number) => (
                <div key={i} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', textAlign: 'center', minWidth: '70px' }}>
                  <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>{p.period || periodLabel(i + 1, boxscore?.gameInfo?.periodDescriptor)}</p>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{p.home} - {p.away}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Three Stars (NHL) */}
      {boxscore?.gameInfo?.threeStars && boxscore.gameInfo.threeStars.length > 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Three Stars</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {boxscore.gameInfo.threeStars.map((s: any, i: number) => (
              <div key={i} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.875rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem', color: i === 0 ? '#FFB81C' : (i === 1 ? '#C0C0C0' : '#CD7F32') }}>
                  {i === 0 ? '⭐' : i === 1 ? '★' : '☆'}
                </div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{s.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{s.teamAbbrev}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals (NHL) */}
      {boxscore?.goals && boxscore.goals.length > 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Goals</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {boxscore.goals.map((g: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', paddingBottom: '0.75rem', borderBottom: i < boxscore.goals.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ minWidth: '60px', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                  <div>{periodLabel(g.period, g.periodDescriptor)}</div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{g.timeInPeriod}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>
                    {g.scorer.name} <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>({g.scorer.total})</span>
                  </p>
                  {(g.assist1 || g.assist2) && (
                    <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)' }}>
                      Assists: {[g.assist1, g.assist2].filter(Boolean).map((a: any) => `${a.name} (${a.total})`).join(', ')}
                    </p>
                  )}
                  {g.shotType && (
                    <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.25rem' }}>{g.shotType}</p>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                  {g.awayScore}-{g.homeScore}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Stats — Shots on Goal */}
      {boxscore?.teamStats && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Shots on Goal</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{boxscore.teamStats.away?.sog ?? '-'}</p>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>SOG</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{boxscore.teamStats.home?.sog ?? '-'}</p>
          </div>
        </div>
      )}

      {/* Goalie Decisions (NHL) */}
      {boxscore?.goalies && (boxscore.goalies.home || boxscore.goalies.away) && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Goalies</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Away</p>
              {boxscore.goalies.away ? (
                <div>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{boxscore.goalies.away.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {boxscore.goalies.away.saves}/{boxscore.goalies.away.shotsAgainst} · {boxscore.goalies.away.savePct} SV% · {boxscore.goalies.away.toi}
                  </p>
                </div>
              ) : <p style={{ color: 'rgba(255,255,255,0.4)' }}>—</p>}
            </div>
            <div>
              <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Home</p>
              {boxscore.goalies.home ? (
                <div>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{boxscore.goalies.home.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {boxscore.goalies.home.saves}/{boxscore.goalies.home.shotsAgainst} · {boxscore.goalies.home.savePct} SV% · {boxscore.goalies.home.toi}
                  </p>
                </div>
              ) : <p style={{ color: 'rgba(255,255,255,0.4)' }}>—</p>}
            </div>
          </div>
        </div>
      )}

      {/* Top Skater Stats (NHL) — top 5 by points per team */}
      {boxscore?.playerStats && (boxscore.playerStats.home.forwards.length > 0 || boxscore.playerStats.away.forwards.length > 0) && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Top Skaters</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {[{
              label: 'Away', players: boxscore.playerStats.away.forwards.concat(boxscore.playerStats.away.defense).sort((a: any, b: any) => b.points - a.points).slice(0, 5),
            }, {
              label: 'Home', players: boxscore.playerStats.home.forwards.concat(boxscore.playerStats.home.defense).sort((a: any, b: any) => b.points - a.points).slice(0, 5),
            }].map((g: any) => (
              <div key={g.label}>
                <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{g.label}</p>
                {g.players.map((p: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#fff' }}>{p.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{p.goals}-{p.assists} · {p.plusMinus > 0 ? '+' : ''}{p.plusMinus}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2026-10-14 (Arnel directive): replaced the dead-end
          "Detailed box score on the league's official site" block
          with a series of data-driven modules. Each module renders
          only if it has data — no empty cards. Module order matches
          the user's spec: team form, h2h, next games, same-day,
          auto recap, then countdown/calendar for upcoming games. */}

      {/* Auto recap — one line, factual. Only for completed games
          that have scores. */}
      {isCompleted && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <p style={{ color: '#fff', fontSize: '0.9375rem', margin: 0 }}>
            {(() => {
              if (isTie) return `Final: ${awayRenderName} ${game.away_score}–${game.home_score} ${homeRenderName}.`;
              if (homeWin) return `${homeRenderName} won ${game.home_score}–${game.away_score} over ${awayRenderName}.`;
              if (awayWin) return `${awayRenderName} won ${game.away_score}–${game.home_score} at ${homeRenderName}.`;
              return `Final: ${awayRenderName} ${game.away_score}–${game.home_score} ${homeRenderName}.`;
            })()}
          </p>
        </div>
      )}

      {/* Upcoming-game modules: countdown + add to calendar. We
          build a minimal .ics file inline so no server work needed. */}
      {game.status === 'scheduled' && (() => {
        const dt = new Date(game.scheduled_at);
        const startUtc = dt.toISOString().replace(/[-:]|\.\d{3}/g, '');
        const endDt = new Date(dt.getTime() + 2.5 * 3600 * 1000);
        const endUtc = endDt.toISOString().replace(/[-:]|\.\d{3}/g, '');
        const ics = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//RinkStop//Game//EN',
          'BEGIN:VEVENT',
          `UID:rs-${game.id}@rinkstop.com`,
          `DTSTAMP:${startUtc}`,
          `DTSTART:${startUtc}`,
          `DTEND:${endUtc}`,
          `SUMMARY:${awayRenderName} at ${homeRenderName}`,
          `DESCRIPTION:${game.league?.name || 'Hockey'} game on RinkStop — https://rinkstop.com/directory/games/${game.id}`,
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n');
        const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
        const ms = dt.getTime() - Date.now();
        const days = Math.max(0, Math.floor(ms / 86400000));
        const hours = Math.max(0, Math.floor((ms % 86400000) / 3600000));
        const mins = Math.max(0, Math.floor((ms % 3600000) / 60000));
        return (
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: 0 }}>Puck drop in</p>
              <p style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 800, margin: '0.25rem 0 0' }}>
                {days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
              </p>
            </div>
            <a
              href={icsHref}
              download={`rinkstop-${game.id}.ics`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: '#C8102E', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700 }}
            >
              Add to calendar
            </a>
          </div>
        );
      })()}

      {/* Each team's form: record + last 5 results, each result
          linking to the game page. Hide the whole module if we have
          no form data for either team. */}
      {(teamForm.home || teamForm.away) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          {([
            { label: awayRenderName, data: teamForm.away, slug: awaySlug },
            { label: homeRenderName, data: teamForm.home, slug: homeSlug },
          ] as const).map((side) => {
            if (!side.data) return null;
            const { record, last5 } = side.data;
            return (
              <div key={side.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: 0 }}>{side.label}</h3>
                  <div style={{ fontSize: '0.8125rem', color: '#fff', fontWeight: 700 }}>
                    <span style={{ color: '#34d399' }}>{record.w}W</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}> – </span>
                    <span style={{ color: '#f87171' }}>{record.l}L</span>
                    {record.otl > 0 && (
                      <>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}> – </span>
                        <span style={{ color: '#FFB81C' }}>{record.otl}OTL</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {last5.map((r) => (
                    <Link
                      key={r.id}
                      href={`/directory/games/${r.id}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', textDecoration: 'none', color: 'inherit', fontSize: '0.8125rem' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          display: 'inline-block', width: '1.5rem', height: '1.5rem', lineHeight: '1.5rem',
                          textAlign: 'center', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                          background: r.result === 'W' ? 'rgba(52,211,153,0.2)' : r.result === 'L' ? 'rgba(248,113,113,0.2)' : 'rgba(255,184,28,0.2)',
                          color: r.result === 'W' ? '#34d399' : r.result === 'L' ? '#f87171' : '#FFB81C',
                        }}>{r.result}</span>
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{r.opponent}</span>
                      </span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{r.score}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Head-to-head this season (completed only). Hide if empty. */}
      {h2h.length > 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.75rem' }}>Head-to-head this season</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {h2h.map((m) => (
              <Link key={m.id} href={`/directory/games/${m.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', textDecoration: 'none', color: 'inherit', fontSize: '0.875rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>
                <span style={{ color: '#fff' }}>{m.away} @ {m.home}</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{m.away_score}–{m.home_score}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Each team's next game, linked. Hide if either side has none. */}
      {(nextGames.home || nextGames.away) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          {([
            { label: `${awayRenderName} next`, g: nextGames.away },
            { label: `${homeRenderName} next`, g: nextGames.home },
          ] as const).map((side) => {
            if (!side.g) return null;
            const ng = side.g;
            const ngHome = ng.home_team as any;
            const ngAway = ng.away_team as any;
            const ngLeague = ng.league as any;
            return (
              <Link
                key={ng.id}
                href={`/directory/games/${ng.id}`}
                style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem', textDecoration: 'none', color: 'inherit' }}
              >
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 0.5rem' }}>{side.label}</p>
                <p style={{ color: '#fff', fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>
                  {ngAway?.name || '?'} @ {ngHome?.name || '?'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>
                  {formatDate(ng.scheduled_at, tz)}
                </p>
                {ngLeague?.name && (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>{ngLeague.name}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Other [league] games on this day, linked. Hide if none. */}
      {sameDayGames.length > 0 && game.league?.name && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.75rem' }}>Other {game.league.name} games on this day</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {sameDayGames.map((m) => (
              <Link key={m.id} href={`/directory/games/${m.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', textDecoration: 'none', color: 'inherit', fontSize: '0.875rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem' }}>{new Date(m.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })}</span>
                <span style={{ color: '#fff' }}>{m.away_team?.name || '?'} @ {m.home_team?.name || '?'}</span>
                <span style={{ color: m.status === 'completed' ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                  {m.status === 'completed' ? `${m.away_score ?? '–'}–${m.home_score ?? '–'}` : 'Scheduled'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Standings mini-snippet: SKIPPED 2026-10-14. The site has
          no standings table — checked (standings / team_standings /
          league_standings all 0 rows). When we add a standings
          table, render a top-3 + around-this-team snippet here. */}

      {/* HL non-NHL games: show game state + venue (more useful than nothing)
          since HL doesn't expose goal events for KHL/SHL/DEL/etc. */}
      {boxscore?.source === 'highlightly' && boxscore?.gameInfo && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Game Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1.5rem', fontSize: '0.875rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Status</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{boxscore.gameInfo.gameState || '—'}</span>
            {boxscore.gameInfo.venue && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Venue</span>
                <span style={{ color: '#fff' }}>{boxscore.gameInfo.venue}{boxscore.gameInfo.venueLocation ? ` (${boxscore.gameInfo.venueLocation})` : ''}</span>
              </>
            )}
            {boxscore.leagueName && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Source</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Highlightly match API · {boxscore.leagueName}</span>
              </>
            )}
            {boxscore.scoreDiscrepancy && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Score note</span>
                <span style={{ color: '#FFB81C' }}>
                  DB has {boxscore.scoreDiscrepancy.home.db}-{boxscore.scoreDiscrepancy.away.db};
                  HL has {boxscore.scoreDiscrepancy.home.hl}-{boxscore.scoreDiscrepancy.away.hl}.
                  Showing HL value.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Companion articles (added 2026-09-21 per Arnel's cross-link directive) */}
      {game.linked_articles && game.linked_articles.length > 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
            Related Articles
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {game.linked_articles.map((a: any) => (
              <Link
                key={a.id}
                href={a.path}
                style={{
                  display: 'block',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: '#FFB81C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', fontWeight: 700 }}>
                  {a.category || 'Article'}
                  {a.reading_time_minutes ? ` · ${a.reading_time_minutes} min read` : ''}
                </div>
                <h3 style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.4rem' }}>
                  {a.title}
                </h3>
                {a.subtitle && (
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>
                    {a.subtitle}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Companion highlight videos (added 2026-09-21 per Arnel's cross-link directive) */}
      {game.linked_highlights && game.linked_highlights.length > 0 && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>
            Game Highlights
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {game.linked_highlights.map((h: any) => (
              <Link
                key={h.id}
                href={`/highlights/${h.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ flex: '0 0 auto', width: '40px', height: '40px', borderRadius: '50%', background: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <polygon points="5,3 19,12 5,21" fill="#fff" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, lineHeight: 1.3, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.title}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: '0.2rem 0 0 0' }}>
                    {(() => {
                      // 2026-09-22 per Arnel 07:57 CDT: highlight_backups.league_name
                      // is stored as a JSON object string in some rows. Parse defensively.
                      const ln = h.league_name;
                      if (!ln) return h.source || '';
                      try {
                        const parsed = JSON.parse(ln);
                        return parsed?.name || h.source || '';
                      } catch {
                        return ln;
                      }
                    })()} · {h.home_team_name} vs {h.away_team_name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <Link href="/directory/games" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>
          ← Back to All Scores
        </Link>
      </div>
    </div>
  );
}