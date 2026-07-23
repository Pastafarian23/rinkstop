'use client';

/**
 * src/app/admin/funnel/FunnelEventList.tsx
 *
 * Drill-down panel: shows the most recent raw events for a single funnel
 * step. Embedded under a FunnelTable when the admin clicks a step row.
 *
 * Fetches /api/admin/funnel/events?days=...&name=...&limit=... and renders
 * a compact list (ts + user + pathname + selected props).
 *
 * Event props included by default: any props the event naturally carries
 * (query_hash, entity_type, tier, etc.). We render them as a JSON snippet
 * so nothing is hidden.
 */

import { useEffect, useState } from 'react';

interface FunnelEventRow {
  ts: string;
  user_id: string | null;
  pathname: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  props: Record<string, unknown> | null;
}

interface FunnelEventListProps {
  name: string;
  humanLabel: string;
  days: number;
}

export function FunnelEventList({ name, humanLabel, days }: FunnelEventListProps) {
  const [events, setEvents] = useState<FunnelEventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEvents(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/admin/funnel/events?days=${days}&name=${encodeURIComponent(name)}&limit=50`,
          { credentials: 'include' }
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(typeof j.error === 'string' ? j.error : `HTTP ${res.status}`);
        }
        const j = await res.json();
        if (cancelled) return;
        setEvents(Array.isArray(j.events) ? j.events : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [name, days]);

  return (
    <div
      style={{
        marginTop: '0.85rem',
        background: '#0a0a0a',
        border: '1px solid #1e1e1e',
        borderRadius: 10,
        padding: '0.85rem 1rem',
      }}
      data-testid="funnel-event-list"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Recent events for
        </span>
        <strong style={{ color: '#fff', fontSize: '0.85rem' }}>{humanLabel}</strong>
        <code style={{ color: 'rgba(20,184,166,0.8)', fontSize: '0.75rem' }}>{name}</code>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>({days}d, latest 50)</span>
      </div>

      {loading && (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', padding: '0.5rem 0' }}>
          Loading…
        </div>
      )}

      {error && (
        <div style={{ color: '#FF6B7A', fontSize: '0.85rem', padding: '0.5rem 0' }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && events && events.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', padding: '0.5rem 0' }}>
          (no events in window)
        </div>
      )}

      {!loading && !error && events && events.length > 0 && (
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e1e1e', position: 'sticky', top: 0, background: '#0a0a0a' }}>
                <th style={cellTh}>When</th>
                <th style={cellTh}>User</th>
                <th style={cellTh}>Path</th>
                <th style={cellTh}>Props</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={cellTd}>{fmtTs(e.ts)}</td>
                  <td style={cellTdMono}>{e.user_id ? e.user_id.slice(0, 14) + (e.user_id.length > 14 ? '…' : '') : <span style={{ color: 'rgba(255,255,255,0.3)' }}>anon</span>}</td>
                  <td style={cellTdMono}>{e.pathname || '—'}</td>
                  <td style={cellTdMono}>
                    {e.props ? (
                      <code style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>
                        {JSON.stringify(e.props)}
                      </code>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const cellTh: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.35rem 0.5rem',
  color: 'rgba(255,255,255,0.4)',
  fontSize: '0.65rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const cellTd: React.CSSProperties = {
  padding: '0.4rem 0.5rem',
  color: '#fff',
  fontSize: '0.8rem',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const cellTdMono: React.CSSProperties = {
  padding: '0.4rem 0.5rem',
  color: 'rgba(255,255,255,0.7)',
  fontSize: '0.75rem',
  fontFamily: 'monospace',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 360,
};

function fmtTs(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const now = Date.now();
    const diffMs = now - d.getTime();
    const min = 60_000, hr = 3600_000, day = 86400_000;
    if (diffMs < min) return `${Math.round(diffMs / 1000)}s ago`;
    if (diffMs < hr) return `${Math.round(diffMs / min)}m ago`;
    if (diffMs < day) return `${Math.round(diffMs / hr)}h ago`;
    if (diffMs < day * 7) return `${Math.round(diffMs / day)}d ago`;
    return d.toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}
