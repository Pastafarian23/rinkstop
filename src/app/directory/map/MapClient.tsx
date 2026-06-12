'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

// Country centroid (lat/lon) for the iframe fallback.
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

// Minimal Google Maps types (avoid pulling @types/google.maps)
type GoogleMap = any;
type GoogleMarker = any;

export default function MapClient({ initialRinks }: Props) {
  const [rinks, setRinks] = useState<MapRink[]>(initialRinks);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState(() => {
    // Read ?country= URL param on mount so filter is shareable / back-button works.
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('country') || '';
  });
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [markersRendered, setMarkersRendered] = useState(0); // for the loading pill
  const [isRendering, setIsRendering] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const infoWindowsRef = useRef<any[]>([]);
  const clustererRef = useRef<any | null>(null);
  const mountedRef = useRef(true);
  const dataLoadedRef = useRef(false); // for skipping the second fetch

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

  // Seed countries from initialRinks (no re-fetch if we have them already).
  useEffect(() => {
    if (dataLoadedRef.current) return;
    const countrySet = new Set<string>();
    initialRinks.forEach((rink) => {
      if (rink.country) countrySet.add(rink.country);
    });
    setCountries(Array.from(countrySet).sort());
  }, [initialRinks]);

  // Refresh from API in the background. Skip if initialRinks already covers
  // the API (dataLoadedRef guards against double-fetching on re-mount).
  useEffect(() => {
    if (dataLoadedRef.current) return;
    dataLoadedRef.current = true;
    fetch('/api/rinks/map')
      .then((r) => r.json())
      .then((d) => {
        if (mountedRef.current && Array.isArray(d.data) && d.data.length) {
          setRinks(d.data);
          const refreshed = new Set<string>();
          d.data.forEach((rink: MapRink) => {
            if (rink.country) refreshed.add(rink.country);
          });
          setCountries(Array.from(refreshed).sort());
        }
      })
      .catch(() => {});
    return () => { mountedRef.current = false; };
  }, []);

  // Keep ?country= URL in sync when the user changes the filter.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (selectedCountry) {
      url.searchParams.set('country', selectedCountry);
    } else {
      url.searchParams.delete('country');
    }
    window.history.replaceState(null, '', url.toString());
  }, [selectedCountry]);

  // Global error catch — if anything throws during SDK init or hydration
  // (including the InvalidKey warning tripping Next.js's error boundary),
  // fall back to the iframe version.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onError = (e: ErrorEvent) => {
      const msg = String(e.message || '');
      if (msg.includes('google') || msg.includes('Maps') || msg.includes('InvalidKey')) {
        console.warn('Google Maps error caught, switching to fallback:', msg);
        setUseFallback(true);
      }
    };
    const onReject = (e: PromiseRejectionEvent) => {
      const msg = String(e.reason?.message || e.reason || '');
      if (msg.includes('google') || msg.includes('Maps') || msg.includes('InvalidKey')) {
        console.warn('Google Maps promise rejection, switching to fallback:', msg);
        setUseFallback(true);
      }
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onReject);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onReject);
    };
  }, []);

  // Initialize the Google Map once the SDK script is loaded.
  // The script's `callback=__gmapsInit` fires only after the namespace is
  // fully bootstrapped, so the Map class is available at this point.
  const initMap = useCallback(() => {
    if (useFallback) return;
    if (typeof window === 'undefined' || !window.google?.maps) return;
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: DEFAULT_VIEW.lat, lng: DEFAULT_VIEW.lon },
        zoom: DEFAULT_VIEW.zoom,
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
    } catch (err) {
      console.error('Google Maps init failed:', err);
      setUseFallback(true);
    }
  }, [useFallback]);

  useEffect(() => {
    if (scriptLoaded && !useFallback) {
      initMap();
    }
  }, [scriptLoaded, useFallback, initMap]);

  // Render markers when rinks, country filter, or map readiness change.
  // Uses Google Maps' built-in MarkerClusterer (loaded lazily) to keep the
  // map readable at country zoom level where 700 dots would otherwise
  // overlap.
  const renderMarkers = useCallback(() => {
    if (useFallback) return;
    if (!mapRef.current || typeof window === 'undefined' || !window.google?.maps) return;

    setIsRendering(true);
    try {
      const maps = window.google.maps;
      const bounds = new maps.LatLngBounds();

      // Clear previous markers + info windows + clusterer
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      infoWindowsRef.current.forEach((iw) => iw.close());
      infoWindowsRef.current = [];
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current.setMap(null);
        clustererRef.current = null;
      }

      const visible = selectedCountry
        ? rinks.filter((r) => r.country.toLowerCase() === selectedCountry.toLowerCase())
        : rinks;

      const newMarkers: GoogleMarker[] = [];
      let rendered = 0;

      // Build all markers first, then commit them in one batch.
      for (const rink of visible) {
        if (typeof rink.latitude !== 'number' || typeof rink.longitude !== 'number') continue;
        if (Number.isNaN(rink.latitude) || Number.isNaN(rink.longitude)) continue;

        const marker = new maps.Marker({
          position: { lat: rink.latitude, lng: rink.longitude },
          title: rink.name,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            fillColor: '#C8102E',
            fillOpacity: 0.95,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 7,
          },
          // Markers are added to the clusterer, not directly to the map.
        });

        // Build InfoWindow content using DOM (no innerHTML template strings).
        const iwContent = document.createElement('div');
        iwContent.style.cssText = 'background:#041E42;color:#fff;padding:12px 16px;border-radius:8px;min-width:180px;font-family:Inter,sans-serif;';

        const nameDiv = document.createElement('div');
        nameDiv.style.cssText = 'font-weight:700;font-size:14px;margin-bottom:4px;';
        nameDiv.textContent = rink.name;
        iwContent.appendChild(nameDiv);

        const locDiv = document.createElement('div');
        locDiv.style.cssText = 'font-size:12px;opacity:0.75;margin-bottom:8px;';
        locDiv.textContent = `${rink.city}${rink.country ? ', ' + rink.country : ''}`;
        iwContent.appendChild(locDiv);

        const link = document.createElement('a');
        link.href = `/directory/rinks/${encodeURIComponent(rink.slug)}`;
        link.style.cssText = 'color:#C8102E;font-size:12px;font-weight:600;text-decoration:none;';
        link.textContent = 'View Rink →';
        iwContent.appendChild(link);

        const infoWindow = new maps.InfoWindow({ content: iwContent });
        marker.addListener('click', () => {
          infoWindowsRef.current.forEach((iw) => iw.close());
          infoWindow.open(mapRef.current, marker);
        });

        markersRef.current.push(marker);
        infoWindowsRef.current.push(infoWindow);
        newMarkers.push(marker);
        bounds.extend({ lat: rink.latitude, lng: rink.longitude });
        rendered++;
      }

      // Add markers to a clusterer (only when showing > 50 markers, otherwise
      // direct on map is faster and cleaner).
      if (newMarkers.length > 50 && !selectedCountry) {
        const ClustererClass = (window as any).markerClusterer?.MarkerClusterer;
        if (ClustererClass) {
          clustererRef.current = new ClustererClass({
            map: mapRef.current,
            markers: newMarkers,
            // Custom renderer: red circle with the count
            renderer: {
              render: ({ count, position }: { count: number; position: any }) => {
                const radius = Math.min(18, 8 + Math.log2(count) * 3);
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="${radius}" fill="#C8102E" fill-opacity="0.9" stroke="#ffffff" stroke-width="2"/><text x="20" y="24" text-anchor="middle" fill="#fff" font-family="Inter,sans-serif" font-weight="700" font-size="13">${count}</text></svg>`;
                return new maps.Marker({
                  position,
                  icon: { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg), scaledSize: new maps.Size(40, 40) },
                  zIndex: 1000 + count,
                });
              },
            },
          });
        } else {
          newMarkers.forEach((m) => m.setMap(mapRef.current));
        }
      } else {
        newMarkers.forEach((m) => m.setMap(mapRef.current));
      }

      setMarkersRendered(rendered);

      // Smooth fitBounds with animation. Skip on the very first render if
      // the user has zoomed/panned (don't yank the map around).
      if (rendered > 0 && bounds.getNorthEast().equals(bounds.getSouthWest()) === false) {
        mapRef.current.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 });
        const z = mapRef.current.getZoom();
        if (z && z > 14) mapRef.current.setZoom(14);
      } else if (selectedCountry && COUNTRY_CENTROIDS[selectedCountry]) {
        // Country filter with no markers in view — pan to the country centroid.
        const v = COUNTRY_CENTROIDS[selectedCountry];
        mapRef.current.panTo({ lat: v.lat, lng: v.lon });
        mapRef.current.setZoom(v.zoom);
      }
    } catch (err) {
      console.error('Render markers failed:', err);
      setUseFallback(true);
    } finally {
      setIsRendering(false);
    }
  }, [rinks, selectedCountry, useFallback]);

  // Re-render markers when the country filter changes.
  useEffect(() => {
    if (scriptLoaded && !useFallback && rinks.length > 0 && mapRef.current) {
      renderMarkers();
    }
  }, [scriptLoaded, rinks, selectedCountry, useFallback, renderMarkers]);

  const visibleRinks = useMemo(
    () => (selectedCountry
      ? rinks.filter((r) => r.country.toLowerCase() === selectedCountry.toLowerCase())
      : rinks),
    [rinks, selectedCountry]
  );

  // ─── Iframe fallback (no-key) ─────────────────────────────────────────────
  if (useFallback) {
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
              Browse {rinks.length} hockey rinks worldwide (country view)
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
            padding: '32px', maxHeight: '40vh', overflowY: 'auto',
          }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
              <h2 style={{
                fontFamily: 'Bebas Neue, Impact, sans-serif',
                fontSize: 24, color: '#fff', letterSpacing: 2, marginBottom: 16,
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

  // ─── SDK version ──────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#041E42', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {!scriptLoaded && !scriptError && typeof window !== 'undefined' && (
        <ScriptInjector apiKey={apiKey} onLoad={() => setScriptLoaded(true)} onError={() => { setScriptError(true); setUseFallback(true); }} />
      )}

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
            {scriptError
              ? 'Map failed to load — showing country view below.'
              : 'Click a marker to explore a rink'}
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
              {markersRendered > 0
                ? `${markersRendered.toLocaleString()} pin${markersRendered !== 1 ? 's' : ''}`
                : `${visibleRinks.length.toLocaleString()} rink${visibleRinks.length !== 1 ? 's' : ''} on map`}
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', height: 'calc(100vh - 160px)', minHeight: 500 }}>
        {!scriptLoaded && !scriptError && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1000,
            background: '#041E42', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.15)',
              borderTopColor: '#C8102E',
              animation: 'spin 0.9s linear infinite',
            }} />
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500 }}>
              Loading Google Maps...
            </div>
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
              Google Maps couldn't initialize. Check the API key restrictions in Google Cloud
              Console and ensure <strong>Maps JavaScript API</strong> is enabled.
            </p>
          </div>
        )}

        {scriptLoaded && !scriptError && isRendering && (
          <div style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(4,30,66,0.92)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', padding: '10px 20px', borderRadius: 24,
            fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 10,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.2)',
              borderTopColor: '#C8102E',
              animation: 'spin 0.9s linear infinite',
            }} />
            Loading {visibleRinks.length} rinks...
          </div>
        )}

        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
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

// Inject the Maps JS SDK in the browser only. Avoids next/script's SSR pass
// which can interfere with React hydration on this page.
function ScriptInjector({ apiKey, onLoad, onError }: { apiKey: string; onLoad: () => void; onError: () => void }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (document.querySelector('script[data-google-maps-sdk]')) return;
    // Define a global init callback BEFORE the loader script runs, so the
    // SDK can call it once the namespace is fully bootstrapped.
    (window as any).__gmapsInit = () => { onLoad(); };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&callback=__gmapsInit`;
    s.async = true;
    s.defer = true;
    s.dataset.googleMapsSdk = 'true';
    s.onerror = onError;
    document.head.appendChild(s);

    // Also load the MarkerClusterer library (free, from unpkg, no API key).
    // It's a separate JS bundle that exposes markerClusterer.MarkerClusterer.
    if (!document.querySelector('script[data-google-maps-clusterer]')) {
      const c = document.createElement('script');
      c.src = 'https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js';
      c.async = true;
      c.defer = true;
      c.dataset.googleMapsClusterer = 'true';
      c.onerror = () => { console.warn('MarkerClusterer failed to load (non-fatal)'); };
      document.head.appendChild(c);
    }
  }, [apiKey, onLoad, onError]);
  return null;
}
