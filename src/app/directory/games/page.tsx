import type { Metadata } from 'next';
import { Suspense } from 'react';
import GamesIndexClient from './GamesIndexClient';
import { withDefaultOg } from '@/lib/metadata-defaults';

const BASE_URL = 'https://rinkstop.com';

// PR #146 (2026-08-22) WS24 thin-content sweep: expand the /directory/games
// meta description so the index page clears the AdSense ~150-word
// threshold. Anchor pools: league chips (NHL, AHL, PWHL, KHL/SHL/Liiga/DEL/NL/
// Extraliga/NCAA/CHL/USHL), live/recent/historical time windows, and the
// always-rendered directory-context baseline.
const _gamesMetaLong = `Live scores, schedules, and results from hockey games worldwide — NHL, AHL, PWHL, KHL, SHL (Sweden), Liiga (Finland), DEL (Germany), National League (Switzerland), Czech Extraliga, NCAA hockey, CHL (WHL, OHL, QMJHL), and USHL. Filter by team or league, switch between Current (live and recent) and Historical (archived) matchups, and load more games as you scroll. Every score on this page links to the team profile and league directory so you can follow the teams and leagues you care about. RinkStop is the open hockey directory — every team, league, player, and rink in the world has a public profile page.`.trim();
export const metadata: Metadata = {
  // PR #150 (2026-08-23) WS25 GSC Bucket-1: previously pos 44.6 with 34
  // imps / 0 clicks. Title was keyword-rich but the H1 was SCORES &
  // FIXTURES — mismatch. Also rewrote the meta with current-time hook
  // (searchers want live scores, not archived) and league-anchored
  // keyword list to surface for both "hockey scores" and "hockey games
  // today" type queries.
  //
  // 2026-09-12 WS26 GSC CTR pass: added season year + games-today phrase.
  // Top queries: "what hockey games are on tonight", "hockey games today".
  // Old title missed the "today/tonight" hook; new version fronts it.
  title: 'Hockey Games Today (2026-27) — Live Scores, Schedule & Results',
  description: _gamesMetaLong.slice(0, 240),
  alternates: {
    canonical: 'https://rinkstop.com/directory/games',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: withDefaultOg({
    title: 'Hockey Games & Scores — NHL, AHL, PWHL, KHL, NCAA, CHL',
    description: _gamesMetaLong.slice(0, 240),
    url: 'https://rinkstop.com/directory/games',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Games & Scores — NHL, AHL, PWHL, KHL, NCAA, CHL',
    description: _gamesMetaLong.slice(0, 240),
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const dynamic = 'force-dynamic';

interface Game {
  id: string;
  date: string;
  status: string;
  scheduled_at: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { id: string; name: string; slug: string | null; logo_url: string | null } | null;
  away_team: { id: string; name: string; slug: string | null; logo_url: string | null } | null;
  league: { id: string; name: string; slug: string } | null;
}

interface ApiResponse {
  data: Game[];
  count: number;
  chip: string;
  time: string;
  from?: string | null;
  to?: string | null;
  hasMore: boolean;
}

type SearchParams = Promise<{
  league?: string;
  team?: string;
  time?: string;
  subleague?: string;
  q?: string;
  d?: string;
  w?: string;
}>;

// 2026-10-01 fix (Arnel feedback): when ?d= or ?w= is set on the URL,
// compute a from/to date range and pass it to /api/scores. Without this,
// the server's SSR was identical to the default 'current' view, so
// refreshing a deep link like /directory/games?d=2026-09-22 showed
// today's games instead of Sep 22's. The WeekCalendar strip + the new
// date-picker both navigate via d/w, so SSR must honor them too.
function computeDateRangeFromUrl(sp: { d?: string; w?: string }): { from: string | null; to: string | null } {
  const ET_TZ = 'America/New_York';
  const fmtIso = (d: Date): string => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: ET_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(d);
    return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}-${parts.find(p => p.type === 'day')!.value}`;
  };
  const todayIso = fmtIso(new Date());
  // Single-day selection wins over week window.
  if (sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d)) {
    return { from: sp.d, to: sp.d };
  }
  // Week window: centered on today, ±3 days. weekOffset shifts in
  // 7-day increments. weekOffset=0 (default) is today±3.
  // 2026-10-05 fix (Arnel feedback): the default view (no ?w= param
  // in the URL) should ALSO apply the current week window. Previously
  // it returned from/to=null, which fell through to time=current and
  // returned ALL upcoming games across all weeks — meaning the
  // rendered list didn't match the week strip's date cells.
  const weekOffset = parseInt(sp.w ?? '0', 10) || 0;
  if (sp.w !== undefined || weekOffset !== 0 || !sp.d) {
    // Build anchor as today midnight UTC, shift by weekOffset weeks.
    const anchor = new Date(`${todayIso}T12:00:00Z`);
    anchor.setUTCDate(anchor.getUTCDate() + weekOffset * 7);
    const from = new Date(anchor.getTime() - 3 * 86400000);
    const to = new Date(anchor.getTime() + 3 * 86400000);
    return { from: fmtIso(from), to: fmtIso(to) };
  }
  return { from: null, to: null };
}

async function fetchInitialGames(searchParams: Awaited<SearchParams>): Promise<{
  games: Game[];
  hasMore: boolean;
  totalShown: number;
  league: string;
  time: string;
  team: string;
  subleague: string;
  q: string;
  from: string | null;
  to: string | null;
  selectedDate: string;
  weekOffset: number;
}> {
  // 2026-10-05: Bypass /api/scores (currently 500'ing on Vercel for
  // every /api/* route) and query Supabase directly from the server
  // component. Same query shape, same response fields, same joins.
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const league = searchParams.league || 'nhl';
  const team = searchParams.team || '';
  const time = searchParams.time || 'current';
  const subleague = searchParams.subleague || '';
  const q = searchParams.q || '';
  const limit = 50;
  const offset = 0;
  const { from, to } = computeDateRangeFromUrl({ d: searchParams.d, w: searchParams.w });
  const weekOffset = parseInt(searchParams.w ?? '0', 10) || 0;
  const selectedDate = searchParams.d ?? '';

  try {
    // Resolve league(s)
    let leagueIds: string[] = [];
    if (league !== 'all') {
      const { data: leagueRow } = await sb.from('leagues').select('id').eq('slug', league).maybeSingle();
      if (leagueRow) leagueIds = [leagueRow.id];
    } else {
      const { data: topLeagues } = await sb.from('leagues').select('id').in('slug', ['nhl', 'ahl', 'pwhl', 'khl', 'shl', 'liiga', 'del', 'nl', 'extraliga', 'ncaa', 'chl', 'ushl']);
      leagueIds = (topLeagues || []).map((l) => l.id);
    }
    if (leagueIds.length === 0) {
      return { games: [], hasMore: false, totalShown: 0, league, time, team, subleague, q, from, to, selectedDate, weekOffset };
    }

    // Build query
    let query = sb
      .from('fixtures')
      .select(`id, scheduled_at, status, home_score, away_score, season, league_id, home_team:teams!home_team_id(id, name, slug, logo_url), away_team:teams!away_team_id(id, name, slug, logo_url), league:leagues(id, name, slug)`, { count: 'exact' })
      .not('home_team_id', 'is', null)
      .not('away_team_id', 'is', null)
      .order('scheduled_at', { ascending: true })
      .in('league_id', leagueIds)
      .range(offset, offset + limit - 1);

    if (subleague) {
      const { data: subRow } = await sb.from('leagues').select('id').eq('slug', subleague).maybeSingle();
      if (subRow) query = query.eq('league_id', subRow.id);
    }

    if (team) {
      const { data: teamRow } = await sb.from('team_workspaces').select('id').eq('slug', team).maybeSingle();
      if (teamRow) query = query.or(`home_team_id.eq.${teamRow.id},away_team_id.eq.${teamRow.id}`);
    }

    if (q) {
      const safe = q.replace(/[%_\\]/g, '\\$&');
      const { data: matchingTeams } = await sb.from('teams').select('id').ilike('name', `%${safe}%`);
      if (matchingTeams && matchingTeams.length > 0) {
        const teamIds = matchingTeams.map((t) => t.id).join(',');
        query = query.or(`home_team_id.in.(${teamIds}),away_team_id.in.(${teamIds})`);
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    const hasExplicitRange = !!(from || to);
    const recentCutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    if (hasExplicitRange) {
      // 2026-10-05 fix: when the user picks a date (or week window), we
      // don't know their timezone. The site displays game times in ET,
      // but the user could be in Cebu (UTC+8), Honolulu (UTC-10), or
      // anywhere. Late-night ET games (e.g. 22:00 UTC = 6 PM ET) fall
      // on the *next* local day in Asia, but the *previous* UTC day.
      // A strict UTC day filter (00:00Z–23:59Z) misses those games.
      // 2026-10-05 fix: previous widener used `${from}T14:00:00Z` and
      // `${to}T13:59:59Z` which made the range empty for single-day
      // filters. The correct widener subtracts 14h from the lower
      // bound and adds 14h to the upper bound, giving a 28-hour
      // window centered on the date. This catches games at any
      // timezone (±14h covers all of Earth).
      if (from) {
        const fromDate = new Date(`${from}T00:00:00.000Z`);
        fromDate.setUTCHours(fromDate.getUTCHours() - 14);
        query = query.gte('scheduled_at', fromDate.toISOString());
      }
      if (to) {
        const toDate = new Date(`${to}T23:59:59.999Z`);
        toDate.setUTCHours(toDate.getUTCHours() + 14);
        query = query.lte('scheduled_at', toDate.toISOString());
      }
    } else if (time === 'historical') {
      query = query.neq('status', 'in_progress').lt('scheduled_at', recentCutoff);
    } else if (time === 'recent') {
      query = query.eq('status', 'completed').gte('scheduled_at', recentCutoff);
    } else {
      query = query.or(`status.in.(scheduled,in_progress),and(status.eq.completed,scheduled_at.gte.${recentCutoff})`);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error('Games initial fetch error:', error.message);
      return { games: [], hasMore: false, totalShown: 0, league, time, team, subleague, q, from, to, selectedDate, weekOffset };
    }

    return {
      games: (data as unknown as Game[]) || [],
      hasMore: (count || 0) > offset + limit,
      totalShown: count || 0,
      league,
      time,
      team,
      subleague,
      q,
      from,
      to,
      selectedDate,
      weekOffset,
    };
  } catch (err) {
    console.error('Games initial fetch failed:', err);
    return { games: [], hasMore: false, totalShown: 0, league, time, team, subleague, q, from, to, selectedDate, weekOffset };
  }
}

export default async function GamesPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams;
  const initialData = await fetchInitialGames(sp);
  // WS22 games layout (2026-08-23): search + filter lead the page
  // (rendered inside GamesIndexClient). The descriptive intro moves to
  // a collapsible <details> block below the list so the chip bar +
  // dropdowns are the first thing the user sees — matching the teams
  // and leagues pages.
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} /></div>}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
                { '@type': 'ListItem', position: 2, name: 'Scores', item: `${BASE_URL}/directory/games` },
              ],
            },
            ...initialData.games.map((g: Game) => ({
              '@type': 'SportsEvent',
              name: `${g.home_team?.name || 'Home'} vs ${g.away_team?.name || 'Away'}`,
              startDate: g.scheduled_at,
              url: `${BASE_URL}/directory/games/${g.id}`,
              sport: 'Ice Hockey',
              competitor: [
                g.home_team ? { '@type': 'SportsTeam', name: g.home_team.name } : undefined,
                g.away_team ? { '@type': 'SportsTeam', name: g.away_team.name } : undefined,
              ].filter(Boolean),
            })),
          ]),
        }}
      />
      <GamesIndexClient initialData={initialData} />
      <section style={{ maxWidth: '80rem', margin: '1.5rem auto', padding: '0 1rem', color: 'rgba(255,255,255,0.78)', fontSize: '0.9375rem', lineHeight: 1.7 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
          Find live scores and recent results from every hockey league
        </h2>
        <p style={{ margin: 0 }}>
          Live and recent fixtures from the NHL, AHL, PWHL, KHL, SHL (Sweden), Liiga (Finland), DEL (Germany), National League (Switzerland), Czech Extraliga, NCAA hockey, the Canadian Hockey League (WHL, OHL, QMJHL), and the USHL. Use the league chip + team and time dropdowns above to narrow the list, then tap a score to open the team or league profile.
        </p>
        <details style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem', lineHeight: 1.7 }}>
          <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, userSelect: 'none', padding: '0.5rem 0' }}>
            About the RinkStop Games &amp; Scores Directory
          </summary>
          <div style={{ paddingTop: '0.5rem' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              The RinkStop scores index is the open hockey games directory — live and recent fixtures from the NHL, AHL, PWHL, KHL, SHL (Sweden), Liiga (Finland), DEL (Germany), National League (Switzerland), Czech Extraliga, NCAA hockey, the Canadian Hockey League (WHL, OHL, QMJHL), and the USHL. Filter by league chip to scope the list to one competition, narrow by team or sub-league from the dropdowns, and switch the time window between Current (live and recent) and Historical (archived matchups from past seasons).
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              Every score on this page links to the team profile and the league directory, so you can move from a single game into the full team page (roster, schedule, recent results) or the league overview (teams, country context, FAQ). Each team link resolves to the canonical RinkStop team profile page keyed by the team&apos;s own slug; each league name resolves to the league&apos;s directory page.
            </p>
            <p style={{ marginBottom: 0 }}>
              Below the introduction, this page shows the league filter chips, the team and time dropdowns, and the paginated game list with status badges (Live, Final, Scheduled, Postponed, Cancelled). The list loads the first 50 games on the server and shows a Load More button when more are available — refinement by team or sub-league resets the offset. RinkStop maintains this directory as a public, indexable entry so visitors searching for live scores, schedules, and results land on a page with verified league coverage and a path into the wider hockey directory.
            </p>
          </div>
        </details>
      </section>
    </Suspense>
  );
}
