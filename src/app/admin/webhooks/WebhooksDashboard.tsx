'use client';

import { useEffect, useState } from 'react';

interface Event {
  id: string;
  event_id: string;
  event_type: string;
  status: 'received' | 'processed' | 'failed';
  error: string | null;
  processed_at: string | null;
  created_at: string;
  payload_summary: {
    type?: string;
    id?: string;
    object_type?: string;
    customer?: string;
    subscription?: string;
    metadata?: Record<string, string>;
    amount_paid?: number;
  };
}

interface InitialData {
  events: Event[];
  total: number;
  limit: number;
  offset: number;
}

type StatusFilter = 'all' | 'received' | 'processed' | 'failed';

const STATUS_COLOR: Record<Event['status'], { bg: string; fg: string }> = {
  received: { bg: 'rgba(255,184,28,0.15)', fg: '#FFB81C' },
  processed: { bg: 'rgba(40,167,69,0.15)', fg: '#28a745' },
  failed: { bg: 'rgba(200,16,46,0.15)', fg: '#C8102E' },
};

const STATUS_ICON: Record<Event['status'], string> = {
  received: '⏳',
  processed: '✓',
  failed: '✗',
};

export default function WebhooksDashboard({ initial }: { initial: { data?: InitialData; error?: string; status?: number } }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [events, setEvents] = useState<Event[]>(initial.data?.events || []);
  const [total, setTotal] = useState(initial.data?.total || 0);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load(s: StatusFilter) {
    setLoading(true);
    try {
      const url = s === 'all'
        ? '/api/admin/stripe-webhook-events?limit=50'
        : `/api/admin/stripe-webhook-events?status=${s}&limit=50`;
      const r = await fetch(url);
      if (!r.ok) return;
      const d: InitialData = await r.json();
      setEvents(d.events);
      setTotal(d.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  if (initial.error === 'unauthorized') {
    return <p style={{ color: '#C8102E' }}>Not authorized. Must be admin.</p>;
  }
  if (initial.error === 'fetch_failed') {
    return <p style={{ color: '#C8102E' }}>Failed to load (HTTP {initial.status}).</p>;
  }

  const counts = {
    all: initial.data?.total ?? total,
  };

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['all', 'received', 'processed', 'failed'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: 6,
              border: statusFilter === s ? '1px solid #041E42' : '1px solid rgba(0,0,0,0.15)',
              background: statusFilter === s ? '#041E42' : '#fff',
              color: statusFilter === s ? '#fff' : '#041E42',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: statusFilter === s ? 600 : 400,
            }}
          >
            {s === 'all' ? `All (${counts.all})` : `${STATUS_ICON[s]} ${s}`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && events.length === 0 && (
        <p style={{ color: 'rgba(0,0,0,0.5)', textAlign: 'center', padding: '2rem' }}>Loading…</p>
      )}

      {!loading && events.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(0,0,0,0.4)', border: '2px dashed rgba(0,0,0,0.15)', borderRadius: 12 }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
          <p style={{ margin: 0 }}>No webhook events{statusFilter !== 'all' ? ` with status=${statusFilter}` : ''}.</p>
          <p style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}>
            Events will appear here as Stripe sends them to <code>/api/webhooks/stripe</code>.
          </p>
        </div>
      )}

      {events.map((e) => {
        const color = STATUS_COLOR[e.status];
        const isExpanded = expandedId === e.id;
        return (
          <div
            key={e.id}
            style={{
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 8,
              padding: '0.75rem 1rem',
              marginBottom: '0.5rem',
              background: '#fff',
              cursor: 'pointer',
            }}
            onClick={() => setExpandedId(isExpanded ? null : e.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ background: color.bg, color: color.fg, padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                {STATUS_ICON[e.status]} {e.status}
              </span>
              <code style={{ fontSize: '0.85rem', fontWeight: 600 }}>{e.event_type}</code>
              <span style={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.8rem' }}>{e.event_id}</span>
              <span style={{ marginLeft: 'auto', color: 'rgba(0,0,0,0.5)', fontSize: '0.8rem' }}>
                {new Date(e.created_at).toLocaleString()}
              </span>
            </div>

            {/* Quick metadata preview */}
            {e.payload_summary?.metadata && Object.keys(e.payload_summary.metadata).length > 0 && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'rgba(0,0,0,0.6)' }}>
                metadata:{' '}
                {Object.entries(e.payload_summary.metadata).map(([k, v]) => (
                  <span key={k} style={{ marginRight: '0.6rem' }}>
                    <code style={{ background: 'rgba(0,0,0,0.05)', padding: '0.05rem 0.3rem', borderRadius: 3 }}>{k}={String(v).slice(0, 30)}</code>
                  </span>
                ))}
              </div>
            )}

            {e.error && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#C8102E', fontFamily: 'monospace' }}>
                {e.error}
              </div>
            )}

            {/* Expanded: full payload */}
            {isExpanded && (
              <details open style={{ marginTop: '0.6rem' }} onClick={(ev) => ev.stopPropagation()}>
                <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Full payload</summary>
                <pre style={{ background: '#0F1A2E', color: '#fff', padding: '0.75rem', borderRadius: 6, fontSize: '0.75rem', overflow: 'auto', maxHeight: 320 }}>
                  {JSON.stringify(e.payload_summary, null, 2)}
                </pre>
              </details>
            )}
          </div>
        );
      })}

      {events.length > 0 && (
        <p style={{ marginTop: '1rem', color: 'rgba(0,0,0,0.5)', fontSize: '0.85rem' }}>
          Showing {events.length} of {total} events. Click a row to expand the full payload.
        </p>
      )}
    </div>
  );
}
