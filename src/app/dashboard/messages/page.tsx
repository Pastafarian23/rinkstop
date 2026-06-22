'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BrandSpinner from '@/components/BrandSpinner';

interface ThreadRow {
  id: string;
  connection_id: string;
  context_profile_type: string | null;
  context_profile_id: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  otherUser: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    tier: string;
  };
  unreadCount: number;
}

function MessagesInbox() {
  const searchParams = useSearchParams();
  const withUserId = searchParams?.get('with');

  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/threads');
      if (!res.ok) {
        setThreads([]);
        return;
      }
      const { threads } = await res.json();
      setThreads(threads || []);
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }

  // If ?with=USER_ID is set and no thread exists, create one.
  useEffect(() => {
    if (!withUserId) { void load(); return; }
    (async () => {
      setCreating(true);
      setError(null);
      try {
        const res = await fetch('/api/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipientId: withUserId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to start conversation.');
          setCreating(false);
          return;
        }
        if (data.thread?.id) {
          window.location.href = `/dashboard/messages/${data.thread.id}`;
          return;
        }
        setCreating(false);
      } catch (e: any) {
        setError(e?.message || 'Network error.');
        setCreating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withUserId]);

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffH = (now.getTime() - d.getTime()) / 36e5;
    if (diffH < 24) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (diffH < 168) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  if (creating) {
    return (
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>Opening conversation…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, color: '#fff', marginBottom: 12 }}>Can&apos;t open conversation</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>{error}</p>
        <Link href="/dashboard/connections" style={{ color: '#FFB81C', marginTop: 16, display: 'inline-block' }}>Go to Connections</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Messages</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 }}>
          Direct messages with your connections.
        </p>
      </div>

      {loading ? (
        <BrandSpinner label="Loading messages…" />
      ) : threads.length === 0 ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12 }}>
          <h2 style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', margin: 0, marginBottom: 8 }}>No conversations yet</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0, marginBottom: 16 }}>
            Start a conversation by connecting with someone on their profile, then message them.
          </p>
          <Link href="/dashboard/connections" style={{ display: 'inline-block', background: '#C8102E', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>View Connections</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {threads.map((t) => {
            const name = t.otherUser.display_name || 'RinkStop Member';
            return (
              <Link
                key={t.id}
                href={`/dashboard/messages/${t.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '0.75rem 1rem',
                  background: t.unreadCount > 0 ? 'rgba(20,184,166,0.05)' : '#0f0f0f',
                  border: t.unreadCount > 0 ? '1px solid rgba(20,184,166,0.3)' : '1px solid #1e1e1e',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: '#fff',
                }}
              >
                {t.otherUser.avatar_url ? (
                  <img src={t.otherUser.avatar_url} alt={name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#041E42', color: '#FFB81C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                    {name[0]?.toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{formatTime(t.last_message_at)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.last_message_preview || <em>No messages yet</em>}
                    </div>
                    {t.unreadCount > 0 && (
                      <span style={{ background: '#C8102E', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '0.1rem 0.5rem', minWidth: 20, textAlign: 'center' }}>{t.unreadCount}</span>
                    )}
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

export default function MessagesPage() {
  return (
    <Suspense fallback={<p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading…</p>}>
      <MessagesInbox />
    </Suspense>
  );
}
