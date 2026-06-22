'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

// Renders a Connect / Pending / Accept/Decline / Connected / Blocked control
// for a target user. Used on the user profile page (and could be reused elsewhere).
//
// Props:
//   otherUserId:        the Clerk userId of the person being viewed
//   otherDisplayName:   for "Connect with [Name]" labels
//   compact:            if true, renders a smaller button for tight spaces
export default function ConnectButton({
  otherUserId,
  otherDisplayName = 'this user',
  compact = false,
}: {
  otherUserId: string;
  otherDisplayName?: string;
  compact?: boolean;
}) {
  const { user: clerkUser, isLoaded } = useUser();
  const me = clerkUser?.id;
  const [myTier, setMyTier] = useState<string>('free');

  // Fetch the caller's tier from /api/profiles/me (source of truth is profiles table, not Clerk).
  useEffect(() => {
    if (!isLoaded || !me) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profiles/me');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setMyTier(data.profile?.tier || 'free');
      } catch {
        // Silently default to 'free'
      }
    })();
    return () => { cancelled = true; };
  }, [isLoaded, me]);

  const [status, setStatus] = useState<
    'loading' | 'none' | 'pending-incoming' | 'pending-outgoing' | 'connected' | 'blocked' | 'self'
  >('loading');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!me) {
      setStatus('none');
      return;
    }
    if (me === otherUserId) {
      setStatus('self');
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, me, otherUserId]);

  async function load() {
    try {
      const res = await fetch('/api/connections');
      if (!res.ok) {
        setStatus('none');
        return;
      }
      const { connections } = await res.json();
      const match = (connections || []).find((c: any) => {
        const otherId = c.user_low === me ? c.user_high : c.user_low;
        return otherId === otherUserId;
      });
      if (!match) {
        setStatus('none');
        setConnectionId(null);
        return;
      }
      setConnectionId(match.id);
      if (match.status === 'blocked') setStatus('blocked');
      else if (match.status === 'accepted') setStatus('connected');
      else if (match.status === 'pending') {
        if (match.initiated_by === me) setStatus('pending-outgoing');
        else setStatus('pending-incoming');
      } else setStatus('none');
    } catch {
      setStatus('none');
    }
  }

  async function send() {
    if (!me) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: otherUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send request.');
        setBusy(false);
        return;
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'Network error.');
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    if (!connectionId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/connections/${connectionId}/accept`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed.');
        setBusy(false);
        return;
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'Network error.');
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    if (!connectionId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/connections/${connectionId}/decline`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed.');
        setBusy(false);
        return;
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'Network error.');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'loading' || !isLoaded) {
    return <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: compact ? 12 : 14 }}>…</div>;
  }

  if (status === 'self') {
    return null; // no button on your own profile
  }

  if (!me) {
    // Not signed in — show sign-in CTA.
    return (
      <a
        href={`/login?redirect_url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}
        style={{
          display: 'inline-block',
          background: '#041E42',
          color: '#fff',
          border: '2px solid #C8102E',
          padding: compact ? '0.4rem 0.8rem' : '0.6rem 1.2rem',
          borderRadius: 6,
          fontSize: compact ? 12 : 14,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Sign in to connect
      </a>
    );
  }

  // Signed in but not Verified+ — show upgrade CTA.
  const tierRank: Record<string, number> = { free: 0, starter: 1, pro: 2, premium: 3, enterprise: 4 };
  if ((tierRank[myTier] ?? 0) < 2) {
    return (
      <a
        href="/pricing"
        style={{
          display: 'inline-block',
          background: 'rgba(200,16,46,0.1)',
          color: '#FFB81C',
          border: '1px solid rgba(255,184,28,0.4)',
          padding: compact ? '0.4rem 0.8rem' : '0.6rem 1.2rem',
          borderRadius: 6,
          fontSize: compact ? 12 : 14,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Verified required to connect
      </a>
    );
  }

  if (status === 'connected') {
    return (
      <a
        href={`/dashboard/messages?with=${otherUserId}`}
        style={{
          display: 'inline-block',
          background: 'rgba(20,184,166,0.15)',
          color: '#14B8A6',
          border: '1px solid rgba(20,184,166,0.4)',
          padding: compact ? '0.4rem 0.8rem' : '0.6rem 1.2rem',
          borderRadius: 6,
          fontSize: compact ? 12 : 14,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        ✓ Connected — Message
      </a>
    );
  }

  if (status === 'pending-outgoing') {
    return (
      <button
        disabled
        style={{
          background: 'rgba(255,255,255,0.05)',
          color: 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: compact ? '0.4rem 0.8rem' : '0.6rem 1.2rem',
          borderRadius: 6,
          fontSize: compact ? 12 : 14,
          fontWeight: 600,
          cursor: 'default',
        }}
      >
        Request sent
      </button>
    );
  }

  if (status === 'pending-incoming') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={accept}
          disabled={busy}
          style={{
            background: '#14B8A6',
            color: '#fff',
            border: 'none',
            padding: compact ? '0.4rem 0.8rem' : '0.6rem 1.2rem',
            borderRadius: 6,
            fontSize: compact ? 12 : 14,
            fontWeight: 600,
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          Accept
        </button>
        <button
          onClick={decline}
          disabled={busy}
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: compact ? '0.4rem 0.8rem' : '0.6rem 1.2rem',
            borderRadius: 6,
            fontSize: compact ? 12 : 14,
            fontWeight: 600,
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          Decline
        </button>
        {error && <span style={{ color: '#C8102E', fontSize: 12 }}>{error}</span>}
      </div>
    );
  }

  if (status === 'blocked') {
    return null;
  }

  // status === 'none'
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        onClick={send}
        disabled={busy}
        style={{
          background: '#C8102E',
          color: '#fff',
          border: 'none',
          padding: compact ? '0.4rem 0.8rem' : '0.6rem 1.2rem',
          borderRadius: 6,
          fontSize: compact ? 12 : 14,
          fontWeight: 600,
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? 'Sending…' : `Connect with ${otherDisplayName}`}
      </button>
      {error && <span style={{ color: '#C8102E', fontSize: 12 }}>{error}</span>}
    </div>
  );
}
