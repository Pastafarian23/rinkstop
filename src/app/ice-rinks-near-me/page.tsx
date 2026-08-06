'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { provinceDisplayName } from '@/lib/ca-provinces';

export default function IceRinksNearMe() {
  const [city, setCity] = useState('');
  const [rinkCount, setRinkCount] = useState<number | null>(null);
  const [nearbyRinks, setNearbyRinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoAttempted, setGeoAttempted] = useState(false);

  useEffect(() => {
    // Inject document.title and canonical link. This is a client component
    // (it needs navigator.geolocation), so Next.js can't emit a static
    // <title> or canonical from a metadata export. The page is the same
    // regardless of the user's location, so a static title is fine.
    document.title = 'Ice Rinks Near Me';
    const href = 'https://rinkstop.com/ice-rinks-near-me';
    let link = document.head.querySelector('link[rel="canonical"][data-seo-canonical="ice-rinks-near-me"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      link.setAttribute('data-seo-canonical', 'ice-rinks-near-me');
      document.head.appendChild(link);
    }
    link.href = href;
    return () => {
      const el = document.head.querySelector('link[rel="canonical"][data-seo-canonical="ice-rinks-near-me"]');
      if (el && document.head.contains(el)) document.head.removeChild(el);
    };
  }, []);

  useEffect(() => {
    // Try browser geolocation on mount
    if ('geolocation' in navigator) {
      setGeoAttempted(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Reverse geocode to city
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            const data = await res.json();
            const cityName = data.address?.city || data.address?.town || data.address?.village || '';
            if (cityName) {
              setCity(cityName);
              fetchRinks(cityName);
            }
          } catch {
            // geolocation failed silently
          }
        },
        () => {
          // permission denied or error — do nothing, user can type
        }
      );
    }
  }, []);

  async function fetchRinks(cityName: string) {
    if (!cityName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rinks?city=${encodeURIComponent(cityName)}&limit=10`);
      const data = await res.json();
      setNearbyRinks(data.rinks || []);
      setRinkCount(data.count || 0);
    } catch {
      setNearbyRinks([]);
    }
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchRinks(city);
  }

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Ice Rinks Near Me</span>
      </nav>

      {/* Hero */}
      <section style={{ marginBottom: '3rem', textAlign: 'center', padding: '2.5rem 1rem', background: 'linear-gradient(135deg, #041E42 0%, #0a2d5c 100%)', borderRadius: '12px' }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.15em', color: '#C8102E', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Location-Based Search</div>
        <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          ICE RINKS NEAR ME
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 1.5rem', lineHeight: 1.7 }}>
          Find ice rinks, hockey arenas, and public skating facilities near your location.
        </p>

        {/* Search Form */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', maxWidth: '450px', margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <input
              type="search"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter your city..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
            {geoAttempted && !city && (
              <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>
                Location access needed or denied
              </div>
            )}
          </div>
          <button
            type="submit"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#C8102E',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>
      </section>

      {/* Results */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
          Searching for rinks near you...
        </div>
      )}

      {!loading && rinkCount !== null && (
        <section>
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>
            {rinkCount > 0 ? `${rinkCount} Rinks Found Near ${city}` : `No Rinks Found Near ${city}`}
          </h2>

          {rinkCount > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {nearbyRinks.map((rink: any) => (
                <div key={rink.slug || rink.id} style={{ background: 'var(--s2)', borderRadius: '8px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                        <Link href={`/directory/rinks/${rink.slug}`} style={{ color: '#fff', textDecoration: 'none' }}>{rink.name}</Link>
                      </h3>
                      {rink.address && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>📍 {rink.address}</p>}
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem' }}>{rink.city}{rink.province_state ? `, ${provinceDisplayName(rink.province_state)}` : ''}</p>
                    </div>
                    <Link href={`/directory/rinks/${rink.slug}`} style={{ padding: '0.375rem 0.875rem', background: '#C8102E', color: '#fff', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'none', flexShrink: 0 }}>
                      View Details
                    </Link>
                  </div>
                  
                  {rink.capacity && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                      <span>🏟️ {rink.capacity.toLocaleString()} capacity</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {rinkCount === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--s2)', borderRadius: '12px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>No rinks found near {city}.</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Try searching for a nearby city or browse by country.</p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/directory/rinks" style={{ padding: '0.625rem 1.25rem', background: '#C8102E', color: '#fff', borderRadius: '6px', fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}>Browse All Rinks</Link>
                <Link href="/directory/countries" style={{ padding: '0.625rem 1.25rem', background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: '6px', fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}>Browse by Country</Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Browse by Country */}
      {!loading && rinkCount === null && (
        <section>
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>
            BROWSE RINKS BY COUNTRY
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { name: 'United States', slug: 'united-states', flag: '🇺🇸' },
              { name: 'Canada', slug: 'canada', flag: '🇨🇦' },
              { name: 'Sweden', slug: 'sweden', flag: '🇸🇪' },
              { name: 'Finland', slug: 'finland', flag: '🇫🇮' },
              { name: 'Germany', slug: 'germany', flag: '🇩🇪' },
              { name: 'United Kingdom', slug: 'united-kingdom', flag: '🇬🇧' },
            ].map(c => (
              <Link key={c.slug} href={`/directory/${c.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--s2)', borderRadius: '8px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '1.5rem' }}>{c.flag}</span>
                <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9375rem' }}>{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Last Updated */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Ice Rinks Near Me",
          "description": "Find ice rinks, hockey arenas, and public skating facilities near your location.",
          "url": "https://rinkstop.com/ice-rinks-near-me",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://rinkstop.com" },
              { "@type": "ListItem", "position": 2, "name": "Ice Rinks Near Me", "item": "https://rinkstop.com/ice-rinks-near-me" }
            ]
          }
        })
      }} />
    </main>
  );
}
