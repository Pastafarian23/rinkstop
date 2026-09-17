'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { SCORE_CHIPS, DEFAULT_CHIP, DEFAULT_TIME, DEFAULT_PAGE_SIZE, getChip } from '@/lib/score-chips';
import { formatGameTime, timezoneForGame, tzAbbr } from '@/lib/game-time';

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

function GameCard({ game }: { game: Game }) {
  // Per-game timezone — pick from the league if known, else default to ET
  // (most of the data is NHL/AHL/PWHL). The explicit abbreviation is what
  // makes the time meaningful to a reader anywhere on earth.
  const tz = timezoneForGame({ leagueSlug: game.league?.slug, countryCode: undefined });
  const s = statusStyle[game.status] || statusStyle.scheduled;
  const homeName = game.home_team?.name || 'Home';
  const awayName = game.away_team?.name || 'Away';

  return (
    <Link
      href={`/directory/games/${game.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: '1rem',
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        textDecoration: 'none',
        color: 'inherit',
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
      <div style={{ textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {game.home_team?.logo_url && (
            <img src={game.home_team.logo_url} alt={`${homeName} logo`} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          )}
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', margin: 0 }}>{homeName}</p>
        </div>
      </div>

      <div style={{ textAlign: 'center', minWidth: '80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{game.home_score ?? '-'}</span>
          <span style={{ color: '#333', fontSize: '0.875rem' }}>@</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{game.away_score ?? '-'}</span>
        </div>
        <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>
          {formatDate(game.scheduled_at || game.date, tz)}
          <span style={{ marginLeft: '0.375rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{tzAbbr(tz)}</span>
        </p>
        <span style={{
          display: 'inline-block',
          marginTop: '0.25rem',
          padding: '0.15rem 0.4rem',
          borderRadius: '99px',
          fontSize: '0.5rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: s.color,
          border: `1px solid ${s.color}40`,
        }}>
          {s.label}
        </span>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', margin: 0 }}>{awayName}</p>
          {game.away_team?.logo_url && (
            <img src={game.away_team.logo_url} alt={`${awayName} logo`} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          )}
        </div>
      </div>

      {game.league?.name && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '0.25rem' }}>
          <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>{game.league.name}</span>
        </div>
      )}
    </Link>
  );
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

  // Reset & refetch on filter change
  useEffect(() => {
    setLoading(true);
    setGames([]);
    setTotalShown(0);
    setHasMore(false);
    fetch(`/api/scores?league=${league}&time=${time}${team ? `&team=${team}` : ''}${subleague ? `&subleague=${subleague}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}&limit=${DEFAULT_PAGE_SIZE}&offset=0`)
      .then(r => r.json())
      .then((d: ApiResponse) => {
        setGames(d?.data || []);
        setHasMore(!!d?.hasMore);
        setTotalShown(d?.count || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [league, time, team, subleague, q]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetch(`/api/scores?league=${league}&time=${time}${team ? `&team=${team}` : ''}${subleague ? `&subleague=${subleague}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}&limit=${DEFAULT_PAGE_SIZE}&offset=${games.length}`)
      .then(r => r.json())
      .then((d: ApiResponse) => {
        setGames(prev => [...prev, ...(d?.data || [])]);
        setHasMore(!!d?.hasMore);
        setTotalShown(prev => prev + (d?.count || 0));
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  };

  // URL update helper
  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

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
    const events = games.map((g: any): Record<string, any> => ({
      '@type': 'SportsEvent',
      name: `${g.home_team?.name || 'Home'} vs ${g.away_team?.name || 'Away'}`,
      startDate: g.scheduled_at,
      location: undefined,
      competitor: [
        g.home_team ? { '@type': 'SportsTeam', name: g.home_team.name } : undefined,
        g.away_team ? { '@type': 'SportsTeam', name: g.away_team.name } : undefined,
      ].filter(Boolean),
    }));
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify([breadcrumbSchema, ...events]);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [games]);

  // Empty state message varies by chip
  const emptyMessage = useMemo(() => {
    if (loading) return null;
    if (games.length > 0) return null;
    if (time === 'historical') {
      return {
        title: 'No archived games found.',
        sub: 'Try switching to Current to see recent and upcoming games.',
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
  }, [chip, time, games.length, loading]);

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
          inline on each card. */}
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', marginBottom: '1rem', lineHeight: 1.5, fontStyle: 'italic' }}>
        All start times are shown in Eastern Time (ET). For venues outside
        the Eastern Time zone, each game card shows the timezone
        abbreviation. Game times are local to each venue at puck drop.
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
                    {games.map(g => <GameCard key={g.id} game={g} />)}
                  </div>
                </section>
              );
            }
            const upcoming = games.filter(g => g.status === 'scheduled' || g.status === 'in_progress');
            const completed = games.filter(g => g.status === 'completed');
            return (
              <>
                {upcoming.length > 0 && (
                  <section style={{ marginTop: '1.25rem' }}>
                    <h2 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
                      Upcoming ({upcoming.length})
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {upcoming.map(g => <GameCard key={g.id} game={g} />)}
                    </div>
                  </section>
                )}
                {completed.length > 0 && (
                  <section style={{ marginTop: '1.75rem' }}>
                    <h2 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
                      Recently Completed ({completed.length})
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {completed.map(g => <GameCard key={g.id} game={g} />)}
                    </div>
                  </section>
                )}
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
