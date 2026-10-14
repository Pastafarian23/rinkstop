'use client';
/**
 * src/components/FollowButton.tsx
 *
 * 2026-10-14 (Phase 5): 'follow a team' toggle for the public team
 * page. No login required — the follow state lives in localStorage
 * as an array of team slugs under 'rs_followed_teams'. The home page
 * reads the same key to render a 'Your teams' strip. The button
 * shows Follow / Following state and writes through to localStorage
 * immediately.
 *
 * The team list is the smallest possible: a string array of slugs.
 * No DB writes. If the user clears cookies / switches browser,
 * their list is gone — that's the deal for the no-login version.
 */
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'rs_followed_teams';

function readFollowed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeFollowed(list: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
  // Notify other components on the same page (the home 'Your teams'
  // strip) that the list changed.
  try {
    window.dispatchEvent(new CustomEvent('rs_followed_changed', { detail: list }));
  } catch {}
}

export default function FollowButton({ teamSlug, teamName }: { teamSlug: string; teamName: string }) {
  const [followed, setFollowed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setFollowed(readFollowed().includes(teamSlug));
    setHydrated(true);
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) setFollowed(detail.includes(teamSlug));
    };
    window.addEventListener('rs_followed_changed', onChange as EventListener);
    return () => window.removeEventListener('rs_followed_changed', onChange as EventListener);
  }, [teamSlug]);

  const toggle = () => {
    const list = readFollowed();
    const next = list.includes(teamSlug) ? list.filter((s) => s !== teamSlug) : [...list, teamSlug];
    writeFollowed(next);
    setFollowed(next.includes(teamSlug));
  };

  // Render a stable shell on SSR to avoid hydration mismatch.
  if (!hydrated) {
    return (
      <button
        type="button"
        disabled
        style={{
          padding: '0.5rem 0.875rem',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '8px',
          color: 'rgba(255,255,255,0.55)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          cursor: 'not-allowed',
        }}
        aria-label={`Follow ${teamName}`}
      >
        ☆ Follow
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        padding: '0.5rem 0.875rem',
        background: followed ? 'rgba(200,16,46,0.15)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${followed ? 'rgba(200,16,46,0.5)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: '8px',
        color: followed ? '#fff' : 'rgba(255,255,255,0.85)',
        fontSize: '0.8125rem',
        fontWeight: 600,
        cursor: 'pointer',
      }}
      aria-pressed={followed}
      aria-label={followed ? `Unfollow ${teamName}` : `Follow ${teamName}`}
    >
      {followed ? '★ Following' : '☆ Follow'}
    </button>
  );
}
