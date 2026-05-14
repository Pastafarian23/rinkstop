'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SearchIcon, FilterIcon, ChevronRightIcon } from '@/components/icons';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Player {
  id: string;
  first_name: string;
  last_name: string;
  position?: string;
  jersey_number?: number | string;
  nationality?: string;
  headshot_url?: string;
  teams?: { name: string };
}

const POSITIONS = [
  { value: 'goalie', label: 'Goalie' },
  { value: 'defenseman', label: 'Defenseman' },
  { value: 'forward', label: 'Forward' },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function PlayerCardSkeleton() {
  return (
    <div className="card-player p-5" style={{ minHeight: '100px' }}>
      <div className="skeleton mb-2" style={{ height: '1.25rem', width: '65%' }} />
      <div className="skeleton mb-3" style={{ height: '0.875rem', width: '40%' }} />
      <div className="skeleton" style={{ height: '1rem', width: '30%' }} />
    </div>
  );
}

// ─── Position badge color ─────────────────────────────────────────────────────
function positionBadgeClass(position?: string): string {
  if (!position) return 'badge badge-slate';
  const p = position.toLowerCase();
  if (p === 'goalie') return 'badge badge-gold';
  if (p === 'defenseman') return 'badge badge-blue';
  return 'badge badge-teal';
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (position) params.set('position', position);
    if (country) params.set('country', country);
    fetch(`/api/players?${params}`)
      .then(r => r.json())
      .then(d => {
        setPlayers(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, position, country]);

  const clearFilters = () => {
    setSearch('');
    setPosition('');
    setCountry('');
  };

  const hasFilters = search || position || country;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 mb-8"
        style={{ fontSize: '0.75rem', color: '#555555' }}
      >
        <Link href="/" style={{ color: '#555555', textDecoration: 'none' }} className="hover:text-white transition-colors">Home</Link>
        <ChevronRightIcon className="w-3 h-3" />
        <Link href="/directory" style={{ color: '#555555', textDecoration: 'none' }} className="hover:text-white transition-colors">Directory</Link>
        <ChevronRightIcon className="w-3 h-3" />
        <span style={{ color: '#A0A0A0' }}>Players</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="section-label">Directory</div>
        <h1
          className="font-black text-white"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', letterSpacing: '-0.02em', lineHeight: 1 }}
        >
          PLAYERS DIRECTORY
        </h1>
      </div>

      {/* Filter Bar */}
      <div
        className="flex flex-wrap gap-3 mb-8 p-4"
        style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '4px' }}
      >
        <div className="flex items-center gap-2 text-[#555555]">
          <FilterIcon className="w-4 h-4" />
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#555555' }}>
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
        <select
          value={position}
          onChange={e => setPosition(e.target.value)}
          className="select-field"
          style={{ width: '160px' }}
        >
          <option value="">All Positions</option>
          {POSITIONS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Nationality"
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="input-field"
          style={{ width: '140px' }}
        />
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="btn-secondary text-xs py-1.5"
            style={{ whiteSpace: 'nowrap' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      {!loading && (
        <p
          className="mb-5"
          style={{ fontSize: '0.75rem', color: '#555555', letterSpacing: '0.04em' }}
        >
          {players.length === 0
            ? 'No results'
            : `${players.length} player${players.length !== 1 ? 's' : ''}`}
          {hasFilters ? ' matching your search' : ' in directory'}
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <PlayerCardSkeleton key={i} />)
          : players.length === 0
            ? (
              <div className="col-span-full py-16 text-center" style={{ color: '#555555' }}>
                <p className="text-lg font-semibold text-[#333333] mb-2">No players found matching your search</p>
                <p className="text-sm">Try adjusting your filters or&nbsp;
                  <button
                    onClick={clearFilters}
                    style={{ color: '#00C2B2', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    clear all filters
                  </button>
                </p>
              </div>
            )
            : players.map(player => (
              <Link
                key={player.id}
                href={`/directory/players/${player.id}`}
                className="card-player p-5"
                style={{ textDecoration: 'none', position: 'relative' }}
              >
                {/* Jersey number watermark */}
                {player.jersey_number && (
                  <div
                    className="absolute top-3 right-4 font-black select-none pointer-events-none"
                    style={{
                      fontSize: '3rem',
                      lineHeight: 1,
                      color: 'rgba(255,255,255,0.04)',
                      letterSpacing: '-0.04em',
                    }}
                  >
                    {player.jersey_number}
                  </div>
                )}
                <div className="relative z-10">
                  <div className="flex items-start gap-3 mb-3">
                    {player.headshot_url ? (
                      <img
                        src={player.headshot_url}
                        alt=""
                        className="w-10 h-10 rounded-sm object-cover flex-shrink-0"
                        style={{ background: '#1a1a1a' }}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 flex-shrink-0 rounded-sm flex items-center justify-center"
                        style={{ background: '#1a1a1a', color: '#333333', fontSize: '1.125rem' }}
                      >
                        {(player.first_name?.[0] || '') + (player.last_name?.[0] || '')}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-white leading-tight" style={{ fontSize: '0.9375rem' }}>
                        {player.first_name} {player.last_name}
                      </h3>
                      {player.nationality && (
                        <p className="text-[#555555] text-sm">{player.nationality}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {player.position && (
                      <span className={positionBadgeClass(player.position)}>
                        {player.position.replace('_', ' ')}
                      </span>
                    )}
                    {player.teams?.name && (
                      <span className="badge badge-slate">{player.teams.name}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))
        }
      </div>
    </div>
  );
}
