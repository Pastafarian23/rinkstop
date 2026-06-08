'use client';
import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import TicketmasterAd from '@/components/TicketmasterAd';
import { SCORE_CHIPS, DEFAULT_CHIP, DEFAULT_TIME, DEFAULT_PAGE_SIZE, getChip } from '@/lib/score-chips';

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
  league: { id: string; name: string; slug: string } | null;
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

const statusStyle: Record<string, { color: string; label: string }> = {
  scheduled:  { color: '#555',    label: 'Scheduled'  },
  in_progress:{ color: '#00d4ff', label: 'Live'       },
  completed: { color: '#34d399', label: 'Final'      },
  cancelled: { color: '#C8102E', label: 'Cancelled'  },
  postponed:  { color: '#fbbf24', label: 'Postponed'  },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function GameCard({ game }: { game: Game }) {
  const s = statusStyle[game.status] || statusStyle.scheduled;
  const homeName = game.home_team?.name || 'Home';
  const awayName = game.away_team?.name || 'Away';
  const homeSlug = game.home_team?.slug;
  const awaySlug = game.away_team?.slug;

  return (
    <div style={{
      background: 'var(--s2)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '1rem 1.25rem',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      gap: '1rem',
    }}>
      <div style={{ textAlign: 'left' }}>
        {homeSlug ? (
          <Link href={`/directory/teams/${homeSlug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {game.home_team?.logo_url && (
              <img src={game.home_team.logo_url} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            )}
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{homeName}</p>
          </Link>
        ) : (
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{homeName}</p>
        )}
      </div>

      <div style={{ textAlign: 'center', minWidth: '80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{game.home_score ?? '-'}</span>
          <span style={{ color: '#333', fontSize: '0.875rem' }}>@</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{game.away_score ?? '-'}</span>
        </div>
        <p style={{ fontSize: '0.6875rem', color: '#555', marginTop: '0.25rem' }}>{formatDate(game.scheduled_at || game.date)}</p>
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
        {awaySlug ? (
          <Link href={`/directory/teams/${awaySlug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{awayName}</p>
            {game.away_team?.logo_url && (
              <img src={game.away_team.logo_url} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            )}
          </Link>
        ) : (
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>{awayName}</p>
        )}
      </div>

      {game.league?.name && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '0.25rem' }}>
          <span style={{ fontSize: '0.6875rem', color: '#666' }}>{game.league.name}</span>
        </div>
      )}
    </div>
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
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#888' }}>
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

function GamesPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read filters from URL with defaults
  const league = searchParams.get('league') || DEFAULT_CHIP;
  const team = searchParams.get('team') || '';
  const time = searchParams.get('time') || DEFAULT_TIME;
  const subleague = searchParams.get('subleague') || '';

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

  // Game list
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalShown, setTotalShown] = useState(0);

  // Reset & refetch on filter change
  useEffect(() => {
    setLoading(true);
    setGames([]);
    setTotalShown(0);
    setHasMore(false);
    fetch(`/api/scores?league=${league}&time=${time}${team ? `&team=${team}` : ''}${subleague ? `&subleague=${subleague}` : ''}&limit=${DEFAULT_PAGE_SIZE}&offset=0`)
      .then(r => r.json())
      .then((d: ApiResponse) => {
        setGames(d?.data || []);
        setHasMore(!!d?.hasMore);
        setTotalShown(d?.count || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [league, time, team, subleague]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetch(`/api/scores?league=${league}&time=${time}${team ? `&team=${team}` : ''}${subleague ? `&subleague=${subleague}` : ''}&limit=${DEFAULT_PAGE_SIZE}&offset=${games.length}`)
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
  const isDefault = league === DEFAULT_CHIP && time === DEFAULT_TIME && !team && !subleague;

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
    const events = games.map(g => ({
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
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Scores</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <div className="label">Live &amp; Recent</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          SCORES &amp; FIXTURES
        </h1>
      </div>

      <div style={{ height: '2px', background: 'linear-gradient(90deg, #C8102E 0%, #041E42 100%)', borderRadius: '2px', marginBottom: '1.5rem', width: '80px' }} />

      {/* Filter bar: chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        {SCORE_CHIPS.map(c => {
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
                color: active ? '#fff' : '#A0A0A0',
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
              color: '#888',
              border: '1px dashed var(--border)',
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Filter bar: dropdowns (conditional by chip type) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
        {isLeagueChip ? (
          <>
            <Dropdown
              label="Team"
              value={team}
              onChange={v => updateParam('team', v)}
              options={[{ value: '', label: 'All Teams' }, ...teams.map(t => ({ value: t.slug, label: t.name }))]}
            />
            <Dropdown
              label="Time"
              value={time}
              onChange={v => updateParam('time', v)}
              options={[
                { value: 'current', label: 'Current' },
                { value: 'historical', label: 'Historical' },
              ]}
            />
          </>
        ) : (
          <>
            <Dropdown
              label="Time"
              value={time}
              onChange={v => updateParam('time', v)}
              options={[
                { value: 'current', label: 'Current' },
                { value: 'historical', label: 'Historical' },
              ]}
            />
            <Dropdown
              label="League"
              value={subleague}
              onChange={v => updateParam('subleague', v)}
              options={[{ value: '', label: 'All' }, ...subleagueOptions]}
            />
          </>
        )}
      </div>

      {/* Ticketmaster NHL Banner - 468x60 */}
      <TicketmasterAd size="468x60" />

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
            {games.map(g => <GameCard key={g.id} game={g} />)}
          </div>
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
      <TicketmasterAd size="300x250" style={{ marginTop: '2rem' }} />
    </div>
  );
}

export default function GamesPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} /></div>}>
      <GamesPageInner />
    </Suspense>
  );
}
