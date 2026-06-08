'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

// Renders an "I'm this player's parent" button on youth hockey player profile pages.
// Only shown when the player is under 18 (has birth_date and is less than 18 years old).
// On click, submits a managed_profiles row claiming the player as the user's kid.
// (The parent-page handles the youth check on the API; the button renders for everyone
//  but the API will reject if the player is 18+.)
export default function ClaimParentButton({
  playerId,
  playerName,
  birthDate,
}: {
  playerId: string;
  playerName: string;
  birthDate: string | null;
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

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hide the button if the player has no birth_date or is 18+.
  if (birthDate) {
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    if (new Date(birthDate) <= eighteenYearsAgo) {
      return null;
    }
  } else {
    // No birth_date → don't show (safer default per Arnel's decision).
    return null;
  }

  if (!isLoaded) return null;

  if (!me) {
    return (
      <a
        href={`/login?redirect_url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}
        style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.05)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.15)',
          padding: '0.5rem 1rem',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Sign in to claim as parent
      </a>
    );
  }

  // Verified+ required.
  const tierRank: Record<string, number> = { free: 0, supporter: 1, verified: 2, pro: 3 };
  if ((tierRank[myTier] ?? 0) < 2) {
    return (
      <a
        href="/founding-member"
        style={{
          display: 'inline-block',
          background: 'rgba(200,16,46,0.1)',
          color: '#FFB81C',
          border: '1px solid rgba(255,184,28,0.4)',
          padding: '0.5rem 1rem',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Verified required to claim as parent
      </a>
    );
  }

  if (done) {
    return (
      <span style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(20,184,166,0.1)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.4)', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
        ✓ Claimed — {playerName} is in your managed profiles
      </span>
    );
  }

  async function claim() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/profiles/managed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileType: 'player', profileId: playerId, relationship: 'parent' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed.');
        setBusy(false);
        return;
      }
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Network error.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        onClick={claim}
        disabled={busy}
        style={{
          background: 'transparent',
          color: '#FFB81C',
          border: '1px solid rgba(255,184,28,0.4)',
          padding: '0.5rem 1rem',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? 'Claiming…' : `I'm ${playerName.split(' ')[0]}'s parent`}
      </button>
      {error && <span style={{ color: '#C8102E', fontSize: 12 }}>{error}</span>}
    </div>
  );
}
