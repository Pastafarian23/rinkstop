'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Script from 'next/script';

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

// Minimal Google Maps type surface (avoids pulling @types/google.maps as a dep)
type GoogleMap = any;
type GoogleMarker = any;

interface Props {
  initialRinks: MapRink[];
}

// ─── Client Component ────────────────────────────────────────────────────────
export default function MapClient({ initialRinks }: Props) {
  const [rinks, setRinks] = useState<MapRink[]>(initialRinks);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const mountedRef = useRef(true);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

  // Build country list from initial (server) data, then refresh from API.
  useEffect(() => {
    const countrySet = new Set<string>();
    initialRinks.forEach((rink) => {
      if (rink.country) countrySet.add(rink.country);
    });
    setCountries(Array.from(countrySet).sort());

    setLoading(true);
    fetch('/api/rinks/map')
      .then((r) => r.json())
      .then((d) => {
        const data: MapRink[] = d.data || [];
        if (mountedRef.current) {
          setRinks(data);
          const refreshed = new Set<string>();
          data.forEach((rink) => {
            if (rink.country) refreshed.add(rink.country);
          });
          setCountries(Array.from(refreshed).sort());
          setLoading(false);
        }
      })
      .catch(() => {
        if (mountedRef.current) setLoading(false);
      });
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Init the Google Map once the SDK script is loaded
  useEffect(() => {
    if (!scriptLoaded || !mapContainerRef.current || mapRef.current) return;
    if (typeof window === 'undefined' || !window.google?.maps) return;

    mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: 45, lng: -90 },
      zoom: 4,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#0a2a52' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#041E42' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#EEF5FF' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#041E42' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#0a2a52' }] },
        { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#EEF5FF' }] },
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    });
  }, [scriptLoaded]);

  // Render / re-render markers when rinks, country filter, or map readiness change
  const renderMarkers = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();

    // Clear previous markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const visibleRinks = selectedCountry
      ? rinks.filter((r) => r.country.toLowerCase() === selectedCountry.toLowerCase())
      : rinks;

    visibleRinks.forEach((rink) => {
      const marker = new window.google.maps.Marker({
        position: { lat: rink.latitude, lng: rink.longitude },
        map: mapRef.current,
        title: rink.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#C8102E',
          fillOpacity: 0.95,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 8,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="background:#041E42;color:#fff;padding:12px 16px;border-radius:8px;min-width:180px;font-family:Inter,sans-serif;">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${escapeHtml(rink.name)}</div>
            <div style="font-size:12px;opacity:0.75;margin-bottom:8px;">${escapeHtml(rink.city)}${rink.country ? ', ' + escapeHtml(rink.country) : ''}</div>
            <a href="/directory/rinks/${encodeURIComponent(rink.slug)}" style="color:#C8102E;font-size:12px;font-weight:600;text-decoration:none;">View Rink &rarr;</a>
          </div>
        `,
      });
      marker.addListener('click', () => infoWindow.open(mapRef.current, marker));

      markersRef.current.push(marker);
      bounds.extend({ lat: rink.latitude, lng: rink.longitude });
    });

    if (visibleRinks.length > 0) {
      mapRef.current.fitBounds(bounds);
      // Don't zoom in too far for tiny result sets
      const zoom = mapRef.current.getZoom();
      if (zoom && zoom > 14) mapRef.current.setZoom(14);
    }
  }, [rinks, selectedCountry]);

  useEffect(() => {
    if (scriptLoaded && rinks.length > 0 && mapRef.current) {
      renderMarkers();
    }
  }, [scriptLoaded, rinks, selectedCountry, renderMarkers]);

  const visibleRinks = selectedCountry
    ? rinks.filter((r) => r.country.toLowerCase() === selectedCountry.toLowerCase())
    : rinks;

  return (
    <div style={{ background: '#041E42', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`}
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setScriptError(true)}
      />

      {/* Header */}
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
            Click a marker to explore a rink
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
              🏒 {visibleRinks.length} rink{visibleRinks.length !== 1 ? 's' : ''} on map
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div style={{ position: 'relative', height: 'calc(100vh - 160px)', minHeight: 500 }}>
        {(loading || !scriptLoaded) && !scriptError && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1000,
            background: '#041E42', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: '3px solid rgba(200,16,46,0.3)',
              borderTopColor: '#C8102E',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
              {loading ? 'Loading rink data...' : 'Loading Google Maps...'}
            </p>
          </div>
        )}

        {scriptError && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1000,
            background: '#041E42', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12,
            padding: 24, textAlign: 'center',
          }}>
            <p style={{ color: '#C8102E', fontSize: 18, fontWeight: 700 }}>Map failed to load</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, maxWidth: 480 }}>
              Google Maps couldn't initialize. Check the API key restrictions in
              Google Cloud Console and ensure <code style={{color:'#FFB81C'}}>Maps JavaScript API</code> is enabled
              for key <code style={{color:'#FFB81C'}}>{apiKey ? apiKey.slice(0,12)+'…' : '(missing)'}</code>.
            </p>
          </div>
        )}

        {!loading && !scriptError && (
          <>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
            <div style={{
              position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
            }}>
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
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .gm-style .gm-style-iw-c { background: #041E42 !important; border-radius: 8px !important; padding: 0 !important; }
        .gm-style .gm-style-iw-d { overflow: hidden !important; }
        .gm-style .gm-style-iw-tc::after { background: #041E42 !important; }
        .gm-style-iw-chr button { color: rgba(255,255,255,0.6) !important; }
        .gm-style .gm-style-cc { background: rgba(4,30,66,0.7) !important; color: rgba(255,255,255,0.5) !important; }
        .gm-style .gm-style-cc a { color: #C8102E !important; }
        .gm-style a { color: #C8102E !important; }
      `}</style>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
  );
}
