'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Dynamically import Leaflet to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const L = (dynamic as any)(() => import('leaflet'), { ssr: false });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MarkerClusterGroup = dynamic(() => import('react-leaflet-cluster'), {
  ssr: false,
  loading:() => null as any,
});

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

// ─── Custom cluster icon ──────────────────────────────────────────────────────
function createClusterIcon(cluster: { getChildCount: () => number }) {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<div style="
      background:#C8102E;
      border:3px solid #fff;
      border-radius:50%;
      color:#fff;
      font-weight:800;
      font-size:13px;
      display:flex;align-items:center;justify-content:center;
      width:40px;height:40px;
      box-shadow:0 2px 12px rgba(200,16,46,0.6);
    ">${count}</div>`,
    className: '',
    iconSize: L.point(40, 40),
    iconAnchor: L.point(20, 20),
        });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MapPage() {
  const [rinks, setRinks] = useState<MapRink[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Load rink data
  useEffect(() => {
    fetch('/api/rinks/map')
      .then((r) => r.json())
      .then((d) => {
        const data: MapRink[] = d.data || [];
        setRinks(data);

        // Build unique country list
        const countrySet = new Set<string>();
        data.forEach((rink) => {
          if (rink.country) countrySet.add(rink.country);
        });
        setCountries(Array.from(countrySet).sort());

        setLoading(false);
        setMapReady(true);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter rinks by selected country
  const visibleRinks = selectedCountry
    ? rinks.filter(
        (r) => r.country.toLowerCase() === selectedCountry.toLowerCase()
      )
    : rinks;

  // Initialize map after Leaflet is loaded
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current) return;

    let isMounted = true;

    import('leaflet').then((leafletModule) => {
      if (!isMounted || !mapContainerRef.current) return;
      const L = leafletModule.default;

      // Fix default marker icons
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

      // Dark tile layer (CartoDB Dark Matter)
      const tiles = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      );

      const map = L.map(mapContainerRef.current!, {
        center: [45, -90],
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: true,
        });

      tiles.addTo(map);
      mapRef.current = map;

      // Add markers with clustering
      import('leaflet.markercluster').then((markerClusterModule) => {
        if (!isMounted || !mapRef.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const MarkerClusterGroup = (markerClusterModule as any).default;

        const markers = new MarkerClusterGroup({
          chunkedLoading: true,
          maxClusterRadius: 60,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          iconCreateFunction: createClusterIcon,
        });

        visibleRinks.forEach((rink) => {
          const marker = L.circleMarker([rink.latitude, rink.longitude], {
            radius: 8,
            fillColor: '#C8102E',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          });

          marker.bindPopup(
            `<div style="background:#041E42;color:#fff;padding:12px 16px;border-radius:8px;min-width:180px;font-family:Inter,sans-serif;">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${rink.name}</div>
              <div style="font-size:12px;opacity:0.75;margin-bottom:8px;">${rink.city}${rink.country ? ', ' + rink.country : ''}</div>
              <a href="/directory/rinks/${rink.slug}" style="color:#C8102E;font-size:12px;font-weight:600;text-decoration:none;">View Rink →</a>
            </div>`,
            { className: 'dark-popup' }
          );

          markers.addLayer(marker);
        });

        mapRef.current!.addLayer(markers);

        // Fit bounds if we have rinks
        if (visibleRinks.length > 0) {
          const bounds = L.latLngBounds(
            visibleRinks.map((r) => [r.latitude, r.longitude] as [number, number])
          );
          map.fitBounds(bounds, { padding: [40, 40] } as any);
        }
        });
        });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  // Update markers when filter changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    import('leaflet.markercluster').then((markerClusterModule) => {
      if (!mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const MarkerClusterGroup = (markerClusterModule as any).default;

      // Remove existing marker layer if any
      mapRef.current.eachLayer((layer) => {
        if ((layer as unknown as { options?: { pane?: string } }).options?.pane === 'markerPane') {
          try { mapRef.current!.removeLayer(layer); } catch {}
        }
        });

      // Clear all layers except tile
      mapRef.current.eachLayer((layer) => {
        if (!(layer as unknown as { _url?: string })._url) {
          try { mapRef.current!.removeLayer(layer); } catch {}
        }
        });

      const markers = new MarkerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: createClusterIcon,
        });

      visibleRinks.forEach((rink) => {
        const marker = L.circleMarker([rink.latitude, rink.longitude], {
          radius: 8,
          fillColor: '#C8102E',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        marker.bindPopup(
          `<div style="background:#041E42;color:#fff;padding:12px 16px;border-radius:8px;min-width:180px;font-family:Inter,sans-serif;">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${rink.name}</div>
            <div style="font-size:12px;opacity:0.75;margin-bottom:8px;">${rink.city}${rink.country ? ', ' + rink.country : ''}</div>
            <a href="/directory/rinks/${rink.slug}" style="color:#C8102E;font-size:12px;font-weight:600;text-decoration:none;">View Rink →</a>
          </div>`,
          { className: 'dark-popup' }
        );

        markers.addLayer(marker);
        });

      mapRef.current!.addLayer(markers);

      if (visibleRinks.length > 0) {
        const bounds = L.latLngBounds(
          visibleRinks.map((r) => [r.latitude, r.longitude] as [number, number])
        );
        mapRef.current!.fitBounds(bounds, { padding: [40, 40] } as any);
      }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, mapReady]);

  return (
    <div style={{ background: '#041E42', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
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
            color: '#fff',
            letterSpacing: '3px',
            lineHeight: 1,
            marginBottom: 4,
          }}>
            GLOBAL HOCKEY RINK MAP
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 16 }}>
            Click a marker to explore a rink
          </p>

          {/* Controls */}
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
                  borderRadius: 8,
                  color: '#fff',
                  padding: '8px 12px',
                  fontSize: 13,
                  cursor: 'pointer',
                  minWidth: 160,
                }}
              >
                <option value="" style={{ background: '#041E42' }}>All Countries</option>
                {countries.map((c) => (
                  <option key={c} value={c} style={{ background: '#041E42' }}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div style={{
              background: 'rgba(200,16,46,0.15)',
              border: '1px solid rgba(200,16,46,0.4)',
              borderRadius: 20,
              padding: '6px 16px',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
            }}>
              🏒 {visibleRinks.length} rink{visibleRinks.length !== 1 ? 's' : ''} on map
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div style={{ position: 'relative', height: 'calc(100vh - 160px)', minHeight: 500 }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1000,
            background: '#041E42', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
          }}>
            <div style={{
              width: 48, height: 48, border: '4px solid rgba(200,16,46,0.3)',
              borderTopColor: '#C8102E', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Loading rink data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && visibleRinks.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1000,
            background: '#041E42', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12,
          }}>
            <span style={{ fontSize: 48 }}>🏒</span>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>
              No rinks with coordinates found
            </p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              Add lat/lon to rinks in the database to see them on the map
            </p>
          </div>
        )}

        {/* Leaflet map ref container */}
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: '100%' }}
        />

        {/* Back link */}
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
            ← Back to Rinks
          </Link>
        </div>
      </div>

      {/* Dark popup styles */}
      <style>{`
        .leaflet-popup-content-wrapper {
          background: #041E42 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-popup-tip {
          background: #041E42 !important;
        }
        .leaflet-popup-close-button {
          color: rgba(255,255,255,0.6) !important;
          font-size: 18px !important;
          top: 8px !important;
          right: 8px !important;
        }
        .leaflet-container {
          background: #041E42 !important;
          font-family: Inter, sans-serif;
        }
        .leaflet-control-attribution {
          background: rgba(4,30,66,0.8) !important;
          color: rgba(255,255,255,0.4) !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a {
          color: rgba(200,16,46,0.8) !important;
        }
        .leaflet-control-zoom a {
          background: #041E42 !important;
          color: #fff !important;
          border-color: rgba(255,255,255,0.2) !important;
        }
        .leaflet-control-zoom a:hover {
          background: #0a2a52 !important;
        }
      `}</style>
    </div>
  );
}
