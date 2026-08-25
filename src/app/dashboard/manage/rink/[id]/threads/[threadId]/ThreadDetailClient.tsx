'use client';
//
// ThreadDetailClient — message history + reply box + status actions.

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  attachments: string[] | null;
  read_at: string | null;
  created_at: string;
}

interface Thread {
  id: string;
  connection_id: string;
  thread_type: string;
  subject: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  connection: { id: string; org_name: string; org_type: string } | null;
}

interface Props {
  rinkId: string;
  thread: Thread;
  initialMessages: Message[];
  currentUserId: string;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function ThreadDetailClient({ rinkId, thread, initialMessages, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [threadStatus, setThreadStatus] = useState(thread.status);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/rink-connections/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to send.'); return; }
      // Append optimistically
      setMessages(prev => [...prev, { ...json.message, created_at: new Date().toISOString() }]);
      setReply('');
      // Refresh full list to get sender info
      const listRes = await fetch(`/api/owner/rinks/${rinkId}/threads/${thread.id}`);
      if (listRes.ok) {
        const listJson = await listRes.json();
        setMessages(listJson.messages || []);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    const res = await fetch(`/api/owner/rinks/${rinkId}/threads/${thread.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setThreadStatus(newStatus);
  }

  const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
    open: { bg: 'rgba(56,189,248,0.15)', fg: '#7DD3FC' },
    closed: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
    resolved: { bg: 'rgba(34,197,94,0.15)', fg: '#86efac' },
  };
  const sc = STATUS_COLORS[threadStatus] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Status controls */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ background: sc.bg, color: sc.fg, padding: '0.2rem 0.625rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>
          {threadStatus}
        </span>
        {threadStatus === 'open' && (
          <>
            <button onClick={() => handleUpdateStatus('resolved')} style={{ background: 'rgba(34,197,94,0.1)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 6, padding: '0.25rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}>
              ✓ Mark resolved
            </button>
            <button onClick={() => handleUpdateStatus('closed')} style={{ background: 'rgba(148,163,184,0.1)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 6, padding: '0.25rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}>
              Close thread
            </button>
          </>
        )}
        {(threadStatus === 'resolved' || threadStatus === 'closed') && (
          <button onClick={() => handleUpdateStatus('open')} style={{ background: 'rgba(56,189,248,0.1)', color: '#7DD3FC', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 6, padding: '0.25rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}>
            Reopen
          </button>
        )}
      </div>

      {/* Message history */}
      <div style={{ background: 'rgba(13,17,23,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1rem', maxHeight: 480, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.875rem', padding: '2rem 0' }}>
            No messages yet. Send the first message below.
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: '0.125rem' }}>
                <div style={{ maxWidth: '75%' }}>
                  <div style={{
                    background: isMine ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${isMine ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    color: '#e2e8f0',
                    padding: '0.625rem 0.875rem',
                    borderRadius: isMine ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '0.25rem', paddingLeft: isMine ? 0 : '0.25rem', paddingRight: isMine ? '0.25rem' : 0, textAlign: isMine ? 'right' : 'left' }}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      {threadStatus !== 'closed' && (
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-end' }}>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5', padding: '0.5rem 0.75rem', borderRadius: 8, fontSize: '0.8rem', width: '100%' }}>{error}</div>}
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Type your message..."
            rows={3}
            style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', padding: '0.75rem 1rem', fontSize: '0.875rem', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
          <button
            type="submit"
            disabled={sending || !reply.trim()}
            style={{ background: sending ? 'rgba(56,189,248,0.5)' : '#38BDF8', color: '#0F172A', border: 'none', padding: '0.75rem 1.25rem', borderRadius: 10, fontWeight: 700, fontSize: '0.875rem', cursor: sending ? 'not-allowed' : 'pointer', alignSelf: 'flex-end' }}
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
      )}

      {threadStatus === 'closed' && (
        <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8 }}>
          This thread is closed. Reopen it to send a message.
        </div>
      )}
    </div>
  );
}
