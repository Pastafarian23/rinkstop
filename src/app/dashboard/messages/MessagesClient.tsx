'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Thread {
  id: string;
  other_user_id: string;
  other_user: { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

interface MessagesClientProps {
  userId: string;
  initialThreads: Thread[];
  canDM: boolean;
  userTier: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const sameYear = d.getFullYear() === now.getFullYear();
  if (sameYear) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function displayName(t: Thread): string {
  if (!t.other_user) return 'Unknown user';
  return t.other_user.display_name || t.other_user.username || t.other_user.user_id;
}

export default function MessagesClient({ userId, initialThreads, canDM, userTier }: MessagesClientProps) {
  const router = useRouter();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreads[0]?.id || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRecipient, setNewRecipient] = useState('');
  const [composing, setComposing] = useState(false);

  const activeThread = initialThreads.find((t) => t.id === activeThreadId) || null;

  const loadThread = useCallback(async (threadId: string) => {
    try {
      const res = await fetch(`/api/direct-messages/threads/${threadId}`);
      if (!res.ok) {
        setError('Could not load thread');
        return;
      }
      const d = await res.json();
      setMessages(d.messages || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (activeThreadId) {
      loadThread(activeThreadId);
    } else {
      setMessages([]);
    }
  }, [activeThreadId, loadThread]);

  async function handleSend() {
    if (!activeThreadId) return;
    if (draft.trim().length < 1) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/direct-messages/threads/${activeThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Send failed (${res.status})`);
      }
      const d = await res.json();
      setMessages((prev) => [...prev, d.message]);
      setDraft('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  async function handleStartNew() {
    if (newRecipient.trim().length < 1) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/direct-messages/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_user_id: newRecipient.trim(), body: 'Hi!' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Start failed (${res.status})`);
      }
      const d = await res.json();
      setNewRecipient('');
      setComposing(false);
      router.refresh();
      // Switch to the new thread on next render
      if (d.thread_id) {
        setActiveThreadId(d.thread_id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      data-testid="messages-page"
      style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: 16,
        maxWidth: 1100,
        margin: '0 auto',
        minHeight: 'calc(100vh - 200px)',
      }}
    >
      {/* Left rail: thread list */}
      <aside
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.05rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            MESSAGES
          </h2>
          {canDM ? (
            <button
              type="button"
              onClick={() => setComposing((c) => !c)}
              data-testid="messages-new"
              style={{
                padding: '0.3rem 0.6rem',
                background: '#14B8A6',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: 4,
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + New
            </button>
          ) : (
            <a
              href="/pricing"
              data-testid="messages-upgrade"
              style={{
                padding: '0.3rem 0.6rem',
                background: 'transparent',
                color: '#FFB81C',
                border: '1px solid rgba(255,184,28,0.4)',
                borderRadius: 4,
                fontSize: '0.7rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
              title="Direct messaging requires Hockey Passport (\$24.99/yr) or any paid org tier"
            >
              Verify to message
            </a>
          )}
        </div>
        {composing ? (
          <div
            data-testid="messages-compose"
            style={{
              padding: '0.6rem',
              background: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: 6,
              marginBottom: 8,
            }}
          >
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
              Recipient user ID
            </label>
            <input
              type="text"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              placeholder="user_abc123"
              style={{
                width: '100%',
                padding: '0.4rem',
                background: '#141414',
                border: '1px solid #2a2a2a',
                borderRadius: 4,
                color: '#fff',
                fontSize: '0.8rem',
                marginBottom: 6,
              }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={handleStartNew}
                disabled={sending}
                style={{
                  flex: 1,
                  padding: '0.3rem 0.5rem',
                  background: '#14B8A6',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: sending ? 'not-allowed' : 'pointer',
                }}
              >
                Send
              </button>
              <button
                type="button"
                onClick={() => { setComposing(false); setNewRecipient(''); }}
                style={{
                  padding: '0.3rem 0.5rem',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 4,
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        {initialThreads.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>
            No conversations yet. Click + New to start one.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {initialThreads.map((t) => {
              const isActive = t.id === activeThreadId;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveThreadId(t.id)}
                    data-testid="messages-thread-row"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.6rem',
                      background: isActive ? '#1e1e1e' : 'transparent',
                      border: isActive ? '1px solid #14B8A6' : '1px solid transparent',
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#fff', fontWeight: t.unread_count > 0 ? 700 : 500, fontSize: '0.85rem' }}>
                        {displayName(t)}
                      </span>
                      {t.unread_count > 0 ? (
                        <span
                          style={{
                            background: '#14B8A6',
                            color: '#0a0a0a',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.05rem 0.35rem',
                            borderRadius: 999,
                          }}
                        >
                          {t.unread_count}
                        </span>
                      ) : null}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem' }}>
                      {t.last_message_preview || '(no messages)'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>
                      {formatTime(t.last_message_at)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Right pane: thread */}
      <section
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {activeThread ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #1e1e1e',
                marginBottom: '0.75rem',
              }}
            >
              <h2
                style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: '1.05rem',
                  color: '#fff',
                  letterSpacing: '0.05em',
                  margin: 0,
                }}
              >
                {displayName(activeThread)}
              </h2>
            </div>
            <div
              data-testid="messages-thread"
              style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 300 }}
            >
              {messages.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '2rem 0' }}>
                  No messages in this thread yet.
                </p>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === userId;
                  return (
                    <div
                      key={m.id}
                      data-testid="messages-message"
                      style={{
                        alignSelf: isMine ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        background: isMine ? 'rgba(20,184,166,0.15)' : '#141414',
                        border: isMine ? '1px solid rgba(20,184,166,0.4)' : '1px solid #1e1e1e',
                        borderRadius: 10,
                        padding: '0.5rem 0.75rem',
                        color: '#fff',
                        fontSize: '0.85rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      <div>{m.body}</div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                        {formatTime(m.created_at)}
                        {isMine && m.read_at ? ' · read' : ''}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {error ? (
              <div
                role="alert"
                style={{
                  padding: '0.4rem 0.6rem',
                  background: 'rgba(200,16,46,0.12)',
                  border: '1px solid rgba(200,16,46,0.4)',
                  borderRadius: 6,
                  color: '#FF6B7A',
                  fontSize: '0.8rem',
                  marginBottom: 6,
                }}
              >
                {error}
              </div>
            ) : null}
            {canDM ? (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message..."
                maxLength={5000}
                disabled={sending}
                data-testid="messages-input"
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  background: '#141414',
                  border: '1px solid #2a2a2a',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || draft.trim().length < 1}
                data-testid="messages-send"
                style={{
                  padding: '0.5rem 1rem',
                  background: sending || draft.trim().length < 1 ? '#9ca3af' : '#14B8A6',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: sending || draft.trim().length < 1 ? 'not-allowed' : 'pointer',
                }}
              >
                {sending ? '…' : 'Send'}
              </button>
            </div>
            ) : (
              <div
                data-testid="messages-upgrade-prompt"
                style={{
                  marginTop: 8,
                  padding: '0.6rem 0.75rem',
                  background: 'rgba(255,184,28,0.06)',
                  border: '1px solid rgba(255,184,28,0.25)',
                  borderRadius: 6,
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span>
                  Direct messaging requires a paid tier.
                </span>
                <a
                  href="/pricing"
                  style={{
                    padding: '0.35rem 0.7rem',
                    background: '#FFB81C',
                    color: '#0a0a0a',
                    borderRadius: 4,
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '0.78rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  See plans
                </a>
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '4rem 0' }}>
            Select a conversation to view messages.
          </div>
        )}
      </section>
    </div>
  );
}
