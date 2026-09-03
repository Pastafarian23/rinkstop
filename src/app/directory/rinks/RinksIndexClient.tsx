'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ShareButton from '@/components/ShareButton';
import type { SharePayload } from '@/lib/share';
import { FilterIcon } from '@/components/icons';
import CategorySearchBar from '@/components/CategorySearchBar';
import { provinceDisplayName } from '@/lib/ca-provinces';

// ------ Types ----------------------------------------------------------------------------------------------------------------------------------------
interface Rink {
  id: string;
  name: string;
  slug?: string;
  city?: string;
  province_state?: string;
  country?: string;
  capacity?: number;
  ice_size?: string;
  static_map_url?: string | null;
  claimed_by_tier?: string | null;
  claimed_by_user_id?: string | null;
}

interface Props {
  initialRinks: Rink[];
  country?: string | null;
}

export default function RinksIndexClient({ initialRinks, country: initialCountry }: Props) {
  const searchParams = useSearchParams();
  const [rinks, setRinks] = useState<Rink[]>(initialRinks);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  // The server already pre-filtered the list when ?country= is set,
  // so the initial state is correct. Client also re-reads ?country= on mount
  // for deep-links and back/forward navigation.
  const [country, setCountry] = useState<string>(initialCountry || '');

  // Prefill the country filter from the URL (?country=Sweden) on mount/hydration
  useEffect(() => {
    const c = searchParams.get('country');
    if (c && c !== country) setCountry(c);
  }, [searchParams]);

  useEffect(() => {
    // Re-fetch from the server whenever the country filter changes — the
    // server pre-filter is authoritative. We do NOT refetch on mount, because
    // the initial Rink list already reflects the country from the URL.
    if (country === (initialCountry || '')) return;
    setLoading(true);
    const url = country
      ? `/api/rinks?country=${encodeURIComponent(country)}&sort=tier`
      : '/api/rinks?sort=tier';
    fetch(url)
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.data || []);
        setRinks(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [country, initialCountry]);

  const [verifiedOnly, setVerifiedOnly] = useState(false);
  // A listing is "verified" if the claimant has a paid tier in either track.
  // Personal: identity_plus (or legacy pro/roster_plus). Business: business_listing+ (or legacy business_*).
  // Federation is always verified (it's a paid org tier).
  const VERIFIED_TIERS = new Set([
    'identity_plus',
    'business_listing', 'business_plus', 'club_starter', 'club_pro', 'club_elite', 'league', 'federation',
  ]);
  const verifiedCount = rinks.filter(r => r.claimed_by_tier && VERIFIED_TIERS.has(r.claimed_by_tier)).length;

  const filtered = rinks.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.city || '').toLowerCase().includes(search.toLowerCase());
    const matchCountry = !country || (r.country || '').toLowerCase().includes(country.toLowerCase());
    const matchVerified = !verifiedOnly || (r.claimed_by_tier != null && VERIFIED_TIERS.has(r.claimed_by_tier));
    return matchSearch && matchCountry && matchVerified;
  });

  const clearFilters = () => { setSearch(''); setCountry(''); };
  const hasFilters = search || country;

  const formatLocation = (r: Rink) => {
    const parts = [r.city, provinceDisplayName(r.province_state), r.country].filter(Boolean);
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

      {/* Header — h1 + View on Map + Share on a single row to save
          vertical space (2026-08-12). On mobile the action buttons
          wrap below the h1 via the flex-wrap. */}
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div className="label">Directory</div>
          <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
            RINKS &amp; ARENAS
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0, paddingTop: '0.25rem' }}>
          <Link
            href="/directory/map"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--red)', color: '#fff', borderRadius: '6px', padding: '0.5rem 0.875rem', fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
            <span>Map</span>
          </Link>
          <ShareButton
            payload={{
              title: 'Rinks & Arenas — RinkStop',
              text: 'Find ice rinks and arenas near you on RinkStop. Hours, contact info, reviews, and team listings.',
              url: 'https://rinkstop.com/directory/rinks',
            }}
            variant="dark"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', padding: '0.875rem 1rem', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#555555' }}>
          <FilterIcon className="w-4 h-4" />
        </div>
        {/* Search — homepage aesthetic, scoped to rinks.
            Does NOT narrow the grid (use URL ?q= param for that). */}
        <CategorySearchBar category="rink" page="/directory/rinks" maxWidth={600} />
        <input
          type="text"
          placeholder="Country"
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="input-field"
          style={{ flex: '1 1 130px', minWidth: 0 }}
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

      {/* Country filter banner — shows when ?country= set so user knows why they're filtered */}
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
            Showing rinks in <strong style={{ color: '#C8102E' }}>{initialCountry}</strong>{' '}
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>— {rinks.length.toLocaleString()} total</span>
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
              href="/directory/rinks"
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
          {filtered.length === 0 ? 'No results' : `${filtered.length} rink${filtered.length !== 1 ? 's' : ''}`}
          {hasFilters ? ' matching your search' : ' in directory'}
        </p>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.625rem' }}>
                <div className="skeleton" style={{ flexShrink: 0, width: 100, height: 100, borderRadius: 8 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="skeleton" style={{ height: '1.125rem', width: '70%', marginBottom: '0.625rem' }} />
                  <div className="skeleton" style={{ height: '0.875rem', width: '50%', marginBottom: '0.5rem' }} />
                  <div className="skeleton" style={{ height: '0.75rem', width: '35%' }} />
                </div>
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
                href={`/directory/rinks/${rink.slug || rink.id}`}
                style={{
                  display: 'flex', alignItems: 'stretch', gap: '0.75rem', textDecoration: 'none',
                  background: rink.claimed_by_tier && VERIFIED_TIERS.has(rink.claimed_by_tier) ? 'linear-gradient(135deg, rgba(200,16,46,0.08) 0%, var(--s2) 100%)' : 'var(--s2)',
                  border: `1px solid ${rink.claimed_by_tier && VERIFIED_TIERS.has(rink.claimed_by_tier) ? 'rgba(20,184,166,0.4)' : 'var(--border)'}`,
                  borderRadius: '6px',
                  padding: '0.625rem',
                  position: 'relative',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-h)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {/* Featured/Verified badge in the corner */}
                {(rink.claimed_by_tier === 'business_plus' || rink.claimed_by_tier === 'federation') && (                  <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'var(--red)', color: '#fff' }}>
                    ⭐ Featured
                  </div>
                )}
                {(rink.claimed_by_tier && VERIFIED_TIERS.has(rink.claimed_by_tier)) && (
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.4)' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Verified
                  </div>
                )}
                {/* Map thumbnail — server-rendered, lazy-loaded, no Google key in src */}
                <div style={{ flexShrink: 0, width: 100, height: 100, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {rink.static_map_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={rink.static_map_url}
                      alt={`Map showing the location of ${rink.name} in ${formatLocation(rink)}`}
                      width={100}
                      height={100}
                      loading="lazy"
                      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                      {rink.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', marginBottom: '0.3rem', paddingRight: rink.claimed_by_tier ? 80 : 0, lineHeight: 1.2 }}>
                    {rink.name}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                </div>
              </Link>
            ))
        }
      </div>
    </div>
  );
}
