'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Thread {
  id: string;
  connection_id: string;
  thread_type: string;
  subject: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  connection: { id: string; org_name: string; org_type: string } | null;
}

interface Props {
  rinkId: string;
  initialThreads: Thread[];
}

const TYPE_ICONS: Record<string, string> = {
  general: '💬',
  booking_request: '📅',
  contract_request: '📋',
  agreement: '✅',
  payment: '💰',
  dispute: '⚠️',
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
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

export default function ThreadsClient({ rinkId, initialThreads }: Props) {
  const [threads] = useState<Thread[]>(initialThreads);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const filtered = filter === 'all' ? threads : threads.filter(t => t.status === filter);

  const openCount = threads.filter(t => t.status === 'open').length;

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['all','open','resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.03)',
              color: filter === f ? '#7DD3FC' : '#94A3B8',
              border: `1px solid ${filter === f ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 6,
              padding: '0.25rem 0.75rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f} {f === 'open' ? `(${openCount})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '2.5rem 2rem', textAlign: 'center' }}>
          <p style={{ color: '#94A3B8', fontSize: '0.95rem' }}>No {filter === 'all' ? '' : filter} threads yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(thread => {
            const sc = STATUS_COLORS[thread.status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
            const icon = TYPE_ICONS[thread.thread_type] || '💬';
            return (
              <Link
                key={thread.id}
                href={`/dashboard/manage/rink/${rinkId}/threads/${thread.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, transition: 'border-color 0.15s', cursor: 'pointer' }}>
                  <div style={{ fontSize: '1.25rem', flexShrink: 0 }}>{icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                        {thread.subject || thread.connection?.org_name || 'No subject'}
                      </span>
                      {thread.connection && (
                        <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{thread.connection.org_name}</span>
                      )}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.125rem', textTransform: 'capitalize' }}>
                      {thread.thread_type.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                    <span style={{ background: sc.bg, color: sc.fg, padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize' }}>
                      {thread.status}
                    </span>
                    <span style={{ color: '#475569', fontSize: '0.75rem' }}>{timeAgo(thread.updated_at)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
