'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MapRink {
  id: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  slug: string;
}

interface Props {
  initialRinks: MapRink[];
}

// Country centroid (lat/lon) for the iframe center.
const COUNTRY_CENTROIDS: Record<string, { lat: number; lon: number; zoom: number }> = {
  'United States':        { lat:  39.5,  lon:  -98.5, zoom: 4 },
  'Canada':               { lat:  56.0,  lon: -106.0, zoom: 4 },
  'Finland':              { lat:  64.0,  lon:   26.0, zoom: 5 },
  'Sweden':               { lat:  62.0,  lon:   15.0, zoom: 5 },
  'Russia':               { lat:  61.0,  lon:   60.0, zoom: 4 },
  'Czech Republic':       { lat:  49.8,  lon:   15.5, zoom: 7 },
  'Germany':              { lat:  51.0,  lon:   10.5, zoom: 6 },
  'Switzerland':          { lat:  46.8,  lon:    8.2, zoom: 8 },
  'Austria':              { lat:  47.5,  lon:   14.5, zoom: 8 },
  'Slovakia':             { lat:  48.7,  lon:   19.7, zoom: 8 },
  'Norway':               { lat:  60.5,  lon:    8.5, zoom: 5 },
  'Denmark':              { lat:  56.0,  lon:   10.0, zoom: 7 },
  'France':               { lat:  46.5,  lon:    2.5, zoom: 6 },
  'United Kingdom':       { lat:  54.0,  lon:   -2.0, zoom: 6 },
  'Latvia':               { lat:  57.0,  lon:   25.0, zoom: 7 },
  'Belarus':              { lat:  53.0,  lon:   28.0, zoom: 7 },
  'Kazakhstan':           { lat:  48.0,  lon:   66.0, zoom: 5 },
  'Japan':                { lat:  36.0,  lon:  138.0, zoom: 5 },
  'South Korea':          { lat:  36.0,  lon:  128.0, zoom: 7 },
  'China':                { lat:  35.0,  lon:  104.0, zoom: 4 },
  'Australia':            { lat: -25.0,  lon:  133.0, zoom: 4 },
  'Italy':                { lat:  42.5,  lon:   12.5, zoom: 6 },
  'Poland':               { lat:  52.0,  lon:   19.0, zoom: 6 },
  'Hungary':              { lat:  47.0,  lon:   19.5, zoom: 7 },
  'Ukraine':              { lat:  49.0,  lon:   32.0, zoom: 6 },
  'Netherlands':          { lat:  52.0,  lon:    5.5, zoom: 7 },
  'Belgium':              { lat:  50.5,  lon:    4.5, zoom: 7 },
  'Spain':                { lat:  40.0,  lon:   -3.5, zoom: 6 },
  'Mexico':               { lat:  23.0,  lon: -102.0, zoom: 5 },
  'Estonia':              { lat:  59.0,  lon:   26.0, zoom: 7 },
  'Lithuania':            { lat:  55.0,  lon:   24.0, zoom: 7 },
  'Romania':              { lat:  46.0,  lon:   25.0, zoom: 6 },
  'Bulgaria':             { lat:  42.5,  lon:   25.5, zoom: 7 },
  'Iceland':              { lat:  65.0,  lon:  -19.0, zoom: 6 },
  'New Zealand':          { lat: -41.0,  lon:  174.0, zoom: 5 },
  'Slovenia':             { lat:  46.0,  lon:   15.0, zoom: 8 },
  'Croatia':              { lat:  45.0,  lon:   16.0, zoom: 7 },
  'Serbia':               { lat:  44.0,  lon:   21.0, zoom: 7 },
  'Argentina':            { lat: -34.0,  lon:  -64.0, zoom: 4 },
  'Brazil':               { lat: -10.0,  lon:  -53.0, zoom: 4 },
  'Israel':               { lat:  31.5,  lon:   35.0, zoom: 7 },
  'United Arab Emirates': { lat:  24.0,  lon:   54.0, zoom: 6 },
  'Singapore':            { lat:   1.3,  lon:  103.8, zoom: 11 },
  'Philippines':          { lat:  13.0,  lon:  122.0, zoom: 6 },
  'Thailand':             { lat:  15.0,  lon:  101.0, zoom: 5 },
  'Turkey':               { lat:  39.0,  lon:   35.0, zoom: 5 },
  'Ireland':              { lat:  53.5,  lon:   -8.0, zoom: 7 },
  'Chile':                { lat: -33.0,  lon:  -71.0, zoom: 4 },
};

const DEFAULT_VIEW = { lat: 45, lon: -90, zoom: 3 };

function viewForCountry(country: string) {
  if (!country) return DEFAULT_VIEW;
  return COUNTRY_CENTROIDS[country] ?? DEFAULT_VIEW;
}

function buildEmbedUrl(view: { lat: number; lon: number; zoom: number }): string {
  return `https://www.google.com/maps?q=${view.lat},${view.lon}&z=${view.zoom}&output=embed`;
}

function buildDirectionsUrl(view: { lat: number; lon: number }): string {
  return `https://www.google.com/maps?q=${view.lat},${view.lon}`;
}

export default function MapClient({ initialRinks }: Props) {
  const [rinks, setRinks] = useState<MapRink[]>(initialRinks);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');

  useEffect(() => {
    const countrySet = new Set<string>();
    initialRinks.forEach((rink) => {
      if (rink.country) countrySet.add(rink.country);
    });
    setCountries((prev) => (prev.length ? prev : Array.from(countrySet).sort()));
  }, [initialRinks]);

  useEffect(() => {
    fetch('/api/rinks/map')
      .then((r) => r.json())
      .then((d) => {
        const data: MapRink[] = d.data || [];
        if (data.length) setRinks(data);
        const countrySet = new Set<string>();
        (data.length ? data : rinks).forEach((rink) => {
          if (rink.country) countrySet.add(rink.country);
        });
        setCountries(Array.from(countrySet).sort());
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleRinks = useMemo(() => {
    if (!selectedCountry) return rinks;
    return rinks.filter((r) => r.country.toLowerCase() === selectedCountry.toLowerCase());
  }, [rinks, selectedCountry]);

  const view = viewForCountry(selectedCountry);
  const embedUrl = buildEmbedUrl(view);
  const directionsUrl = buildDirectionsUrl(view);

  return (
    <div style={{ background: '#041E42', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{
        background: 'linear-gradient(135deg, #041E42 0%, #0a2a52 100%)',
        borderBottom: '1px solid rgba(200,16,46,0.3)',
        padding: '24px 32px',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <h1 style={{
            fontFamily: 'Bebas Neue, Impact, sans-serif',
            fontSize: 'clamp(28px, 5vw, 48px)',
            color: '#fff', letterSpacing: '3px', lineHeight: 1, marginBottom: 4,
          }}>
            GLOBAL HOCKEY RINK MAP
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 16 }}>
            Browse {rinks.length} hockey rinks worldwide
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500 }}>
                Filter by Country:
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8, color: '#fff', padding: '8px 12px',
                  fontSize: 13, cursor: 'pointer', minWidth: 160,
                }}
              >
                <option value="" style={{ background: '#041E42' }}>All Countries</option>
                {countries.map((c) => (
                  <option key={c} value={c} style={{ background: '#041E42' }}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{
              background: 'rgba(200,16,46,0.15)',
              border: '1px solid rgba(200,16,46,0.4)',
              borderRadius: 20, padding: '6px 16px', color: '#fff',
              fontSize: 13, fontWeight: 600,
            }}>
              {visibleRinks.length} rink{visibleRinks.length !== 1 ? 's' : ''} {selectedCountry ? `in ${selectedCountry}` : 'worldwide'}
            </div>

            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(255,184,28,0.15)',
                border: '1px solid rgba(255,184,28,0.4)',
                borderRadius: 20, padding: '6px 16px', color: '#FFB81C',
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', height: 'calc(100vh - 160px)', minHeight: 500 }}>
        <iframe
          key={embedUrl}
          title="Hockey rink map"
          src={embedUrl}
          style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 1000 }}>
          <Link
            href="/directory/rinks"
            style={{
              background: 'rgba(4,30,66,0.9)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', textDecoration: 'none',
              padding: '8px 16px', borderRadius: 8,
              fontSize: 13, fontWeight: 500,
              backdropFilter: 'blur(8px)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            Back to Rinks
          </Link>
        </div>
      </div>

      {selectedCountry && visibleRinks.length > 0 && (
        <div style={{
          background: 'linear-gradient(180deg, #0a2a52 0%, #041E42 100%)',
          padding: '32px',
          maxHeight: '40vh',
          overflowY: 'auto',
        }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <h2 style={{
              fontFamily: 'Bebas Neue, Impact, sans-serif',
              fontSize: 24, color: '#fff', letterSpacing: 2,
              marginBottom: 16,
            }}>
              {visibleRinks.length} rink{visibleRinks.length !== 1 ? 's' : ''} in {selectedCountry}
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}>
              {visibleRinks.map((rink) => (
                <Link
                  key={rink.id}
                  href={`/directory/rinks/${rink.slug}`}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, padding: '12px 16px',
                    color: '#fff', textDecoration: 'none',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{rink.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{rink.city}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
