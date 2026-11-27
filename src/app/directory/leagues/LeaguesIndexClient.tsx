'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { nextLeagueList } from '@/lib/league-list-contract';
import { isVerifiedClaim, isFeaturedClaim } from '@/lib/listingTier';
import { FilterIcon } from '@/components/icons';
import CategorySearchBar from '@/components/CategorySearchBar';

// ------ Types ----------------------------------------------------------------------------------------------------------------------------------------
interface League {
  id: string;
  name: string;
  country?: string;
  level?: string;
  website_url?: string;
  claimed_by_tier?: string | null;
  claimed_by_org_tier?: string | null;
  claimed_by_user_id?: string | null;
}

interface Props {
  initialLeagues: League[];
}

export default function LeaguesIndexClient({ initialLeagues }: Props) {
  const [leagues, setLeagues] = useState<League[]>(initialLeagues);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  // Paged full-dataset state. With no filters the page shows the full initial list.
  const [total, setTotal] = useState<number>(initialLeagues.length);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('sort', 'tier');
    fetch(`/api/leagues?${params}`)
      .then(async (r): Promise<{ ok: boolean; body: unknown }> => ({ ok: r.ok, body: await r.json().catch((): null => null) }))
      .then(({ ok, body }) => {
        // Only a successful array replaces the list; error bodies are objects.
        setLeagues(prev => nextLeagueList(prev, ok, body));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const filtersActive = Boolean(search.trim() || country.trim() || verifiedOnly);
  const pagedUrl = (offset: number) => {
    const q = new URLSearchParams({ sort: 'tier', limit: '50', offset: String(offset) });
    if (search.trim()) q.set('search', search.trim());
    if (country.trim()) q.set('country', country.trim());
    if (verifiedOnly) q.set('verifiedOnly', '1');
    return `/api/leagues?${q}`;
  };
  useEffect(() => {
    generation.current += 1;
    const gen = generation.current;
    if (!filtersActive) {
      setLeagues(initialLeagues); setTotal(initialLeagues.length); setHasMore(false); setNextOffset(null);
      return;
    }
    const t = window.setTimeout(() => {
      setLoading(true);
      fetch(pagedUrl(0))
        .then(async r => ({ ok: r.ok, body: await r.json().catch((): null => null) }))
        .then(({ ok, body }) => {
          if (gen !== generation.current) return;
          // Keep the current results on any failure; never adopt an error body.
          if (ok && body && Array.isArray(body.data)) {
            setLeagues(body.data); setTotal(body.count ?? body.data.length);
            setHasMore(Boolean(body.hasMore)); setNextOffset(body.nextOffset ?? null);
          }
          setLoading(false);
        })
        .catch(() => { if (gen === generation.current) setLoading(false); });
    }, search.trim() ? 300 : 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, country, verifiedOnly]);

  const loadMore = () => {
    if (loadingMore || !hasMore || nextOffset == null) return;
    const gen = generation.current;
    setLoadingMore(true);
    fetch(pagedUrl(nextOffset))
      .then(async r => ({ ok: r.ok, body: await r.json().catch((): null => null) }))
      .then(({ ok, body }) => {
        if (gen !== generation.current) return;
        if (ok && body && Array.isArray(body.data)) {
          setLeagues(prev => {
            const seen = new Set(prev.map(l => l.id));
            return [...prev, ...(body.data as League[]).filter(l => !seen.has(l.id))];
          });
          setTotal(body.count ?? total); setHasMore(Boolean(body.hasMore)); setNextOffset(body.nextOffset ?? null);
        }
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  };
  // 2026-10-22: replaced the hardcoded legacy-name set with the shared
  // helpers. The old set only ever saw the PERSONAL column and only matched
  // pre-consolidation names, so an org-only claimer was never "verified".
  const verifiedCount = initialLeagues.filter(l => isVerifiedClaim(l.claimed_by_tier, l.claimed_by_org_tier)).length;

  // Client-side filters
  // Search, Country and verified-only run on the server across the full dataset.
  const filtered = leagues;

  const clearFilters = () => { setSearch(''); setCountry(''); };
  const hasFilters = search || country;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb — server already renders one above, but we keep a hidden
          a11y copy here for the client-side filter to remain semantically self-contained. */}
      <nav aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
        <Link href="/">Home</Link>
        <span> › </span>
        <Link href="/directory">Directory</Link>
        <span> › </span>
        <span>Leagues</span>
      </nav>

      {/* Filter Bar — search + country + verified-only toggle */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', padding: '0.875rem 1rem', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'rgba(255,255,255,0.4)' }}>
          <FilterIcon className="w-4 h-4" />
        </div>
        {/* Search — homepage aesthetic, scoped to leagues.
            Does NOT narrow the grid (use URL ?q= param for that). */}
        <CategorySearchBar category="league" page="/directory/leagues" maxWidth={600} />
        <input
          type="search"
          aria-label="Search leagues by name"
          placeholder="Search leagues by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field"
          style={{ flex: '1 1 180px', minWidth: 0 }}
        />
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

      {/* Results count */}
      {!loading && (
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em', marginBottom: '1rem' }}>
          {total === 0 ? 'No results' : `${total.toLocaleString()} league${total !== 1 ? 's' : ''}`}
          {hasFilters ? ' matching your search' : ' in directory'}
        </p>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem' }}>
                <div className="skeleton" style={{ height: '1.125rem', width: '70%', marginBottom: '0.625rem' }} />
                <div className="skeleton" style={{ height: '0.875rem', width: '45%' }} />
              </div>
            ))
          : filtered.length === 0
            ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '1rem' }}>No leagues found matching your search</p>
                <button onClick={clearFilters} style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Clear all filters</button>
              </div>
            )
            : filtered.map(league => (
              <Link
                key={league.id}
                href={`/directory/leagues/${league.id}`}
                style={{
                  display: 'block', textDecoration: 'none',
                  background: isVerifiedClaim(league.claimed_by_tier, league.claimed_by_org_tier) ? 'linear-gradient(135deg, rgba(200,16,46,0.08) 0%, var(--s2) 100%)' : 'var(--s2)',
                  border: `1px solid ${isVerifiedClaim(league.claimed_by_tier, league.claimed_by_org_tier) ? 'rgba(20,184,166,0.4)' : 'var(--border)'}`,
                  borderRadius: '6px',
                  padding: '1.125rem',
                  position: 'relative',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-h)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {isFeaturedClaim(league.claimed_by_tier, league.claimed_by_org_tier) && (                  <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'var(--red)', color: '#fff' }}>
                    ⭐ Featured
                  </div>
                )}
                {(isVerifiedClaim(league.claimed_by_tier, league.claimed_by_org_tier)) && (
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(20,184,166,0.15)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.4)' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Verified
                  </div>
                )}
                <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#fff', marginBottom: '0.3rem', paddingRight: league.claimed_by_tier ? 80 : 0 }}>
                  {league.name}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                  {league.country || 'International'}
                </p>
                {league.level && (
                  <span style={{ display: 'inline-block', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(200,16,46,0.15)', color: 'var(--red)' }}>
                    {league.level.replace('_', ' ')}
                  </span>
                )}
              </Link>
            ))
        }
      </div>
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 3, padding: '0.625rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', cursor: loadingMore ? 'wait' : 'pointer' }}
          >
            {loadingMore ? 'Loading…' : `Load more leagues (${leagues.length.toLocaleString()} of ${total.toLocaleString()})`}
          </button>
        </div>
      )}
    </div>
  );
}
