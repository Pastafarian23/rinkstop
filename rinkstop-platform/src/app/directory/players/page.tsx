'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

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

function positionBadgeStyle(cssClass: string): string {
  if (cssClass === 'badge badge-gold') return 'background:#B8860B;color:#fff';
  if (cssClass === 'badge badge-blue') return 'background:#1565C0;color:#fff';
  if (cssClass === 'badge badge-teal') return 'background:#00695C;color:#fff';
  return 'background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6)';
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
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <a href="/" style={{ color: '#555', textDecoration: 'none' }}>Home</a>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <a href="/directory" style={{ color: '#555', textDecoration: 'none' }}>Directory</a>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Players</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C8102E', marginBottom: '0.5rem' }}>Directory</div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1 }}>
          PLAYERS DIRECTORY
        </h1>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', padding: '0.875rem 1rem', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#555' }}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
        </div>
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#555', pointerEvents: 'none' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <input type="text" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="input-field" style={{ paddingLeft: '2.25rem' }} />
        </div>
        <select value={position} onChange={e => setPosition(e.target.value)} className="select-field" style={{ width: '160px' }}>
          <option value="">All Positions</option>
          {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <input type="text" placeholder="Nationality" value={country} onChange={e => setCountry(e.target.value)} className="input-field" style={{ width: '140px' }} />
        {hasFilters && <button onClick={clearFilters} className="btn-secondary text-xs py-1.5" style={{ whiteSpace: 'nowrap' }}>Clear</button>}
      </div>

      {/* Results count */}
      {!loading && (
        <p style={{ fontSize: '0.75rem', color: '#555', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>
          {players.length === 0 ? 'No results' : `${players.length} player${players.length !== 1 ? 's' : ''}`}{hasFilters ? ' matching your search' : ' in directory'}
        </p>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem' }}>
                <div className="skeleton" style={{ height: '1.125rem', width: '70%', marginBottom: '0.625rem' }} />
                <div className="skeleton" style={{ height: '0.875rem', width: '45%' }} />
              </div>
            ))
          : players.length === 0
            ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 1rem', color: '#555' }}>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: '#333', marginBottom: '0.5rem' }}>No players found matching your search</p>
                <p style={{ fontSize: '0.875rem' }}>Try adjusting your filters or <button onClick={clearFilters} style={{ color: '#00C2B2', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>clear all filters</button></p>
              </div>
            )
            : players.map(player => (
              <Link key={player.id} href={`/directory/players/${player.id}`} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem', textDecoration: 'none', position: 'relative', display: 'block' }}>
                {player.jersey_number && (
                  <div style={{ position: 'absolute', top: '0.75rem', right: '1rem', fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', lineHeight: 1, color: 'rgba(255,255,255,0.06)', letterSpacing: '-0.04em' }}>
                    {player.jersey_number}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {player.headshot_url
                    ? <img src={player.headshot_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0, background: '#1a1a1a' }} />
                    : <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: '#1a1a1a', color: '#333', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{(player.first_name?.[0] || '') + (player.last_name?.[0] || '')}</div>
                  }
                  <div>
                    <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', lineHeight: 1.3 }}>{player.first_name} {player.last_name}</p>
                    {player.nationality && <p style={{ color: '#555', fontSize: '0.8125rem' }}>{player.nationality}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {player.position && <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '3px', textTransform: 'capitalize', background: position.includes('goalie') ? '#B8860B' : position.includes('defense') ? '#1565C0' : '#00695C', color: '#fff' }}>{player.position.replace('_', ' ')}</span>}
                  {player.teams?.name && <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>{player.teams.name}</span>}
                </div>
              </Link>
            ))
        }
      </div>
    </main>
  );
}