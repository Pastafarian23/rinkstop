'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { SCORE_CHIPS, DEFAULT_CHIP, DEFAULT_TIME, DEFAULT_PAGE_SIZE, getChip } from '@/lib/score-chips';
import { formatGameTime, timezoneForGame, tzAbbr } from '@/lib/game-time';
import { displayNameForGame, historicalAliasLabel } from '@/lib/franchise-name-lookup';

const BASE_URL = 'https://rinkstop.com';

interface Game {
  id: string;
  date: string;
  status: string;
  scheduled_at: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { id: string; name: string; slug: string | null; logo_url: string | null } | null;
  away_team: { id: string; name: string; slug: string | null; logo_url: string | null } | null;
  league: { id: string; name: string; slug: string; level?: string; country?: string } | null;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  city?: string | null;
}

interface ApiResponse {
  data: Game[];
  count: number;
  chip: string;
  time: string;
  hasMore: boolean;
}

interface InitialData {
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
}

const statusStyle: Record<string, { color: string; label: string }> = {
  scheduled:  { color: 'rgba(255,255,255,0.4)',    label: 'Scheduled'  },
  in_progress:{ color: '#00d4ff', label: 'Live'       },
  completed: { color: '#34d399', label: 'Final'      },
  cancelled: { color: '#C8102E', label: 'Cancelled'  },
  postponed:  { color: '#fbbf24', label: 'Postponed'  },
};

function formatDate(d: string, tz: string) {
  // Use the centralized helper so every timezone rendering carries an
  // explicit abbreviation (ET, CET, MSK, etc.). Without this, a global
  // game list would silently mix timezones without disclosure.
  return formatGameTime(d, tz);
}

/**
 * 2026-10-14 (Arnel feedback): when the user toggles 'Show my local
 * time' we reformat the time into the browser's tz. Module-scope so
 * GameCard (a separate function) can use it without prop-drilling.
 */
function formatGameTimeDisplay(iso: string, leagueTz: string, showLocal: boolean): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return '—';
  if (!showLocal) return formatGameTime(iso, leagueTz);
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  if (localTz === leagueTz) return formatGameTime(iso, leagueTz);
  try {
    const datePart = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: localTz });
    const timePart = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: localTz });
    let abbr = '';
    try {
      abbr = dt.toLocaleTimeString('en-US', { timeZone: localTz, timeZoneName: 'short' }).split(' ').slice(-1)[0] || '';
    } catch {}
    return `${datePart} · ${timePart}${abbr ? ' ' + abbr : ''}`;
  } catch {
    return formatGameTime(iso, leagueTz);
  }
}

// 2026-10-01 fix (Arnel feedback): translate ?d= and ?w= URL state into
// a [from, to] ISO range so we can fetch the right window server-side.
// Single-day selection wins over the week window. Matches the helper in
// src/app/directory/games/page.tsx so SSR and client agree on the same
// games.
function computeDateRange(d: string | null, w: string | null): { from: string | null; to: string | null } {
  const ET_TZ = 'America/New_York';
  const fmtIso = (date: Date): string => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: ET_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}-${parts.find(p => p.type === 'day')!.value}`;
  };
  const todayIso = fmtIso(new Date());
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return { from: d, to: d };
  const weekOffset = parseInt(w ?? '0', 10) || 0;
  if (weekOffset !== 0 || w !== undefined) {
    const anchor = new Date(`${todayIso}T12:00:00Z`);
    anchor.setUTCDate(anchor.getUTCDate() + weekOffset * 7);
    const from = new Date(anchor.getTime() - 3 * 86400000);
    const to = new Date(anchor.getTime() + 3 * 86400000);
    return { from: fmtIso(from), to: fmtIso(to) };
  }
  return { from: null, to: null };
}

/**
 * WeekCalendar — 7-day strip showing daily game counts. Patterned after
 * NHL.com's mobile scores header (Sep 27–Oct 3 example).
 *
 * Today is highlighted in red; clicking a day surfaces just that date's
 * games below. Selected date has a thicker gold border.
 *
 * Implementation: client-side filter via URL hash param `d=YYYY-MM-DD`.
 * When `d` is set, the games list below renders only that day's games.
 */
// Module-scope supabase client — shared by GamesIndexClient and the
// standalone WeekCalendar. 2026-10-05 fix: WeekCalendar now fetches
// its own week-total counts (independent of the date-filter applied
// to the games list) so the strip always shows the full week.
const sbRefForCalendar = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.invalid',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
  { auth: { persistSession: false } }
);

function WeekCalendar({ games }: { games: Game[] }) {
  // 2026-10-05 fix (Arnel feedback): the week-strip cell counts should
  // ALWAYS show the full week's game totals, not just the games in the
  // currently-rendered list. When the user picks a date via the
  // Jump-to-date picker, the page filters to that single day and the
  // week strip used to show "0" on every cell except the selected one.
  //
  // We query Supabase directly for the current week's game totals,
  // independent of the dateFilter. The counts are then keyed by ET date
  // and rendered on the strip.
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const selectedDate = search.get('d');
  // 2026-10-01 fix: ?w=N shifts the visible week window by N weeks
  // (0 = current week centered on today, -1 = previous week, +1 = next).
  // The previous/next arrows navigate between weeks. Without this, the
  // arrows only re-selected days within the current visible week.
  const weekOffset = parseInt(search.get('w') ?? '0', 10) || 0;
  // 2026-10-05 fix (Arnel feedback): the week-strip cell counts should
  // ALWAYS show the full week's game totals, not just the games in the
  // currently-rendered list. When the user picks a date via the
  // Jump-to-date picker, the page filters to that single day and the
  // week strip used to show "0" on every cell except the selected one.
  // We query Supabase directly for the current week's game totals,
  // independent of the dateFilter.
  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      try {
        const league = search.get('league') || 'nhl';
        let leagueIds: string[] = [];
        if (league !== 'all') {
          const { data: leagueRow } = await sbRefForCalendar.from('leagues').select('id').eq('slug', league).maybeSingle();
          if (leagueRow && (leagueRow as { id: string }).id) leagueIds = [(leagueRow as { id: string }).id];
        } else {
          const { data: topLeagues } = await sbRefForCalendar.from('leagues').select('id').in('slug', ['nhl', 'ahl', 'pwhl', 'khl', 'shl', 'liiga', 'del', 'nl', 'extraliga', 'ncaa', 'chl', 'ushl']);
          leagueIds = ((topLeagues as { id: string }[] | null) || []).map((l) => l.id);
        }
        if (leagueIds.length === 0) return;
        // ET-day boundaries for the visible week (centered on ET-today).
        const ET_TZ = 'America/New_York';
        const fmtETDate = (d: Date): string => {
          const parts = new Intl.DateTimeFormat('en-CA', { timeZone: ET_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
          return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}-${parts.find(p => p.type === 'day')!.value}`;
        };
        const nowInET = fmtETDate(new Date());
        const anchor = new Date(`${nowInET}T12:00:00`);
        anchor.setDate(anchor.getDate() + weekOffset * 7);
        const from = new Date(anchor.getTime() - 3 * 86400000);
        const to = new Date(anchor.getTime() + 3 * 86400000);
        const fmtIso = (d: Date): string => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day_ = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day_}`;
        };
        const fromStr = fmtIso(from);
        const toStr = fmtIso(to);
        const fromDate = new Date(`${fromStr}T00:00:00.000Z`);
        fromDate.setUTCHours(4, 0, 0, 0);
        const toDate = new Date(`${toStr}T00:00:00.000Z`);
        toDate.setUTCDate(toDate.getUTCDate() + 1);
        toDate.setUTCHours(4, 0, 0, 0);
        const { data, error } = await sbRefForCalendar
          .from('fixtures')
          .select('scheduled_at')
          .not('home_team_id', 'is', null)
          .not('away_team_id', 'is', null)
          .in('league_id', leagueIds)
          .gte('scheduled_at', fromDate.toISOString())
          .lt('scheduled_at', toDate.toISOString())
          .range(0, 999);
        if (error) {
          console.error('WeekCalendar count error:', error.message);
          return;
        }
        const counts: Record<string, number> = {};
        for (const g of (data as { scheduled_at: string }[] | null) || []) {
          const etDate = fmtETDate(new Date(g.scheduled_at));
          counts[etDate] = (counts[etDate] || 0) + 1;
        }
        setWeekCounts(counts);
      } catch (e) {
        console.error('WeekCalendar count failed:', e);
      }
    })();
  }, [search, weekOffset]);
  // 2026-10-01 fix (Arnel feedback): the calendar and game grouping must
  // use the SAME date logic the displayed game times use — ET
  // (America/New_York). The page already says "All start times are shown
  // in ET". Previously the grouping used the user's browser-local
  // timezone, which for late-night ET games (e.g., 7:30 PM ET) rolled
  // into the next day in Cebu. Now everything lines up: the calendar
  // day-number matches the date label of the game group below it.
  //
  // Why ET specifically: NHL/NHLPA publish schedule in ET. The disclaimer
  // already promises ET times. Hockey fans mentally live in ET.
  // Everyone outside ET just sees that the calendar + group + times all
  // share the same day.
  const ET_TZ = 'America/New_York';
  const fmtETDate = (d: Date): string => {
    // Intl.DateTimeFormat with timeZone option gives us the ET calendar date.
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: ET_TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(d);
    const y = parts.find(p => p.type === 'year')!.value;
    const m = parts.find(p => p.type === 'month')!.value;
    const day_ = parts.find(p => p.type === 'day')!.value;
    return `${y}-${m}-${day_}`;
  };
  const fmtGameETDate = (iso: string): string => fmtETDate(new Date(iso));
  // Build a 7-day window centered on ET-today, shifted by ?w=N weeks.
  const nowInET = fmtETDate(new Date());
  // Start: nowInET - 3 days in ET, shifted by weekOffset * 7 days.
  // JS Date math treats ET 'today' as a local anchor: convert via noon-ET
  // of that date to avoid DST shifts.
  const anchor = new Date(`${nowInET}T12:00:00`);
  anchor.setDate(anchor.getDate() + weekOffset * 7);
  // 'Today' is the middle cell only when weekOffset === 0.
  const todayIso = weekOffset === 0 ? nowInET : '';
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor.getTime() + (i - 3) * 86400000);
    const iso = fmtETDate(d);
    // 2026-10-05 fix: use weekCounts (full week totals) instead of the
    // games array (which is filtered to the selected date). The strip
    // should always show how many games are on each day of the visible
    // week, regardless of the date picker.
    const count = weekCounts[iso] ?? games.filter((g) => fmtGameETDate(g.scheduled_at || g.date) === iso).length;
    return {
      iso,
      label: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: ET_TZ }).toUpperCase(),
      dayNum: Number(d.toLocaleDateString('en-US', { day: 'numeric', timeZone: ET_TZ })),
      isToday: iso === todayIso,
      count,
    };
  });
  function selectDate(iso: string | null) {
    const params = new URLSearchParams(search.toString());
    if (iso === null) params.delete('d');
    else params.set('d', iso);
    const qs = params.toString();
    router.push(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
  }
  // 2026-10-01 fix: previous/next week arrows adjust ?w and reset ?d
  // to the middle of the new window so the games list shows that day.
  function shiftWeek(delta: number) {
    const params = new URLSearchParams(search.toString());
    const newOffset = weekOffset + delta;
    if (newOffset === 0) params.delete('w');
    else params.set('w', String(newOffset));
    params.delete('d');
    const qs = params.toString();
    router.push(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
  }
  function jumpToToday() {
    const params = new URLSearchParams(search.toString());
    params.delete('w');
    params.delete('d');
    const qs = params.toString();
    router.push(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
  }
  return (
    <section
      data-week-calendar
      aria-label="Week calendar"
      style={{
        marginTop: '1.25rem',
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '1rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        <button
          onClick={() => shiftWeek(-1)}
          aria-label="Previous week"
          data-week-nav="prev"
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '1rem' }}
        >
          ←
        </button>
        <button
          onClick={jumpToToday}
          data-week-jump-today
          style={{
            background: weekOffset === 0 ? 'rgba(255,184,28,0.12)' : 'transparent',
            border: 'none',
            color: weekOffset === 0 ? '#FFB81C' : 'rgba(255,255,255,0.55)',
            cursor: 'pointer',
            padding: '0.25rem 0.75rem',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {weekOffset === 0
            ? `${days[0].iso.slice(5).replace('-', '/')} – ${days[6].iso.slice(5).replace('-', '/')}`
            : `${days[0].iso.slice(5).replace('-', '/')} – ${days[6].iso.slice(5).replace('-', '/')} · Today →`}
        </button>
        <button
          onClick={() => shiftWeek(1)}
          aria-label="Next week"
          data-week-nav="next"
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '1rem' }}
        >
          →
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '0.5rem',
        }}
      >
        {days.map((d) => {
          const isSelected = d.iso === selectedDate;
          return (
            <button
              key={d.iso}
              onClick={() => selectDate(d.iso === selectedDate ? null : d.iso)}
              data-week-day={d.iso}
              data-week-day-selected={isSelected ? 'true' : 'false'}
              data-week-day-today={d.isToday ? 'true' : 'false'}
              aria-label={`${d.label} ${d.dayNum} (${d.count} games)`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.5rem 0.25rem',
                background: d.isToday ? 'rgba(200,16,46,0.18)' : isSelected ? 'rgba(255,184,28,0.08)' : 'rgba(255,255,255,0.025)',
                border: d.isToday
                  ? '1.5px solid #C8102E'
                  : isSelected
                  ? '1.5px solid rgba(255,184,28,0.6)'
                  : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                cursor: 'pointer',
                color: d.isToday ? '#fff' : 'rgba(255,255,255,0.85)',
              }}
            >
              <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)' }}>{d.label}</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{d.dayNum}</span>
              {d.count > 0 && (
                <span style={{ fontSize: '0.6875rem', color: 'rgba(255,184,28,0.9)', fontWeight: 700 }}>{d.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function GameCard({ game, showLocalTime, onNavigate }: { game: Game; showLocalTime: boolean; onNavigate?: (id: string) => void }) {
  // Per-game timezone — pick from the league if known, else default to ET
  // (most of the data is NHL/AHL/PWHL). The explicit abbreviation is what
  // makes the time meaningful to a reader anywhere on earth.
  const tz = timezoneForGame({ leagueSlug: game.league?.slug, countryCode: undefined });
  const s = statusStyle[game.status] || statusStyle.scheduled;
  const homeName = game.home_team?.name || 'Home';
  const awayName = game.away_team?.name || 'Away';

  // Date-aware franchise name resolution — old Phoenix Coyotes games
  // show "Phoenix Coyotes" not "Utah Hockey Club" (Arnel 2026-10-05).
  const gameDate = game.scheduled_at;
  const homeSlug = game.home_team?.slug;
  const awaySlug = game.away_team?.slug;
  const homeDisplay = homeSlug ? displayNameForGame(homeSlug, gameDate) : null;
  const awayDisplay = awaySlug ? displayNameForGame(awaySlug, gameDate) : null;
  const homeRenderName = homeDisplay?.display || homeName;
  const awayRenderName = awayDisplay?.display || awayName;
  const homeTeamUrl = game.home_team?.slug ? teamHrefForLeague(game.league?.slug, game.home_team.slug) : null;
  const awayTeamUrl = game.away_team?.slug ? teamHrefForLeague(game.league?.slug, game.away_team.slug) : null;
  const gameHref = `/directory/games/${game.id}`;

  // 2026-10-14: the card is now a div (not a Link) so the team-name
  // links inside it are valid HTML. Clicking anywhere on the card
  // (other than a team-name link) navigates to the game page via
  // onNavigate. This is the only way to get a tappable card AND
  // tappable team names without nesting <a> inside <a>.
  return (
    <div
      role="group"
      onClick={(e) => {
        // Ignore clicks on inner links.
        const t = e.target as HTMLElement;
        if (t.closest('a')) return;
        if (onNavigate) onNavigate(game.id);
        else if (typeof window !== 'undefined') window.location.href = gameHref;
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onNavigate) onNavigate(game.id);
          else if (typeof window !== 'undefined') window.location.href = gameHref;
        }
      }}
      tabIndex={0}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '0.875rem 1rem',
        color: 'inherit',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.background = 'var(--s2)';
      }}
    >
      {/* Row 1: teams + score. Mobile-first stack; team rows are
          always above the score row so the names never overlap the
          date/time below. Each team name + logo is a real link to
          the team page. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {/* Home team row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          {homeTeamUrl ? (
            <Link href={homeTeamUrl} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1, color: 'inherit', textDecoration: 'none' }}>
              {game.home_team?.logo_url && (
                <img src={game.home_team.logo_url} alt={`${homeRenderName} logo`} style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{homeRenderName}</span>
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
              {game.home_team?.logo_url && (
                <img src={game.home_team.logo_url} alt={`${homeRenderName} logo`} style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{homeRenderName}</span>
            </div>
          )}
          <span style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#fff', flexShrink: 0, minWidth: '1.75rem', textAlign: 'right' }}>{game.home_score ?? '–'}</span>
        </div>
        {/* Away team row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          {awayTeamUrl ? (
            <Link href={awayTeamUrl} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1, color: 'inherit', textDecoration: 'none' }}>
              {game.away_team?.logo_url && (
                <img src={game.away_team.logo_url} alt={`${awayRenderName} logo`} style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{awayRenderName}</span>
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
              {game.away_team?.logo_url && (
                <img src={game.away_team.logo_url} alt={`${awayRenderName} logo`} style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{awayRenderName}</span>
            </div>
          )}
          <span style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#fff', flexShrink: 0, minWidth: '1.75rem', textAlign: 'right' }}>{game.away_score ?? '–'}</span>
        </div>
      </div>

      {/* Row 2: date/time + timezone (once). formatDate() already
          includes the timezone abbreviation; we render the date/time
          line as a single unit so the abbreviation never doubles up. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>{formatGameTimeDisplay(game.scheduled_at || game.date, tz, showLocalTime)}</span>
      </div>

      {/* Row 3: status badge + league link + view-game link on the
          same row so the card stays compact on mobile. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span style={{
          display: 'inline-block',
          padding: '0.15rem 0.5rem',
          borderRadius: '99px',
          fontSize: '0.625rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: s.color,
          border: `1px solid ${s.color}40`,
        }}>
          {s.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {game.league?.slug && (
            <Link href={leagueHrefForSlug(game.league.slug)} style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>
              {game.league.name}
            </Link>
          )}
          <Link href={gameHref} style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontWeight: 600 }} aria-label="Open game details">
            View →
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * 2026-10-14: Build the per-team page URL based on the league. The
 * canonical team page lives at /directory/<league>/teams/<slug> for
 * the top leagues; fall back to /directory/teams/<slug> for the
 * mixed bag. leagueHrefForSlug does the same for the league chip.
 */
function teamHrefForLeague(leagueSlug: string | undefined | null, teamSlug: string): string {
  const slugsWithTeamDir = new Set(['nhl', 'ahl', 'pwhl', 'khl', 'shl', 'liiga', 'del', 'nl', 'extraliga', 'ncaa', 'chl', 'ushl', 'echl']);
  if (leagueSlug && slugsWithTeamDir.has(leagueSlug)) {
    return `/directory/${leagueSlug}/teams/${teamSlug}`;
  }
  return `/directory/teams/${teamSlug}`;
}

function leagueHrefForSlug(leagueSlug: string): string {
  const slugsWithTeamDir = new Set(['nhl', 'ahl', 'pwhl', 'khl', 'shl', 'liiga', 'del', 'nl', 'extraliga', 'ncaa', 'chl', 'ushl', 'echl']);
  if (slugsWithTeamDir.has(leagueSlug)) return `/directory/${leagueSlug}`;
  return `/directory/leagues/${leagueSlug}`;
}

function Dropdown({
  label, value, options, onChange, disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
      <span>{label}:</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          background: 'var(--s2)',
          color: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '0.35rem 0.6rem',
          fontSize: '0.8125rem',
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

// Human-readable labels for sub-league slugs in the dropdown.
function chipSubleagueLabel(slug: string): string {
  const map: Record<string, string> = {
    'khl': 'KHL',
    'shl': 'SHL (Sweden)',
    'shl-sweden': 'SHL (Sweden)',
    'liiga': 'Liiga (Finland)',
    'liiga-finland': 'Liiga (Finland)',
    'del': 'DEL (Germany)',
    'del-germany': 'DEL (Germany)',
    'national-league-switzerland': 'NL (Switzerland)',
    'nl-ch': 'NL (Switzerland)',
    'extraliga-cz': 'Extraliga (Czech)',
    'ncaa-division-1-hockey': 'NCAA',
    'ncaa': 'NCAA',
    'whl': 'WHL',
    'ohl': 'OHL',
    'qmjhl': 'QMJHL',
    'ushl': 'USHL',
  };
  return map[slug] || slug.toUpperCase();
}

interface Props {
  initialData: InitialData;
}

export default function GamesIndexClient({ initialData }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read filters from URL with defaults
  const league = searchParams.get('league') || initialData.league || DEFAULT_CHIP;
  const team = searchParams.get('team') ?? initialData.team ?? '';
  const time = searchParams.get('time') || initialData.time || DEFAULT_TIME;
  const subleague = searchParams.get('subleague') ?? initialData.subleague ?? '';
  const q = searchParams.get('q') ?? '';
  // 2026-09-30 IA fix: ?d=YYYY-MM-DD filter from the WeekCalendar strip.
  // When set, the games list filters to only that day's games. When
  // cleared, the strip goes back to "show all upcoming".
  const dateFilter = searchParams.get('d') ?? '';
  // 2026-10-01 fix (Arnel feedback): ?w=N shifts the visible week window
  // by N weeks. 0 = current week centered on today. -1 = previous week.
  // Both ?d= and ?w= flow into the API fetch as ?from/?to so the server
  // returns the right games, not just the cached 'current' set.
  const weekOffset = parseInt(searchParams.get('w') ?? '0', 10) || 0;
  // 2026-10-14 (Phase 6): detect any active filter so we can noindex
  // those URLs. The clean default URL is the only one Google indexes.
  const qParam = searchParams.get('q') ?? '';
  const teamParam = searchParams.get('team') ?? '';
  const subleagueParam = searchParams.get('subleague') ?? '';
  const leagueParam = searchParams.get('league') ?? '';
  const timeParam = searchParams.get('time') ?? '';
  const hasActiveFilters = Boolean(
    dateFilter || weekOffset || qParam || teamParam || subleagueParam ||
    (leagueParam && leagueParam !== DEFAULT_CHIP) ||
    (timeParam && timeParam !== DEFAULT_TIME)
  );
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  const chip = useMemo(() => getChip(league), [league]);
  const isLeagueChip = chip.type === 'league';

  // Sub-league options for category chips (from config)
  const subleagueOptions = useMemo(() => {
    if (isLeagueChip) return [];
    return chip.leagueSlugs.map(s => ({
      value: s,
      label: chipSubleagueLabel(s),
    }));
  }, [chip, isLeagueChip]);

  // Team list (only for league chips)
  const [teams, setTeams] = useState<Team[]>([]);
  useEffect(() => {
    if (!isLeagueChip) {
      setTeams([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/scores/teams?league=${chip.slug}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) setTeams(d?.data || []);
      })
      .catch(() => { if (!cancelled) setTeams([]); });
    return () => { cancelled = true; };
  }, [chip.slug, isLeagueChip]);

  // Game list — start from SSR-populated initial data on first render
  const [games, setGames] = useState<Game[]>(initialData.games);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialData.hasMore);
  const [totalShown, setTotalShown] = useState(initialData.totalShown);
  // 2026-10-14 (Arnel feedback): 'Show my local time' toggle so users
  // outside ET don't have to mentally convert. Persisted in
  // localStorage so the choice sticks across visits. Default off — the
  // site's default is still league-local time, with the explicit
  // abbreviation so nobody's surprised.
  const [showLocalTime, setShowLocalTime] = useState(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem('rs_showLocalTime');
      if (v === '1') setShowLocalTime(true);
    } catch {}
  }, []);
  const toggleLocalTime = () => {
    setShowLocalTime(prev => {
      const next = !prev;
      try { localStorage.setItem('rs_showLocalTime', next ? '1' : '0'); } catch {}
      return next;
    });
  };

  // 2026-10-14 (Phase 5): restore the user's preferred league/team
  // filter from localStorage when the URL has no ?league= or ?team=
  // set. Only the default landing case; explicit URLs win.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.has('league') || url.searchParams.has('team')) return;
    const persistedLeague = (() => { try { return localStorage.getItem('rs_filter_league'); } catch { return null; } })();
    const persistedTeam = (() => { try { return localStorage.getItem('rs_filter_team'); } catch { return null; } })();
    if (persistedLeague || persistedTeam) {
      const params = new URLSearchParams(url.searchParams);
      if (persistedLeague) params.set('league', persistedLeague);
      if (persistedTeam) params.set('team', persistedTeam);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset & refetch on filter change. 2026-10-01 fix: also re-run when
// weekOffset or dateFilter change so the strip navigation actually
// re-fetches data instead of just rebadging the cached 'current' list.
  // 2026-10-05 fix (Arnel empty page): on first mount, do NOT refetch —
  // /api/scores is returning HTTP 500 on Vercel and the fetch was
  // clobbering the SSR'd initialData.games with an empty array.
  // Only refetch when filters actually change after mount.
  // 2026-10-05 fix (Arnel week arrows): stop using /api/scores entirely.
  // Query Supabase directly from the client. Same query shape as the
  // SSR, same response fields. This is the only reliable path while
  // /api/* returns 500 on Vercel.
  const sbRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!sbRef.current) {
    sbRef.current = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
  }

  // Reusable: build a Supabase fixtures query from current filters.
  // Returns null if the league slug doesn't resolve. offset/limit
  // can be customized for the initial fetch and loadMore.
  const buildQuery = useCallback(async (offset: number, limit: number) => {
    const sb = sbRef.current!;
    let leagueIds: string[] = [];
    if (league !== 'all') {
      const { data: leagueRow } = await sb.from('leagues').select('id').eq('slug', league).maybeSingle();
      if (leagueRow && (leagueRow as { id: string }).id) leagueIds = [(leagueRow as { id: string }).id];
    } else {
      const { data: topLeagues } = await sb.from('leagues').select('id').in('slug', ['nhl', 'ahl', 'pwhl', 'khl', 'shl', 'liiga', 'del', 'nl', 'extraliga', 'ncaa', 'chl', 'ushl']);
      leagueIds = ((topLeagues as { id: string }[] | null) || []).map((l) => l.id);
    }
    if (leagueIds.length === 0) return null;
    const range = computeDateRange(dateFilter, weekOffset ? String(weekOffset) : (searchParams.get('w') ?? ''));
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
      if (subRow && (subRow as { id: string }).id) query = query.eq('league_id', (subRow as { id: string }).id);
    }
    if (team) {
      const { data: teamRow } = await sb.from('team_workspaces').select('id').eq('slug', team).maybeSingle();
      if (teamRow && (teamRow as { id: string }).id) {
        const tid = (teamRow as { id: string }).id;
        query = query.or(`home_team_id.eq.${tid},away_team_id.eq.${tid}`);
      }
    }
    if (q) {
      const safe = q.replace(/[%_\\]/g, '\\$&');
      const { data: matchingTeams } = await sb.from('teams').select('id').ilike('name', `%${safe}%`);
      const teamList = (matchingTeams as { id: string }[] | null) || [];
      if (teamList.length > 0) {
        const teamIds = teamList.map((t) => t.id).join(',');
        query = query.or(`home_team_id.in.(${teamIds}),away_team_id.in.(${teamIds})`);
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }
    const hasExplicitRange = !!(range.from || range.to);
    const ET_DAY_START_HOUR_UTC = 4;
    if (hasExplicitRange) {
      if (range.from) {
        const fromDate = new Date(`${range.from}T00:00:00.000Z`);
        fromDate.setUTCHours(ET_DAY_START_HOUR_UTC, 0, 0, 0);
        query = query.gte('scheduled_at', fromDate.toISOString());
      }
      if (range.to) {
        const toDate = new Date(`${range.to}T00:00:00.000Z`);
        toDate.setUTCDate(toDate.getUTCDate() + 1);
        toDate.setUTCHours(ET_DAY_START_HOUR_UTC, 0, 0, 0);
        query = query.lt('scheduled_at', toDate.toISOString());
      }
    } else {
      const recentCutoff = new Date(Date.now() - 7 * 86400000).toISOString();
      if (time === 'historical') {
        query = query.neq('status', 'in_progress').lt('scheduled_at', recentCutoff);
      } else if (time === 'recent') {
        query = query.eq('status', 'completed').gte('scheduled_at', recentCutoff);
      } else {
        query = query.or(`status.in.(scheduled,in_progress),and(status.eq.completed,scheduled_at.gte.${recentCutoff})`);
      }
    }
    return query;
  }, [league, time, team, subleague, q, dateFilter, weekOffset, searchParams]);

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setLoading(true);
    setGames([]);
    setTotalShown(0);
    setHasMore(false);
    (async () => {
      try {
        const query = await buildQuery(0, DEFAULT_PAGE_SIZE);
        if (!query) {
          setGames([]);
          setHasMore(false);
          setTotalShown(0);
          setLoading(false);
          return;
        }
        const { data, count, error } = await query;
        if (error) {
          console.error('Games client fetch error:', error.message);
          setLoading(false);
          return;
        }
        setGames((data as unknown as Game[]) || []);
        setHasMore((count || 0) > DEFAULT_PAGE_SIZE);
        setTotalShown(count || 0);
        setLoading(false);
      } catch (e) {
        console.error('Games client fetch failed:', e);
        setLoading(false);
      }
    })();
  }, [buildQuery]);

  // 2026-09-22 self-heal: poll for stale scheduled games every 5 min. If
  // we find any (past scheduled_at with status=scheduled), trigger a
  // background refresh via /api/cron/scores-refresh. Then refetch the
  // games list. This is the user-facing safety net for when the Vercel
  // cron fails (rate limit, cold start, etc.). Per Arnel 01:39 CDT:
  // 'protocols in case there are any cron issues'.
  // 2026-10-05 fix: query Supabase directly instead of /api/health/scores
  // (which returns HTTP 500 on Vercel). The /api/cron/scores-refresh call
  // is best-effort; if it's also 500, we just wait for the next scheduled
  // cron run.
  useEffect(() => {
    let cancelled = false;
    let triggerInFlight = false;
    const tick = async () => {
      if (cancelled || triggerInFlight) return;
      try {
        const sb = sbRef.current!;
        const cutoff = new Date(Date.now() - 6 * 3600 * 1000).toISOString(); // 6h ago
        const { count: staleScheduled } = await sb
          .from('fixtures')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'scheduled')
          .lt('scheduled_at', cutoff);
        if (cancelled || (staleScheduled || 0) < 5) return;
        triggerInFlight = true;
        // Trigger background refresh; best-effort
        fetch('/api/cron/scores-refresh', {
          method: 'POST',
          headers: { 'x-internal-self-heal': '1' },
        }).catch(() => {});
        // Wait a few seconds then refetch our games list
        setTimeout(async () => {
          if (cancelled) return;
          try {
            const query = await buildQuery(0, DEFAULT_PAGE_SIZE);
            if (query) {
              const { data, count, error } = await query;
              if (!error) {
                setGames((data as unknown as Game[]) || []);
                setHasMore((count || 0) > DEFAULT_PAGE_SIZE);
                setTotalShown(count || 0);
              }
            }
          } catch {}
          triggerInFlight = false;
        }, 8000);
      } catch {}
    };
    const interval = setInterval(tick, 5 * 60 * 1000); // every 5 minutes
    return () => { cancelled = true; clearInterval(interval); };
  }, [buildQuery]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const currentLen = games.length;
    (async () => {
      try {
        const query = await buildQuery(currentLen, DEFAULT_PAGE_SIZE);
        if (!query) {
          setLoadingMore(false);
          return;
        }
        const { data, count, error } = await query;
        if (error) {
          console.error('Games loadMore error:', error.message);
          setLoadingMore(false);
          return;
        }
        const newRows = (data as unknown as Game[]) || [];
        setGames(prev => [...prev, ...newRows]);
        setHasMore((count || 0) > currentLen + newRows.length);
        setTotalShown(prev => prev + newRows.length);
        setLoadingMore(false);
      } catch (e) {
        console.error('Games loadMore failed:', e);
        setLoadingMore(false);
      }
    })();
  };

  // URL update helper
  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // 2026-10-14 (Phase 5): persist the league + team filter choice
    // in localStorage so the user's preferred scope (e.g. always
    // open /scores to "NHL" or "Pittsburgh Penguins") is restored
    // on the next visit. We do this on every update so the
    // always-last-set value wins.
    if (typeof window === 'undefined') return;
    try {
      if (key === 'league') {
        if (value) localStorage.setItem('rs_filter_league', value);
        else localStorage.removeItem('rs_filter_league');
      } else if (key === 'team') {
        if (value) localStorage.setItem('rs_filter_team', value);
        else localStorage.removeItem('rs_filter_team');
      }
    } catch {}
  }, [searchParams, router, pathname]);

  // 2026-10-14: GameCard passes a navigate callback so the whole
  // card is clickable without nesting <a> inside <a> (invalid HTML).
  const navigateToGame = useCallback((id: string) => {
    router.push(`/directory/games/${id}`);
  }, [router]);

  const setLeague = (slug: string) => {
    // Reset team / subleague when switching chips
    const params = new URLSearchParams();
    params.set('league', slug);
    if (time !== DEFAULT_TIME) params.set('time', time);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    router.replace(pathname, { scroll: false });
  };

  // Clear is visible only if any filter diverges from defaults
  const isDefault = league === DEFAULT_CHIP && time === DEFAULT_TIME && !team && !subleague && !q;

  // JSON-LD structured data
  useEffect(() => {
    if (games.length === 0) return;
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Scores', item: `${BASE_URL}/directory/games` },
      ],
    };
    const events = games.map((g: any): Record<string, any> => {
      // Date-aware historical name resolution for SEO schema too.
      const hd = g.home_team?.slug ? displayNameForGame(g.home_team.slug, g.scheduled_at) : null;
      const ad = g.away_team?.slug ? displayNameForGame(g.away_team.slug, g.scheduled_at) : null;
      const homeName = hd?.display || g.home_team?.name || 'Home';
      const awayName = ad?.display || g.away_team?.name || 'Away';
      return {
        '@type': 'SportsEvent',
        name: `${homeName} vs ${awayName}`,
        startDate: g.scheduled_at,
        location: undefined,
        competitor: [
          g.home_team ? { '@type': 'SportsTeam', name: homeName } : undefined,
          g.away_team ? { '@type': 'SportsTeam', name: awayName } : undefined,
        ].filter(Boolean),
      };
    });
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify([breadcrumbSchema, ...events]);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [games]);

  // Empty state message varies by chip and (when set) the date range
  const emptyMessage = useMemo(() => {
    if (loading) return null;
    if (games.length > 0) return null;
    if (time === 'historical') {
      return {
        title: 'No archived games found.',
        sub: 'Try switching to Current to see recent and upcoming games.',
      };
    }
    // 2026-10-01 fix: when the user explicitly asked for a date/week
    // window, tell them we found nothing in that range and offer a quick
    // way back to the live view. Without this they could stare at an
    // empty list wondering if the page is broken.
    if (dateFilter || weekOffset !== 0) {
      const dateLabel = dateFilter
        ? new Date(dateFilter + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        : `week ${weekOffset > 0 ? '+' : ''}${weekOffset}`;
      return {
        title: `No ${chip.label} games ${dateFilter ? 'on ' + dateLabel : 'in this week'}.`,
        sub: 'Try a different day, switch leagues, or tap "Show current" below the date picker.',
      };
    }
    const emptyCopy: Record<string, { title: string; sub: string }> = {
      nhl:     { title: 'No NHL games right now.', sub: 'The season is between rounds. Check back soon or browse Historical games.' },
      ahl:     { title: 'No AHL games right now.', sub: 'Try Historical to browse past AHL matchups.' },
      pwhl:    { title: 'No PWHL games right now.', sub: 'PWHL season is between phases. Check back for upcoming games.' },
      intl:    { title: 'No international games right now.', sub: 'KHL season is between phases. Try Historical to browse past international matchups.' },
      college: { title: 'NCAA hockey data coming soon.', sub: 'We are working on syncing college hockey fixtures. In the meantime, browse NHL, AHL, or Junior games.' },
      junior:  { title: 'No CHL games right now.', sub: 'CHL (WHL/OHL/QMJHL) season is between phases. Try Historical to browse past junior matchups.' },
    };
    return emptyCopy[chip.slug] || { title: 'No games found.', sub: 'Try adjusting your filters.' };
  }, [chip, time, games.length, loading, dateFilter, weekOffset]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Scores</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <div className="label">Live &amp; Recent</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          SCORES &amp; FIXTURES
        </h1>
      </div>

      <div style={{ height: '2px', background: 'linear-gradient(90deg, #C8102E 0%, #041E42 100%)', borderRadius: '2px', marginBottom: '1.5rem', width: '80px' }} />

      {/* Timezone disclosure — 2026-09-14: times shown in explicit
          ET/CT/MT/PT abbreviations. Per-league timezones will appear
          inline on each card.
          2026-10-01 fix (Arnel): was incorrectly claiming "All start times
          are shown in Eastern Time (ET)". That was true for NHL/CHL/NCAA
          but KHL publishes in MSK, SHL in CET, Liiga in EET, etc.
          Replaced with accurate per-league copy. */}
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', marginBottom: '1rem', lineHeight: 1.5, fontStyle: 'italic' }}>
        Start times are shown in each league's home timezone: ET for NHL/AHL/PWHL/NCAA,
        MSK for KHL, CET for SHL/DEL/Extraliga, EET for Liiga, and so on. Each game
        card shows the timezone abbreviation next to the puck-drop time.
        Times are based on the league's official schedule, not browser-local.
      </p>

      {/* Filter bar: chips */}
      {/* 2026-09-17: split chips into 'Most Popular' (NHL/KHL/PWHL — the
          leagues that drive the bulk of traffic) and the rest. Per
          Arnel's 07:20 CDT message: 'Why is there no khl in most popular
          leagues?'. KHL is now its own top-level chip (moved out of INTL). */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginRight: '0.25rem', minWidth: '5.5rem' }}>Most Popular</span>
        {SCORE_CHIPS.filter(c => c.popular).map(c => {
          const active = c.slug === league;
          return (
            <button
              key={c.slug}
              onClick={() => setLeague(c.slug)}
              data-testid={`chip-${c.slug}`}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '99px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: active ? '#C8102E' : 'var(--s2)',
                color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                border: active ? '1px solid #C8102E' : '1px solid var(--border)',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginRight: '0.25rem', minWidth: '5.5rem' }}>More</span>
        {SCORE_CHIPS.filter(c => !c.popular).map(c => {
          const active = c.slug === league;
          return (
            <button
              key={c.slug}
              onClick={() => setLeague(c.slug)}
              data-testid={`chip-${c.slug}`}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '99px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: active ? '#C8102E' : 'var(--s2)',
                color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                border: active ? '1px solid #C8102E' : '1px solid var(--border)',
              }}
            >
              {c.label}
            </button>
          );
        })}
        {!isDefault && (
          <button
            onClick={clearFilters}
            data-testid="chip-clear"
            style={{
              marginLeft: 'auto',
              padding: '0.4rem 0.9rem',
              borderRadius: '99px',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              border: '1px dashed var(--border)',
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Search bar — free-text team search. Filters across the active
          league chip; debounces input by 300ms before pushing to URL
          to avoid hitting the API on every keystroke. */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder={`Search teams in ${chip.label}…`}
          defaultValue={q}
          onChange={e => {
            const v = e.target.value;
            if (searchTimer.current) clearTimeout(searchTimer.current);
            searchTimer.current = setTimeout(() => updateParam('q', v), 300);
          }}
          style={{
            width: '100%',
            maxWidth: '420px',
            padding: '0.625rem 0.875rem',
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.9375rem',
            outline: 'none',
          }}
          data-testid="team-search"
        />
      </div>

      {/* Filter bar: dropdowns */}
      {/* 2026-09-17: every chip now shows both a 'League' dropdown (so the
          user can jump leagues without clicking chips) and 'Time'. The
          'Team' dropdown only renders for league-type chips where teams
          have been loaded. Per Arnel's 07:20 CDT: 'drop down filtering
          similar to other pages that narrows down exactly to specific
          league'. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
        <Dropdown
          label="League"
          value={league}
          onChange={v => setLeague(v)}
          options={SCORE_CHIPS.map(c => ({ value: c.slug, label: c.label }))}
        />
        {isLeagueChip && (
          <Dropdown
            label="Team"
            value={team}
            onChange={v => updateParam('team', v)}
            options={[{ value: '', label: 'All Teams' }, ...teams.map(t => ({ value: t.slug, label: t.name }))]}
          />
        )}
        <Dropdown
          label="Time"
          value={time}
          onChange={v => updateParam('time', v)}
          options={[
            { value: 'current', label: 'Current' },
            { value: 'recent', label: 'Recent Results' },
            { value: 'historical', label: 'Historical' },
          ]}
        />
      </div>

      {/* Ticketmaster NHL Banner - 468x60 */}

      {/* 2026-09-30 IA fix: Week calendar strip showing 7 days of game
          counts. Today highlighted in red. Click any day to filter.
          Patterned after NHL.com's mobile scores header. */}
      {/* 2026-10-14 (Phase 6): any URL with filter params (d, w, q,
          team, subleague, or a non-default time) gets noindex +
          canonical to the clean URL. The clean /directory/games is
          the only version Google should index. The filtered
          variants are user conveniences, not unique content. */}
      {hasActiveFilters && (
        <>
          <meta name="robots" content="noindex,follow" />
          <link rel="canonical" href="https://rinkstop.com/directory/games" />
        </>
      )}
      <WeekCalendar games={games} />

      {/* 2026-10-01 fix (Arnel feedback): a plain date input lets users
          jump to any specific date, not just the visible week window.
          The native <input type="date"> gives us a calendar picker for
          free; we wrap it in a small label so the affordance is clear.
          Submitting (change/blur) pushes ?d=YYYY-MM-DD into the URL,
          which the parent reads and the API fetch honors. */}
      <div
        data-date-picker
        style={{
          marginTop: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem 0.75rem',
          background: 'rgba(0,0,0,0.18)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.8125rem',
        }}
      >
        <label htmlFor="jump-date" style={{ fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>
          Jump to date:
        </label>
        <input
          id="jump-date"
          type="date"
          value={dateFilter || (() => {
            // 2026-10-14 (Arnel feedback): the input used to render
            // empty when no date was selected, which made the picker
            // look broken. Default to today (in ET) so users see a
            // meaningful date in the box.
            const d = new Date();
            return new Intl.DateTimeFormat('en-CA', {
              timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
            }).format(d);
          })()}
          onChange={(e) => {
            const v = e.target.value;
            const params = new URLSearchParams(searchParams.toString());
            if (v) params.set('d', v);
            else params.delete('d');
            // Clear week offset since a specific date takes precedence.
            params.delete('w');
            const qs = params.toString();
            router.push(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
          }}
          style={{
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            padding: '0.375rem 0.5rem',
            colorScheme: 'dark',
            fontSize: '0.875rem',
          }}
        />
        {dateFilter && (
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete('d');
              params.delete('w');
              const qs = params.toString();
              router.push(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
            }}
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              padding: '0.375rem 0.625rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Show current
          </button>
        )}
        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
          Or use the week strip above to step ±7 days
        </span>
      </div>

      {/* 2026-10-14 (Arnel feedback): when the venue timezone is
          unknown we can't show the arena's local time, so offer a
          'Show my local time' toggle. Client-side only; persisted in
          localStorage so the choice sticks across visits. */}
      <div
        data-local-time-toggle
        style={{
          marginTop: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'rgba(255,255,255,0.55)',
          fontSize: '0.75rem',
        }}
      >
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={showLocalTime}
            onChange={toggleLocalTime}
            style={{ accentColor: '#C8102E', cursor: 'pointer' }}
          />
          <span>Show my local time</span>
        </label>
        {showLocalTime && (
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>
            ({(Intl.DateTimeFormat().resolvedOptions().timeZone || 'local').replace(/_/g, ' ')})
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '8px' }} />)}
        </div>
      ) : games.length === 0 && emptyMessage ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '1.25rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', marginBottom: '0.5rem' }}>{emptyMessage.title}</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>{emptyMessage.sub}</p>
        </div>
      ) : (
        <>
          {/* 2026-09-17: group games by status so upcoming appear on top
              and recently-completed appear below, each in their own section.
              Previously this was a flat list — completed games mixed in
              with upcoming and pushed preseason out of view. */}
          {(() => {
            // 2026-09-17: when the user picks the 'Recent Results' time filter,
            // the API returns only completed games from the last 7 days
            // ordered most-recent-first. Render them in a single section.
            // Otherwise split into Upcoming + Recently Completed.
            if (time === 'recent') {
              return (
                <section style={{ marginTop: '1.25rem' }}>
                  <h2 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
                    Recent Results ({games.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {games.map(g => <GameCard key={g.id} game={g} showLocalTime={showLocalTime} onNavigate={navigateToGame} />)}
                  </div>
                </section>
              );
            }
            const upcoming = games.filter(g => {
              if (g.status !== 'scheduled' && g.status !== 'in_progress') return false;
              // 2026-09-22: defense in depth — server should exclude stale
              // scheduled rows whose scheduled_at is past, and stale
              // in_progress rows whose scheduled_at is >4h ago, but skip
              // them client-side too in case the API response is cached.
              // 2026-10-05 fix: when the user explicitly picked a date
              // via ?d=YYYY-MM-DD or ?w=N, do NOT drop "stale scheduled"
              // games — they want to see that day/week's games even if
              // the puck has already dropped.
              const t = new Date(g.scheduled_at || g.date).getTime();
              if (!dateFilter && weekOffset === 0) {
                if (g.status === 'scheduled' && t < Date.now()) return false;
                if (g.status === 'in_progress' && t < Date.now() - 4 * 60 * 60 * 1000) return false;
              }
              return true;
            });
            const completed = games.filter(g => g.status === 'completed');
            // 2026-09-30 IA fix: apply the ?d=YYYY-MM-DD date filter from
            // the WeekCalendar strip. When set, narrow both lists to just
            // that day. When cleared, show everything. The date is
            // interpreted in ET (matches the displayed game times + the
            // calendar day cells).
            const ET_TZ = 'America/New_York';
            const etDateOf = (iso: string): string => {
              const d = new Date(iso);
              if (isNaN(d.getTime())) return iso.slice(0, 10);
              const parts = new Intl.DateTimeFormat('en-CA', {
                timeZone: ET_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
              }).formatToParts(d);
              return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}-${parts.find(p => p.type === 'day')!.value}`;
            };
            const scopedUpcoming = dateFilter
                ? upcoming.filter((g) => etDateOf(g.scheduled_at || g.date) === dateFilter)
                : upcoming;
            const scopedCompleted = dateFilter
                ? completed.filter((g) => etDateOf(g.scheduled_at || g.date) === dateFilter)
                : completed;
            const gamesToGroup = [...scopedUpcoming, ...scopedCompleted];
            return (
              <>
                {/* 2026-09-30 IA fix (Arnel feedback): replace the flat
                    "Upcoming" list with date-grouped sections. Today's
                    games appear under a TODAY header, tomorrow under
                    TOMORROW, then each subsequent day. Within each
                    date group, games are sorted chronologically
                    (earliest start time first). Matches NHL.com's
                    scores layout: hero "Today", then grouped days. */}
                {(() => {
                  // 2026-10-01 fix (Arnel feedback): group by ET date so the
                  // "WEDNESDAY, SEPTEMBER 30" header matches the displayed
                  // game times (which are already in ET). Previously
                  // sliced scheduled_at which is UTC — late-night ET games
                  // landed on the next day in UTC and showed up under the
                  // wrong group.
                  const ET_TZ = 'America/New_York';
                  const fmtETDate = (iso: string): string => {
                    const d = new Date(iso);
                    if (isNaN(d.getTime())) return iso.slice(0, 10);
                    const parts = new Intl.DateTimeFormat('en-CA', {
                      timeZone: ET_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
                    }).formatToParts(d);
                    return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}-${parts.find(p => p.type === 'day')!.value}`;
                  };
                  const grouped: Record<string, Game[]> = {};
                  for (const g of gamesToGroup) {
                    const d = fmtETDate(g.scheduled_at || g.date);
                    if (!grouped[d]) grouped[d] = [];
                    grouped[d].push(g);
                  }
                  // 2026-10-14 fix (Arnel feedback): sort date keys with
                  // today first, then by date ASC. Previous behavior was
                  // straight ASC which put Oct 11/12/13 (past 7d
                  // completed) before Oct 14 (today). User had to scroll
                  // past 3 days of completed results to find today.
                  const todayStr0 = fmtETDate(new Date().toISOString());
                  const dateKeys = Object.keys(grouped).sort((a, b) => {
                    if (a === todayStr0) return -1;
                    if (b === todayStr0) return 1;
                    return a.localeCompare(b);
                  });
                  if (dateKeys.length === 0) return null;
                  const todayStr = fmtETDate(new Date().toISOString());
                  const tomorrowStr = fmtETDate(new Date(Date.now() + 86400000).toISOString());
                  return dateKeys.map((d) => {
                    const isToday = d === todayStr;
                    const isTomorrow = d === tomorrowStr;
                    const dateLabel = isToday
                      ? 'TODAY'
                      : isTomorrow
                      ? 'TOMORROW'
                      : new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                    return (
                      <section data-game-date={d} style={{ marginTop: '1.5rem' }}>
                        <h2
                          data-game-date-header
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: isToday ? '#FFB81C' : 'rgba(255,255,255,0.55)',
                            marginBottom: '0.75rem',
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '0.75rem',
                          }}
                        >
                          {dateLabel}
                          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                            {grouped[d].length} {grouped[d].length === 1 ? 'game' : 'games'}
                          </span>
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {grouped[d].map(g => <GameCard key={g.id} game={g} showLocalTime={showLocalTime} onNavigate={navigateToGame} />)}
                        </div>
                      </section>
                    );
                  });
                })()}
              </>
            );
          })()}
          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                data-testid="load-more"
                style={{
                  padding: '0.625rem 1.5rem',
                  background: loadingMore ? 'rgba(200,16,46,0.4)' : '#C8102E',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  cursor: loadingMore ? 'wait' : 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!loadingMore) e.currentTarget.style.background = '#a30d24'; }}
                onMouseLeave={e => { if (!loadingMore) e.currentTarget.style.background = '#C8102E'; }}
              >
                {loadingMore ? 'Loading…' : 'Show More Games'}
              </button>
            </div>
          )}
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8125rem', marginTop: '1.25rem' }}>
            {totalShown} game{totalShown === 1 ? '' : 's'} shown
            {hasMore ? ' — refine your filters or load more above.' : '.'}
          </p>
        </>
      )}

      {/* Ticketmaster NHL Banner - 300x250 */}
    </div>
  );
}
