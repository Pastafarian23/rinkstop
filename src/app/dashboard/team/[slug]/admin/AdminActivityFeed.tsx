'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ActivityRow {
  id: string;
  user_id: string;
  actor_user_id: string | null;
  kind: 'news' | 'result' | 'schedule' | 'announcement';
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

interface Props {
  teamSlug: string;
  activity: ActivityRow[];
}

const KIND_ICON: Record<ActivityRow['kind'], string> = {
  news: '📰',
  result: '🏒',
  schedule: '📅',
  announcement: '📣',
};

const KIND_LABEL: Record<ActivityRow['kind'], string> = {
  news: 'News posted',
  result: 'Result recorded',
  schedule: 'Schedule added',
  announcement: 'Announcement',
};

function fmtRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AdminActivityFeed({ teamSlug, activity }: Props) {
  const [rows, setRows] = useState<ActivityRow[]>(activity);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Light polling — refresh every 60s so multiple admins see each other's
  // posts in near-real-time without needing a websocket. Cheap, no auth
  // round-trip per request (Next.js dedupes the fetch).
  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/team/${encodeURIComponent(teamSlug)}/admin/activity`, { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d.activity)) setRows(d.activity);
    } catch {
      // network error — keep current list
    }
  }, [teamSlug]);

  useEffect(() => {
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  const visible = filter === 'unread' ? rows.filter((r) => !r.read_at) : rows;
  const unreadCount = rows.filter((r) => !r.read_at).length;

  async function markRead(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, read_at: new Date().toISOString() } : r)));
    try {
      await fetch(`/api/team/${encodeURIComponent(teamSlug)}/admin/activity/${id}/read`, { method: 'POST' });
    } catch {
      // Best-effort — server is the source of truth, will catch up on next refresh
    }
  }

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.25rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            Admin activity
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            Last 30 days · {rows.length} event{rows.length === 1 ? '' : 's'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={() => setFilter('all')}
            style={filterBtnStyle(filter === 'all')}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            style={filterBtnStyle(filter === 'unread')}
          >
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div
          style={{
            background: 'rgba(255,184,28,0.04)',
            border: '1px dashed rgba(255,184,28,0.3)',
            borderRadius: 8,
            padding: '1.25rem 1rem',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.55)',
            fontSize: '0.85rem',
          }}
        >
          <strong style={{ color: '#FFB81C', display: 'block', marginBottom: '0.2rem' }}>
            {filter === 'unread' ? 'You\'re caught up.' : 'No activity yet.'}
          </strong>
          {filter === 'unread'
            ? 'No new posts to review.'
            : 'Once admins start posting news, logging results, or adding schedule entries, you\'ll see them here.'}
        </div>
      ) : (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {visible.map((r) => {
            const isUnread = !r.read_at;
            return (
              <li
                key={r.id}
                onClick={() => isUnread && markRead(r.id)}
                style={{
                  background: isUnread ? 'rgba(255,184,28,0.05)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isUnread ? 'rgba(255,184,28,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 8,
                  padding: '0.75rem 1rem',
                  cursor: isUnread ? 'pointer' : 'default',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: '1.05rem', lineHeight: 1.4 }}>{KIND_ICON[r.kind]}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'baseline' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#fff', fontWeight: isUnread ? 700 : 500 }}>
                      {KIND_LABEL[r.kind]}: {r.title}
                    </p>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                      {fmtRelative(r.created_at)}
                    </span>
                  </div>
                  {r.body && (
                    <p
                      style={{
                        margin: '0.25rem 0 0',
                        fontSize: '0.78rem',
                        color: 'rgba(255,255,255,0.5)',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {r.body}
                    </p>
                  )}
                </div>
                {isUnread && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: '#FFB81C',
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                    aria-label="unread"
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}

      <p style={{ margin: '1rem 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
        Activity is auto-refreshed every 60s.{' '}
        <Link href={`/dashboard/team/${teamSlug}`} style={{ color: '#14B8A6', textDecoration: 'none' }}>
          Post something →
        </Link>
      </p>
    </section>
  );
}

function filterBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '0.3rem 0.7rem',
    background: active ? '#FFB81C' : 'transparent',
    color: active ? '#041E42' : 'rgba(255,255,255,0.6)',
    border: `1px solid ${active ? '#FFB81C' : 'rgba(255,255,255,0.15)'}`,
    borderRadius: 5,
    fontSize: '0.72rem',
    fontWeight: 700,
    cursor: 'pointer',
  };
}
