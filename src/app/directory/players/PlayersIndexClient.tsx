'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SearchIcon, FilterIcon } from '@/components/icons';

// ------ Types ----------------------------------------------------------------------------------------------------------------------------------------
interface Player {
  id: string;
  first_name: string;
  last_name: string;
  position?: string;
  jersey_number?: number | string;
  nationality?: string;
  headshot_url?: string;
  shoots?: string;
  height_cm?: number;
  weight_kg?: number;
  birth_date?: string;
  teams?: {
    name: string;
    logo_url?: string;
    league_id?: string;
    leagues?: { name: string; slug: string };
  };
}

interface League { id: string; name: string; }
interface Team { id: string; name: string; league_id?: string; }

interface InitialData {
  players: Player[];
  totalCount: number;
  totalPages: number;
  leagues: League[];
  page: number;
  pageSize: number;
}

const POSITIONS = [
  { value: 'forward', label: 'Forward' },
  { value: 'defenseman', label: 'Defense' },
  { value: 'goalie', label: 'Goalie' },
];

const PAGE_SIZE = 24;

function BreadcrumbSeparator() {
  return <span style={{ margin: '0 0.3rem', color: 'rgba(255,255,255,0.2)' }}>›</span>;
}

// ------ Skeleton ----------------------------------------------------------------------------------------------------------------------------------
function PlayerCardSkeleton() {
  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.125rem' }}>
      <div className="skeleton mb-2" style={{ height: '1.125rem', width: '65%', marginBottom: '0.5rem' }} />
      <div className="skeleton mb-3" style={{ height: '0.875rem', width: '40%' }} />
      <div className="skeleton" style={{ height: '0.75rem', width: '30%' }} />
    </div>
  );
}

// ------ League badge color ----------------------------------------------------------------------------------------------------------------
function leagueBadgeStyle(leagueName?: string): React.CSSProperties {
  if (!leagueName) return { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' };
  const n = leagueName.toLowerCase();
  if (n.includes('nhl')) return { background: 'rgba(0,130,200,0.15)', color: '#0082C8' };
  if (n.includes('ahl')) return { background: 'rgba(0,150,80,0.15)', color: '#009650' };
  if (n.includes('khl')) return { background: 'rgba(200,30,30,0.15)', color: '#C81E1E' };
  if (n.includes('swedish') || n.includes('shl')) return { background: 'rgba(255,210,0,0.15)', color: '#FFD200' };
  if (n.includes('finnish') || n.includes('liiga')) return { background: 'rgba(20,100,200,0.15)', color: '#1464C8' };
  if (n.includes('del') || n.includes('deutsche')) return { background: 'rgba(220,180,0,0.15)', color: '#DCB400' };
  if (n.includes('czech')) return { background: 'rgba(30,80,180,0.15)', color: '#1E50B4' };
  if (n.includes('swiss') || n.includes('national league')) return { background: 'rgba(220,30,30,0.15)', color: '#DC1E1E' };
  if (n.includes('ohl')) return { background: 'rgba(255,140,0,0.15)', color: '#FF8C00' };
  if (n.includes('qmjhl') || n.includes('quebec')) return { background: 'rgba(220,30,30,0.15)', color: '#DC1E1E' };
  if (n.includes('whl')) return { background: 'rgba(0,100,180,0.15)', color: '#0064B4' };
  if (n.includes('echl')) return { background: 'rgba(140,60,180,0.15)', color: '#8C3CB4' };
  return { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' };
}

interface Props {
  initialData: InitialData;
}

export default function PlayersIndexClient({ initialData }: Props) {
  const [players, setPlayers] = useState<Player[]>(initialData.players);
  const [leagues, setLeagues] = useState<League[]>(initialData.leagues);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(initialData.totalCount);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);

  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [leagueId, setLeagueId] = useState('');
  const [teamId, setTeamId] = useState('');

  const [page, setPage] = useState(initialData.page);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const router = useRouter();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load teams when league changes
  useEffect(() => {
    if (!leagueId) { setTeams([]); setTeamId(''); return; }
    fetch(`/api/teams?leagueId=${leagueId}&activeOnly=true`)
      .then(r => r.json())
      .then(d => setTeams(d?.data || []))
      .catch(() => {});
    setTeamId('');
  }, [leagueId]);

  // Fetch players
  const fetchPlayers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (position) params.set('position', position);
    if (leagueId) params.set('leagueId', leagueId);
    if (teamId) params.set('teamId', teamId);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));

    fetch(`/api/players?${params}`)
      .then(r => r.json())
      .then(d => {
        setPlayers(d?.data || []);
        setTotalCount(d?.count || 0);
        setTotalPages(d?.totalPages || 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [debouncedSearch, position, leagueId, teamId, page]);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [debouncedSearch, position, leagueId, teamId]);

  const clearFilters = () => {
    setSearch(''); setPosition(''); setLeagueId(''); setTeamId('');
    setPage(1);
  };

  const hasFilters = search || position || leagueId || teamId;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-8" style={{ fontSize: '0.75rem', color: '#555555' }}>
        <Link href="/" style={{ color: '#555555', textDecoration: 'none' }} className="hover:text-white transition-colors">Home</Link>
        <BreadcrumbSeparator />
        <Link href="/directory" style={{ color: '#555555', textDecoration: 'none' }} className="hover:text-white transition-colors">Directory</Link>
        <BreadcrumbSeparator />
        <span style={{ color: '#A0A0A0' }}>Players</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="section-label">Directory</div>
        <h1 className="font-black text-white" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', letterSpacing: '-0.02em', lineHeight: 1 }}>
          PLAYERS DIRECTORY
        </h1>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.625rem', alignItems: 'center',
        marginBottom: '1.25rem', padding: '0.875rem 1rem',
        background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#555555' }}>
          <FilterIcon className="w-4 h-4" />
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#555555', pointerEvents: 'none' }}>
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        {/* Position */}
        <select value={position} onChange={e => setPosition(e.target.value)} className="input-field" style={{ flex: '0 0 150px' }}>
          <option value="">All Positions</option>
          {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        {/* League */}
        <select value={leagueId} onChange={e => setLeagueId(e.target.value)} className="input-field" style={{ flex: '0 0 170px' }}>
          <option value="">All Leagues</option>
          {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        {/* Team */}
        <select value={teamId} onChange={e => setTeamId(e.target.value)} className="input-field" style={{ flex: '0 0 160px' }} disabled={!leagueId}>
          <option value="">All Teams</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        {hasFilters && (
          <button onClick={clearFilters} style={{
            background: 'transparent', border: '1.5px solid rgba(255,255,255,0.3)',
            color: '#fff', borderRadius: '3px', padding: '0.5rem 0.875rem',
            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.07em', textTransform: 'uppercase',
          }}>
            Clear
          </button>
        )}
      </div>

      {/* Results count + pagination info */}
      {!loading && (
        <p style={{ fontSize: '0.75rem', color: '#555555', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>
          {totalCount === 0
            ? 'No results'
            : `${totalCount} player${totalCount !== 1 ? 's' : ''}${hasFilters ? ' matching your filters' : ' in directory'}`}
          {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
        </p>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
        {loading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <PlayerCardSkeleton key={i} />)
          : players.length === 0
            ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '1rem' }}>
                  No players found matching your filters
                </p>
                <button
                  onClick={clearFilters}
                  style={{ color: '#14B8A6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
                >
                  Clear all filters
                </button>
              </div>
            )
            : players.map(player => (
              <div
                key={player.id}
                onClick={() => router.push(`/directory/players/${player.id}`)}
                role="link"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') router.push(`/directory/players/${player.id}`); }}
                style={{
                  display: 'block',
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '1.125rem',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, transform 0.2s',
                  position: 'relative',
                  overflow: 'visible',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'var(--border-h)';
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'var(--border)';
                  el.style.transform = '';
                }}
              >
                {/* Jersey number watermark */}
                {player.jersey_number && (
                  <div style={{
                    position: 'absolute', top: '0.5rem', right: '0.75rem',
                    fontSize: '2.5rem', fontWeight: 900, lineHeight: 1,
                    color: 'rgba(255,255,255,0.04)', letterSpacing: '-0.04em', pointerEvents: 'none',
                  }}>
                    #{player.jersey_number}
                  </div>
                )}

                {/* Player info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {player.headshot_url ? (
                    <img
                      src={player.headshot_url}
                      alt={`${player.first_name} ${player.last_name} headshot`}
                      style={{ width: 44, height: 44, borderRadius: '4px', objectFit: 'cover', flexShrink: 0, background: '#1a1a1a' }}
                    />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: '4px', background: '#1a1a1a',
                      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', fontWeight: 700, color: '#444',
                    }}>
                      {(player.first_name?.[0] || '') + (player.last_name?.[0] || '')}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', lineHeight: 1.3 }}>
                      {player.first_name} {player.last_name}
                    </h3>
                    {player.nationality && (
                      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.8125rem' }}>{player.nationality}</p>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' as const }}>
                  {player.position && (
                    <span style={{
                      display: 'inline-block', fontSize: '0.5625rem', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                      padding: '0.15rem 0.4rem', borderRadius: '3px',
                      background: player.position === 'goalie' ? 'rgba(255,184,28,0.15)' : player.position === 'defenseman' ? 'rgba(30,91,156,0.15)' : 'rgba(20,184,166,0.15)',
                      color: player.position === 'goalie' ? '#FFB81C' : player.position === 'defenseman' ? '#4A90D9' : '#14B8A6',
                    }}>
                      {player.position.replace('_', ' ')}
                    </span>
                  )}
                  {player.teams?.name && (
                    <span style={{
                      display: 'inline-block', fontSize: '0.5625rem', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                      padding: '0.15rem 0.4rem', borderRadius: '3px',
                      background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)',
                    }}>
                      {player.teams.name}
                    </span>
                  )}
                  {player.teams?.leagues?.name && (
                    <span style={{
                      display: 'inline-block', fontSize: '0.5625rem', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                      padding: '0.15rem 0.4rem', borderRadius: '3px',
                      ...leagueBadgeStyle(player.teams.leagues.name),
                    }}>
                      {player.teams.leagues.name}
                    </span>
                  )}
                </div>
              </div>
            ))
        }
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '0.5rem 1rem', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: '4px',
              color: page === 1 ? '#333' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
            }}
          >
            ‹ Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                style={{
                  padding: '0.5rem 0.875rem',
                  background: page === pageNum ? 'var(--s2)' : 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: page === pageNum ? '#fff' : '#888',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: page === pageNum ? 700 : 400,
                }}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '0.5rem 1rem', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: '4px',
              color: page === totalPages ? '#333' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
