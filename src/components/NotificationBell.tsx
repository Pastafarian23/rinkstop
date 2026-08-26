'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface Notification {
  id: string;
  user_id: string;
  team_id: string;
  actor_user_id: string | null;
  kind: 'news' | 'result' | 'schedule' | 'announcement';
  entity_id: string | null;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  team: { id: string; slug: string; name: string } | null;
  actor: { user_id: string; display_name: string | null; username: string | null } | null;
}

const KIND_ICON: Record<Notification['kind'], string> = {
  news: '📰',
  result: '🏒',
  schedule: '📅',
  announcement: '📣',
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [consumerUnread, setConsumerUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const totalUnread = unread + consumerUnread;

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/notifications');
      if (!r.ok) {
        setNotifications([]);
        setUnread(0);
        return;
      }
      const d = await r.json();
      setNotifications(d.notifications || []);
      setUnread(d.unread || 0);
    } catch {
      // fail silently — bell is non-critical
    } finally {
      setLoading(false);
    }
  }

  // WS14 PR2: also fetch consumer notification unread count.
  // Consumer notifications show in /dashboard/notifications, not in the bell dropdown.
  // The badge reflects BOTH streams combined.
  async function loadConsumerUnread() {
    try {
      const r = await fetch('/api/consumer-notifications/unread-count');
      if (r.ok) {
        const d = await r.json();
        setConsumerUnread(d.unread ?? 0);
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    load();
    loadConsumerUnread();
    const id = setInterval(() => { load(); loadConsumerUnread(); }, 60_000); // poll every minute
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function markAllRead() {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
      );
      setUnread(0);
    } catch {}
  }

  async function markOneRead(id: string) {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)),
      );
      setUnread((u) => Math.max(0, u - 1));
    } catch {}
  }

  const linkFor = (n: Notification): string => {
    if (n.team?.slug) return `/dashboard/team/${n.team.slug}`;
    return '/dashboard';
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={totalUnread > 0 ? `Notifications (${totalUnread} unread)` : 'Notifications'}
        title={totalUnread > 0 ? `${totalUnread} unread notifications` : 'Notifications'}
        style={{
          position: 'relative',
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff',
          fontSize: '1.1rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span aria-hidden="true">🔔</span>
        {totalUnread > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 9,
              background: '#C8102E',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #041E42',
              lineHeight: 1,
            }}
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="dashboard-dropdown-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            // Day 7: width: min() lets the panel shrink on narrow viewports
            // instead of overflowing. maxWidth is the fallback (kept for
            // older browsers); width is the primary clamp.
            width: 'min(360px, calc(100vw - 2rem))',
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: 480,
            overflowY: 'auto',
            background: '#0F1A2E',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <strong style={{ fontSize: '0.85rem', color: '#fff' }}>Notifications</strong>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFB81C',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {loading && notifications.length === 0 && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              Loading…
            </div>
          )}

          {!loading && notifications.length === 0 && consumerUnread === 0 && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>🔔</div>
              No notifications yet.
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
                Updates from teams you manage will appear here.
              </div>
            </div>
          )}

          {!loading && notifications.length === 0 && consumerUnread > 0 && (
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                gap: '0.65rem',
                padding: '1rem',
                background: 'rgba(255,184,28,0.05)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ fontSize: '1.1rem', flexShrink: 0, lineHeight: 1.3 }}>🔔</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.825rem', color: '#fff', fontWeight: 600, marginBottom: '0.15rem' }}>
                  {consumerUnread} unread {consumerUnread === 1 ? 'notification' : 'notifications'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                  Tap to view all notifications
                </div>
              </div>
            </Link>
          )}

          {notifications.map((n) => (
            <Link
              key={n.id}
              href={linkFor(n)}
              onClick={() => markOneRead(n.id)}
              style={{
                display: 'flex',
                gap: '0.65rem',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: n.read_at ? 'transparent' : 'rgba(255,184,28,0.05)',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ fontSize: '1.1rem', flexShrink: 0, lineHeight: 1.3 }}>
                {KIND_ICON[n.kind] || '🔔'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.825rem', color: '#fff', fontWeight: n.read_at ? 400 : 600, marginBottom: '0.15rem' }}>
                  {n.title}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {n.team && <span>{n.team.name}</span>}
                  {n.actor && <span>· {n.actor.display_name || n.actor.username}</span>}
                  <span>· {timeAgo(n.created_at)}</span>
                </div>
              </div>
              {!n.read_at && (
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#FFB81C',
                    flexShrink: 0,
                    marginTop: 6,
                  }}
                />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}