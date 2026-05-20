'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Coach {
  id: string;
  first_name: string;
  last_name: string;
  position?: string;
  certification_level?: string;
  nationality?: string;
  phone?: string;
  email?: string;
  teams?: { name: string; logo_url?: string };
}

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (country) params.set('country', country);
    fetch(`/api/coaches?${params}`)
      .then(r => r.json())
      .then(d => {
        setCoaches(d?.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, country]);

  const clearFilters = () => { setSearch(''); setCountry(''); };
  const hasFilters = search || country;

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <a href="/" style={{ color: '#555', textDecoration: 'none' }}>Home</a>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <a href="/directory" style={{ color: '#555', textDecoration: 'none' }}>Directory</a>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Coaches</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C8102E', marginBottom: '0.5rem' }}>Directory</div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1 }}>
          COACHES DIRECTORY
        </h1>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', padding: '0.875rem 1rem', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#555' }}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#555', pointerEvents: 'none' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <input type="text" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="input-field" style={{ paddingLeft: '2.25rem' }} />
        </div>
        <input type="text" placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} className="input-field" style={{ width: '140px' }} />
        {hasFilters && <button onClick={clearFilters} className="btn-secondary text-xs py-1.5" style={{ whiteSpace: 'nowrap' }}>Clear</button>}
      </div>

      {!loading && (
        <p style={{ fontSize: '0.75rem', color: '#555', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>
          {coaches.length === 0 ? 'No results' : `${coaches.length} coach${coaches.length !== 1 ? 's' : ''}`}{hasFilters ? ' matching your search' : ' in directory'}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem' }}>
                <div className="skeleton" style={{ height: '1.125rem', width: '70%', marginBottom: '0.625rem' }} />
                <div className="skeleton" style={{ height: '0.875rem', width: '45%' }} />
              </div>
            ))
          : coaches.length === 0
            ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 1rem', color: '#555' }}>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: '#333', marginBottom: '0.5rem' }}>No coaches found</p>
                <p style={{ fontSize: '0.875rem' }}>Try adjusting your search or <button onClick={clearFilters} style={{ color: '#00C2B2', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>clear filters</button></p>
              </div>
            )
            : coaches.map(coach => (
              <Link key={coach.id} href={`/directory/coaches/${coach.id}`} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem', textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, flexShrink: 0 }}>
                    {(coach.first_name?.[0] || '') + (coach.last_name?.[0] || '')}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', lineHeight: 1.3 }}>{coach.first_name} {coach.last_name}</p>
                    {coach.position && <p style={{ color: '#555', fontSize: '0.8125rem' }}>{coach.position}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {coach.certification_level && <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '3px', background: 'rgba(200,16,46,0.2)', color: '#C8102E' }}>{coach.certification_level}</span>}
                  {coach.teams?.name && <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>{coach.teams.name}</span>}
                </div>
              </Link>
            ))
        }
      </div>
    </main>
  );
}