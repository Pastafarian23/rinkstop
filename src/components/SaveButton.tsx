'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface SaveButtonProps {
  favoriteType: 'rink' | 'team' | 'player';
  favoriteId: string;
  entityName?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outline';
}

export default function SaveButton({
  favoriteType,
  favoriteId,
  entityName,
  size = 'md',
  variant = 'filled',
}: SaveButtonProps) {
  const { isSignedIn, isLoaded } = useUser();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  // Check current state on mount
  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    fetch(`/api/favorites?type=${favoriteType}&id=${encodeURIComponent(favoriteId)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const list = d.favorites || [];
        setSaved(list.some((f: { favorite_id: string }) => f.favorite_id === favoriteId));
        setChecked(true);
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, favoriteType, favoriteId]);

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' },
    md: { padding: '0.5rem 1rem', fontSize: '0.875rem', gap: '0.5rem' },
    lg: { padding: '0.65rem 1.25rem', fontSize: '0.95rem', gap: '0.5rem' },
  };
  const iconSize: Record<string, number> = { sm: 14, md: 16, lg: 18 };

  // Unauthenticated: show sign-in CTA
  if (isLoaded && !isSignedIn) {
    return (
      <Link
        href={`/login?redirect_url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          ...sizeStyles[size],
          borderRadius: 6,
          background: variant === 'filled' ? 'rgba(200,16,46,0.12)' : 'transparent',
          border: '1px solid #C8102E',
          color: '#C8102E',
          textDecoration: 'none',
          fontWeight: 600,
          cursor: 'pointer',
        }}
        title={`Sign in to save ${entityName || 'this listing'}`}
      >
        <span style={{ fontSize: iconSize[size] }}>♡</span>
        <span>Save</span>
      </Link>
    );
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const wasSaved = saved;
    // Optimistic update
    setSaved(!wasSaved);
    try {
      const res = wasSaved
        ? await fetch(`/api/favorites?favorite_type=${favoriteType}&favorite_id=${encodeURIComponent(favoriteId)}`, { method: 'DELETE' })
        : await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ favorite_type: favoriteType, favorite_id: favoriteId }),
          });
      if (!res.ok) {
        // Roll back
        setSaved(wasSaved);
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          alert('Please sign in to save items.');
        } else {
          alert(data.error || 'Failed to update. Please try again.');
        }
      }
    } catch {
      setSaved(wasSaved);
      alert('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // Loading state — show neutral button until we know
  if (!checked) {
    return (
      <button
        type="button"
        disabled
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          ...sizeStyles[size],
          borderRadius: 6,
          background: variant === 'filled' ? 'rgba(255,255,255,0.04)' : 'transparent',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.4)',
          fontWeight: 600,
          cursor: 'wait',
        }}
      >
        <span style={{ fontSize: iconSize[size], opacity: 0.5 }}>♡</span>
        <span>Save</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      title={saved ? `Remove ${entityName || 'this listing'} from saved items` : `Save ${entityName || 'this listing'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        ...sizeStyles[size],
        borderRadius: 6,
        background: saved
          ? 'rgba(200,16,46,0.18)'
          : variant === 'filled' ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: `1px solid ${saved ? '#C8102E' : 'rgba(255,255,255,0.15)'}`,
        color: saved ? '#C8102E' : '#e2e8f0',
        fontWeight: 600,
        cursor: busy ? 'wait' : 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: iconSize[size] }}>{saved ? '♥' : '♡'}</span>
      <span>{saved ? 'Saved' : 'Save'}</span>
    </button>
  );
}
