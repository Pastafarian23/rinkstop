'use client';
//
// RinkConnectionsClient — tabbed view of connections, threads, and booking requests.

import { useState } from 'react';
import Link from 'next/link';

interface Connection {
  id: string;
  org_name: string;
  org_type: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  rink: { id: string; name: string; slug: string | null; city: string | null; province_state: string | null } | null;
}

interface BookingRequest {
  id: string;
  listing_id: string | null;
  rink_id: string;
  status: string;
  requested_price_cents: number | null;
  counter_price_cents: number | null;
  requested_start: string;
  requested_end: string;
  notes: string | null;
  created_at: string;
  listing: { id: string; title: string } | null;
  rink: { id: string; name: string; slug: string | null } | null;
}

interface Thread {
  id: string;
  connection_id: string;
  thread_type: string;
  subject: string | null;
  status: string;
  updated_at: string;
  connection: {
    id: string;
    org_name: string;
    rink: { id: string; name: string } | null;
  } | null;
}

interface Props {
  initialConnections: Connection[];
  initialRequests: BookingRequest[];
  initialThreads: Thread[];
}

type Tab = 'connections' | 'bookings' | 'messages';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  active: { bg: 'rgba(56,189,248,0.15)', fg: '#7DD3FC' },
  pending: { bg: 'rgba(255,184,28,0.15)', fg: '#FCD34D' },
  rejected: { bg: 'rgba(239,68,68,0.15)', fg: '#FCA5A5' },
  expired: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
  available: { bg: 'rgba(34,197,94,0.15)', fg: '#86efac' },
  booked: { bg: 'rgba(56,189,248,0.15)', fg: '#7DD3FC' },
  cancelled: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
  open: { bg: 'rgba(56,189,248,0.15)', fg: '#7DD3FC' },
  closed: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
  resolved: { bg: 'rgba(34,197,94,0.15)', fg: '#86efac' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPrice(cents: number | null): string {
  if (cents === null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

export default function RinkConnectionsClient({ initialConnections, initialRequests, initialThreads }: Props) {
  const [tab, setTab] = useState<Tab>('connections');

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem' }}>
        {(['connections','bookings','messages'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid #38BDF8' : '2px solid transparent',
              color: tab === t ? '#38BDF8' : '#94A3B8',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
              marginBottom: '-1px',
            }}
          >
            {t}
            {t === 'connections' && initialConnections.length > 0 && (
              <span style={{ marginLeft: '0.375rem', background: 'rgba(56,189,248,0.2)', color: '#7DD3FC', padding: '0.05rem 0.4rem', borderRadius: 999, fontSize: '0.75rem' }}>{initialConnections.length}</span>
            )}
            {t === 'bookings' && initialRequests.length > 0 && (
              <span style={{ marginLeft: '0.375rem', background: 'rgba(255,184,28,0.2)', color: '#FCD34D', padding: '0.05rem 0.4rem', borderRadius: 999, fontSize: '0.75rem' }}>{initialRequests.length}</span>
            )}
            {t === 'messages' && initialThreads.length > 0 && (
              <span style={{ marginLeft: '0.375rem', background: 'rgba(56,189,248,0.2)', color: '#7DD3FC', padding: '0.05rem 0.4rem', borderRadius: 999, fontSize: '0.75rem' }}>{initialThreads.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Connections tab */}
      {tab === 'connections' && (
        <div>
          {initialConnections.length === 0 ? (
            <EmptyState message="No rink connections yet. Connections are created when you book ice or send a message to a rink." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {initialConnections.map(conn => {
                const sc = STATUS_COLORS[conn.status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
                return (
                  <div key={conn.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{conn.org_name}</div>
                      <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '0.125rem' }}>
                        {conn.org_type} · {conn.role}
                        {conn.rink ? ` · ${conn.rink.name}` : ''}
                        {conn.rink?.city ? ` (${conn.rink.city}${conn.rink.province_state ? `, ${conn.rink.province_state}` : ''})` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{ background: sc.bg, color: sc.fg, padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize' }}>{conn.status}</span>
                      {conn.rink?.slug && (
                        <Link href={`/directory/rinks/${conn.rink.slug}`} style={{ color: '#38BDF8', fontSize: '0.8rem', textDecoration: 'none' }}>View rink →</Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bookings tab */}
      {tab === 'bookings' && (
        <div>
          {initialRequests.length === 0 ? (
            <EmptyState message="No booking requests yet. Browse the Ice Marketplace to request ice time." action={{ label: 'Browse marketplace', href: '/ice-marketplace' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {initialRequests.map(req => {
                const sc = STATUS_COLORS[req.status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
                return (
                  <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                        {req.listing?.title || 'Ice booking request'}
                      </div>
                      <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '0.125rem' }}>
                        {req.rink?.name || 'Unknown rink'}
                        {req.requested_start ? ` · ${new Date(req.requested_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                        {req.requested_price_cents !== null ? ` · ${formatPrice(req.requested_price_cents)}` : ''}
                        {req.counter_price_cents !== null ? ` → ${formatPrice(req.counter_price_cents)} (counter)` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{ background: sc.bg, color: sc.fg, padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize' }}>{req.status}</span>
                      <span style={{ color: '#475569', fontSize: '0.75rem' }}>{timeAgo(req.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Messages tab */}
      {tab === 'messages' && (
        <div>
          {initialThreads.length === 0 ? (
            <EmptyState message="No messages yet. Start a conversation with a rink from their profile page." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {initialThreads.map(thread => {
                const sc = STATUS_COLORS[thread.status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
                return (
                  <Link
                    key={thread.id}
                    href={`/dashboard/rink-connections/${thread.connection_id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1rem', background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, transition: 'border-color 0.15s' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                            {thread.subject || thread.connection?.rink?.name || 'Thread'}
                          </span>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.125rem', textTransform: 'capitalize' }}>
                          {thread.thread_type.replace(/_/g, ' ')}
                          {thread.connection?.rink?.name ? ` · ${thread.connection.rink.name}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                        <span style={{ background: sc.bg, color: sc.fg, padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize' }}>{thread.status}</span>
                        <span style={{ color: '#475569', fontSize: '0.75rem' }}>{timeAgo(thread.updated_at)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action?: { label: string; href: string } }) {
  return (
    <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '2.5rem 2rem', textAlign: 'center' }}>
      <p style={{ color: '#94A3B8', fontSize: '0.95rem', marginBottom: action ? '1rem' : 0 }}>{message}</p>
      {action && (
        <Link href={action.href} style={{ display: 'inline-block', background: '#38BDF8', color: '#0F172A', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
