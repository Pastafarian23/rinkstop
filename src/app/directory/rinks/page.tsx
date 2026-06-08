'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SearchIcon, FilterIcon, ChevronRightIcon } from '@/components/icons';

// ------ Types ----------------------------------------------------------------------------------------------------------------------------------------
interface Rink {
  id: string;
  name: string;
  city?: string;
  province_state?: string;
  country?: string;
  capacity?: number;
  ice_size?: string;
  claimed_by_tier?: string | null;
  claimed_by_user_id?: string | null;
}

// ------ Page ------------------------------------------------------------------------------------------------------------------------------------------
export default function RinksPage() {
  const [rinks, setRinks] = useState<Rink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/rinks?sort=tier')
      .then(r => r.json())
      .then(d => {
        // API returns {count, data} shape — extract data array
        const list = Array.isArray(d) ? d : (d?.data || []);
        setRinks(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const verifiedCount = rinks.filter(r => r.claimed_by_tier === 'verified' || r.claimed_by_tier === 'pro').length;

  const filtered = rinks.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.city || '').toLowerCase().includes(search.toLowerCase());
    const matchCountry = !country || (r.country || '').toLowerCase().includes(country.toLowerCase());
    const matchVerified = !verifiedOnly || r.claimed_by_tier === 'verified' || r.claimed_by_tier === 'pro';
    return matchSearch && matchCountry && matchVerified;
  });

  const clearFilters = () => { setSearch(''); setCountry(''); };
  const hasFilters = search || country;

  const formatLocation = (r: Rink) => {
    const parts = [r.city, r.province_state, r.country].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Rinks</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className="label">Directory</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          RINKS &amp; ARENAS
        </h1>
      </div>

      {/* View on Map button */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          href="/directory/map"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--red)', color: '#fff', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
          View All Rinks on Map
        </Link>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', padding: '0.875rem 1rem', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#555555' }}>
          <FilterIcon className="w-4 h-4" />
        </div>
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#555555', pointerEvents: 'none' }}>
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search rinks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <input
          type="text"
          placeholder="Country"
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="input-field"
          style={{ flex: '0 0 150px' }}
        />
        <button
          onClick={() => setVerifiedOnly(v => !v)}
          style={{
            background: verifiedOnly ? 'rgba(20,184,166,0.15)' : 'transparent',
            border: `1.5px solid ${verifiedOnly ? '#14B8A6' : 'rgba(255,255,255,0.2)'}`,
            color: verifiedOnly ? '#14B8A6' : 'rgba(255,255,255,0.6)',
            borderRadius: '3px', padding: '0.5rem 0.875rem',
            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
            letterSpacing: '0.07em', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          Verified only ({verifiedCount})
        </button>
        {hasFilters && (
          <button onClick={clearFilters} style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '3px', padding: '0.5rem 0.875rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      {!loading && (
        <p style={{ fontSize: '0.75rem', color: '#555555', letterSpacing: '0.04em', marginBottom: '1rem' }}>
          {filtered.length === 0 ? 'No results' : `${filtered.length} rink${filtered.length !== 1 ? 's' : ''}`}
          {hasFilters ? ' matching your search' : ' in directory'}
        </p>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem' }}>
                <div className="skeleton" style={{ height: '1.125rem', width: '70%', marginBottom: '0.625rem' }} />
                <div className="skeleton" style={{ height: '0.875rem', width: '50%', marginBottom: '0.5rem' }} />
                <div className="skeleton" style={{ height: '0.75rem', width: '35%' }} />
              </div>
            ))
          : filtered.length === 0
            ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '1rem' }}>No rinks found matching your search</p>
                <button onClick={clearFilters} style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Clear all filters</button>
              </div>
            )
            : filtered.map(rink => (
              <Link
                key={rink.id}
                href={`/directory/rinks/${rink.id}`}
                style={{
                  display: 'block', textDecoration: 'none',
                  background: rink.claimed_by_tier === 'pro' ? 'linear-gradient(135deg, rgba(200,16,46,0.08) 0%, var(--s2) 100%)' : 'var(--s2)',
                  border: `1px solid ${rink.claimed_by_tier === 'pro' ? 'rgba(200,16,46,0.5)' : rink.claimed_by_tier === 'verified' ? 'rgba(20,184,166,0.4)' : 'var(--border)'}`,
                  borderRadius: '6px',
                  padding: '1.125rem',
                  position: 'relative',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-h)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {/* Featured/Verified badge in the corner */}
                {rink.claimed_by_tier === 'pro' && (
                  <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'var(--red)', color: '#fff' }}>
                    ⭐ Featured
                  </div>
                )}
                {rink.claimed_by_tier === 'verified' && (
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.4)' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Verified
                  </div>
                )}
                <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', marginBottom: '0.3rem', paddingRight: rink.claimed_by_tier ? 80 : 0 }}>
                  {rink.name}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: "0.75rem", lineHeight: 1 }}>📍</span>
                  {formatLocation(rink)}
                </p>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {rink.ice_size && (
                    <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(4,30,66,0.7)', color: 'rgba(200,220,255,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {rink.ice_size}
                    </span>
                  )}
                  {rink.capacity && (
                    <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(200,16,46,0.15)', color: 'var(--red)' }}>
                      {rink.capacity.toLocaleString()}
                    </span>
                  )}
                </div>
              </Link>
            ))
        }
      </div>
    </div>
  );
}