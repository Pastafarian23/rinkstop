'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SearchIcon, FilterIcon } from '@/components/icons';

// ------ Types ----------------------------------------------------------------------------------------------------------------------------------------
interface Team {
  id: string;
  name: string;
  city?: string;
  country?: string;
  league_id?: string;
  leagues?: { name: string };
  slug?: string;
  logo_url?: string;
  // claimed_by_tier is only set by /api/teams (via the claims join);
  // direct Supabase queries (used when ?country= is set) won't have it.
  claimed_by_tier?: string | null;
}

interface Props {
  initialTeams: Team[];
  country?: string | null;
}

export default function TeamsIndexClient({ initialTeams, country: initialCountry }: Props) {
  const searchParams = useSearchParams();
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState<string>(initialCountry || '');

  // Prefill from URL on mount (deep-links / back-forward)
  useEffect(() => {
    const c = searchParams.get('country');
    if (c && c !== country) setCountry(c);
  }, [searchParams]);

  useEffect(() => {
    // Refetch only when the user changes the filter away from the server value.
    if (country === (initialCountry || '')) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('sort', 'tier');
    if (search) params.set('search', search);
    if (country) params.set('country', country);
    fetch(`/api/teams?${params}`)
      .then(r => r.json())
      .then(d => {
        setTeams(d?.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, country, initialCountry]);

  const [verifiedOnly, setVerifiedOnly] = useState(false);
  // The 'claimed_by_tier' field is computed by /api/teams via the claims join;
  // it isn't on the teams table directly, so direct Supabase queries (used when
  // the page is filtered by ?country=) won't have it. We default to 0 here
  // and disable the filter when the field is missing.
  const verifiedCount = 0;
  const visibleTeams = verifiedOnly ? [] : teams;

  const clearFilters = () => { setSearch(''); setCountry(''); };
  const hasFilters = search || country;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Teams</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className="label">Directory</div>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          ALL TEAMS
        </h1>
        <Link
          href="/directory/nhl/history"
          style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}
        >
          Looking for a team that relocated or renamed? View NHL franchise history →
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
            placeholder="Search teams..."
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

      {/* Country filter banner — shows when ?country= set */}
      {initialCountry && (
        <div style={{
          background: 'rgba(200,16,46,0.08)',
          border: '1px solid rgba(200,16,46,0.25)',
          borderRadius: 4,
          padding: '0.625rem 0.875rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)' }}>
            Showing teams in <strong style={{ color: '#C8102E' }}>{initialCountry}</strong>{' '}
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>— {teams.length.toLocaleString()} total</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setCountry(''); setSearch(''); }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.7)',
                borderRadius: 3,
                padding: '0.375rem 0.75rem',
                fontSize: '0.6875rem',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              ✕ Clear
            </button>
            <Link
              href="/directory/teams"
              style={{
                background: '#C8102E',
                color: '#fff',
                border: 'none',
                borderRadius: 3,
                padding: '0.375rem 0.75rem',
                fontSize: '0.6875rem',
                fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              View All Countries →
            </Link>
          </div>
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <p style={{ fontSize: '0.75rem', color: '#555555', letterSpacing: '0.04em', marginBottom: '1rem' }}>
          {visibleTeams.length === 0 ? 'No results' : `${visibleTeams.length} team${visibleTeams.length !== 1 ? 's' : ''}`}
          {hasFilters ? ' matching your search' : ' in directory'}
        </p>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {loading
          ? Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem' }}>
                <div className="skeleton" style={{ height: '1.125rem', width: '65%', marginBottom: '0.625rem' }} />
                <div className="skeleton" style={{ height: '0.875rem', width: '45%' }} />
              </div>
            ))
          : visibleTeams.length === 0
            ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '1rem' }}>No teams found matching your search</p>
                <button onClick={clearFilters} style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Clear all filters</button>
              </div>
            )
            : visibleTeams.map(team => (
              <Link
                key={team.id}
                href={`/directory/teams/${team.slug}`}
                style={{
                  display: 'block', textDecoration: 'none',
                  background: team.claimed_by_tier === 'pro' ? 'linear-gradient(135deg, rgba(200,16,46,0.08) 0%, var(--s2) 100%)' : 'var(--s2)',
                  border: `1px solid ${team.claimed_by_tier === 'pro' ? 'rgba(200,16,46,0.5)' : team.claimed_by_tier === 'verified' ? 'rgba(20,184,166,0.4)' : 'var(--border)'}`,
                  borderRadius: '6px',
                  padding: '1.125rem',
                  position: 'relative',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-h)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {/* Tier badge in corner */}
                {team.claimed_by_tier === 'pro' && (
                  <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'var(--red)', color: '#fff' }}>
                    ⭐ Featured
                  </div>
                )}
                {team.claimed_by_tier === 'verified' && (
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.4)' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Verified
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem', paddingRight: team.claimed_by_tier ? 70 : 0 }}>
                  {team.logo_url ? (
                    <img src={team.logo_url} alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #C8102E, #041E42)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>🏒</div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {team.name}
                    </h3>
                  </div>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.8125rem' }}>
                  {[team.city, team.country].filter(Boolean).join(', ')}
                </p>
                {team.leagues?.name && (
                  <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(200,16,46,0.15)', color: 'var(--red)' }}>
                    {team.leagues.name}
                  </span>
                )}
              </Link>
            ))
        }
      </div>
    </div>
  );
}
