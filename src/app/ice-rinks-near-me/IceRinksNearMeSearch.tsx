'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function IceRinksNearMeSearch() {
  const [city, setCity] = useState('');
  const [rinkCount, setRinkCount] = useState<number | null>(null);
  const [nearbyRinks, setNearbyRinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoAttempted, setGeoAttempted] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if ('geolocation' in navigator) {
      setGeoAttempted(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await res.json();
            const cityName = data.address?.city || data.address?.town || data.address?.village || '';
            if (cityName) {
              setCity(cityName);
              fetchRinks(cityName);
            }
          } catch {
            // geolocation reverse failed silently
          }
        },
        () => {
          // permission denied or error
        }
      );
    }
  }, []);

  async function fetchRinks(cityName: string) {
    if (!cityName.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/rinks?city=${encodeURIComponent(cityName)}&limit=10`);
      const data = await res.json();
      setNearbyRinks(data.rinks || []);
      setRinkCount(data.count || 0);
    } catch {
      setNearbyRinks([]);
      setRinkCount(0);
    }
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchRinks(city);
  }

  return (
    <div>
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
          {geoAttempted && !city && !hasSearched && (
            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>
              📍 Location
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

      {loading && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center', padding: '1rem', color: 'rgba(255,255,255,0.5)' }}>
          Searching for rinks near {city}...
        </div>
      )}

      {!loading && rinkCount !== null && rinkCount > 0 && (
        <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
            {rinkCount} RINK{rinkCount === 1 ? '' : 'S'} NEAR {city.toUpperCase()}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {nearbyRinks.slice(0, 5).map((rink: any) => (
              <Link
                key={rink.slug || rink.id}
                href={`/directory/rinks/${rink.slug}`}
                style={{
                  display: 'block',
                  padding: '0.875rem 1rem',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                  {rink.name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem' }}>
                  📍 {rink.city}{rink.province_state ? `, ${rink.province_state}` : ''}
                </div>
              </Link>
            ))}
            {nearbyRinks.length > 5 && (
              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <Link
                  href={`/directory/rinks?city=${encodeURIComponent(city)}`}
                  style={{ color: '#7dd3fc', fontSize: '0.875rem', textDecoration: 'none' }}
                >
                  See all {rinkCount} rinks near {city} →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && rinkCount === 0 && hasSearched && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
            No rinks found in our directory for {city}. Try a nearby city, or browse by country below.
          </p>
        </div>
      )}
    </div>
  );
}
