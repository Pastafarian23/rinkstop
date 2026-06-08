'use client';

import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
  sender: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    tier: string;
  };
}

interface Thread {
  id: string;
  connection_id: string;
  context_profile_type: string | null;
  context_profile_id: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
}

interface ContextProfile {
  type: 'player' | 'team' | 'league' | 'rink';
  id: string;
  name: string;
  url: string;
}

const TIER_LABEL: Record<string, string> = {
  free: 'Free',
  supporter: 'Supporter',
  verified: 'Verified',
  pro: 'Pro',
};

export default function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params);
  const { user: clerkUser, isLoaded } = useUser();
  const me = clerkUser?.id;

  const [thread, setThread] = useState<Thread | null>(null);
  const [otherUser, setOtherUser] = useState<{ user_id: string; display_name: string | null; avatar_url: string | null; tier: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<ContextProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/threads/${threadId}/messages?limit=100`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        setError('Failed to load conversation.');
        return;
      }
      const data = await res.json();
      setThread(data.thread);
      setMessages(data.messages || []);

      // Load otherUser.
      if (data.otherUserId && me) {
        const profRes = await fetch(`/api/profiles/${data.otherUserId}`);
        if (profRes.ok) {
          const prof = await profRes.json();
          setOtherUser({
            user_id: data.otherUserId,
            display_name: prof.profile?.display_name || null,
            avatar_url: prof.profile?.avatar_url || null,
            tier: prof.profile?.tier || 'free',
          });
        }
      }

      // Load context profile (kid's player, team, league, or rink).
      if (data.thread?.context_profile_type && data.thread?.context_profile_id) {
        await loadContext(data.thread.context_profile_type as ContextProfile['type'], data.thread.context_profile_id);
      }
    } catch (e: any) {
      setError(e?.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  }

  async function loadContext(type: ContextProfile['type'], id: string) {
    try {
      const res = await fetch(`/api/entities/${type}/${id}`);
      if (res.ok) {
        const d = await res.json();
        setContext({ type, id, name: d.name || 'Profile', url: d.url || '#' });
      }
    } catch {
      // Silently skip
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, isLoaded]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages.
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send.');
        setSending(false);
        return;
      }
      setMessages((prev) => [...prev, { ...data.message, sender: { user_id: me!, display_name: clerkUser?.fullName || 'You', avatar_url: clerkUser?.imageUrl || null, tier: 'free' } }]);
      setDraft('');
    } catch (e: any) {
      setError(e?.message || 'Network error.');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading conversation…</p>;
  }

  if (notFound) {
    return (
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, color: '#fff' }}>Conversation not found</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>This thread doesn&apos;t exist or you don&apos;t have access.</p>
        <Link href="/dashboard/messages" style={{ color: '#FFB81C', marginTop: 16, display: 'inline-block' }}>← Back to Messages</Link>
      </div>
    );
  }

  const otherName = otherUser?.display_name || 'RinkStop Member';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', borderBottom: '1px solid #1e1e1e', background: '#0f0f0f', borderRadius: '12px 12px 0 0' }}>
        {otherUser?.avatar_url ? (
          <img src={otherUser.avatar_url} alt={otherName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#041E42', color: '#FFB81C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
            {otherName[0]?.toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <Link href={`/u/${otherUser?.user_id}`} style={{ color: '#fff', fontWeight: 600, textDecoration: 'none' }}>{otherName}</Link>
          {otherUser && (
            <span style={{ marginLeft: 8, fontSize: 11, padding: '0.1rem 0.5rem', background: 'rgba(20,184,166,0.1)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.3)', borderRadius: 999 }}>
              {TIER_LABEL[otherUser.tier] || 'Free'}
            </span>
          )}
          {context && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              Re: <Link href={context.url} style={{ color: '#FFB81C', textDecoration: 'none' }}>{context.name}</Link>
            </div>
          )}
        </div>
        <Link href="/dashboard/messages" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none' }}>← Inbox</Link>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: '#0a0a0a', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 32 }}>No messages yet. Send the first one.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '70%', padding: '0.6rem 0.9rem', background: mine ? '#C8102E' : '#1e1e1e', color: '#fff', borderRadius: 12, fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {m.body}
                  <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                    {new Date(m.created_at).toLocaleString([], { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} style={{ display: 'flex', gap: 8, padding: '0.75rem 1rem', borderTop: '1px solid #1e1e1e', background: '#0f0f0f', borderRadius: '0 0 12px 12px' }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(e as any);
            }
          }}
          style={{ flex: 1, padding: '0.5rem 0.75rem', background: '#1e1e1e', color: '#fff', border: '1px solid #2e2e2e', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', resize: 'none' }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          style={{ background: '#C8102E', color: '#fff', border: 'none', padding: '0.5rem 1.2rem', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: sending || !draft.trim() ? 'default' : 'pointer', opacity: sending || !draft.trim() ? 0.6 : 1 }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </form>
      {error && <p style={{ color: '#C8102E', fontSize: 13, padding: '0.5rem 1rem' }}>{error}</p>}
    </div>
  );
}
