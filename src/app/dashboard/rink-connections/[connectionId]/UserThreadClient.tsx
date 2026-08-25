'use client';
//
// UserThreadClient — list threads for a connection, click to expand + reply.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Thread {
  id: string;
  thread_type: string;
  subject: string | null;
  status: string;
  updated_at: string;
  created_at: string;
}

interface Props {
  connectionId: string;
  initialThreads: Thread[];
  currentUserId: string;
}

const TYPE_ICONS: Record<string, string> = {
  general: '💬', booking_request: '📅', contract_request: '📋',
  agreement: '✅', payment: '💰', dispute: '⚠️',
};

const TYPE_LABELS: Record<string, string> = {
  general: 'General', booking_request: 'Booking Request', contract_request: 'Contract Request',
  agreement: 'Agreement', payment: 'Payment', dispute: 'Dispute',
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

export default function UserThreadClient({ connectionId, initialThreads, currentUserId }: Props) {
  const [threads] = useState<Thread[]>(initialThreads);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSend(threadId: string) {
    const content = reply[threadId]?.trim();
    if (!content) return;
    setSending(threadId);
    setError('');
    try {
      const res = await fetch(`/api/rink-connections/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to send.'); return; }
      setReply(prev => ({ ...prev, [threadId]: '' }));
      setExpanded(null);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(null);
    }
  }

  if (threads.length === 0) {
    return (
      <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#94A3B8', fontSize: '0.95rem' }}>No conversations yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.875rem' }}>{error}</div>
      )}
      {threads.map(thread => {
        const isOpen = expanded === thread.id;
        const sc = STATUS_COLORS[thread.status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
        return (
          <div key={thread.id} style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
            <div
              onClick={() => setExpanded(isOpen ? null : thread.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                {TYPE_ICONS[thread.thread_type] || '💬'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                  {thread.subject || TYPE_LABELS[thread.thread_type] || 'Thread'}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'capitalize' }}>
                  {thread.thread_type.replace(/_/g, ' ')} · {timeAgo(thread.updated_at)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <span style={{ background: sc.bg, color: sc.fg, padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize' }}>
                  {thread.status}
                </span>
                <span style={{ color: '#475569', fontSize: '1rem' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && thread.status !== 'closed' && (
              <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.875rem', alignItems: 'flex-end' }}>
                  <textarea
                    value={reply[thread.id] || ''}
                    onChange={e => setReply(prev => ({ ...prev, [thread.id]: e.target.value }))}
                    placeholder="Send a message..."
                    rows={2}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', padding: '0.625rem 0.875rem', fontSize: '0.875rem', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={() => handleSend(thread.id)}
                    disabled={sending === thread.id || !reply[thread.id]?.trim()}
                    style={{ background: sending === thread.id ? 'rgba(56,189,248,0.5)' : '#38BDF8', color: '#0F172A', border: 'none', padding: '0.625rem 1rem', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: sending === thread.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {sending === thread.id ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
