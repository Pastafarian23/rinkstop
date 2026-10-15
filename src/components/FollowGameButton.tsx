'use client';
/**
 * src/components/FollowGameButton.tsx
 *
 * 2026-10-15: small client leaf for the game detail page.  Toggles
 * "follow this game" using the same localStorage key
 * (rs_followed_games) as the rest of the app would use for game
 * follow state.  No server auth, no DB writes — the same pattern
 * as the team-page FollowButton.
 *
 * Renders two small buttons (one per team) so users can follow
 * either or both teams from the game page.  Click toggles local
 * state and dispatches a CustomEvent so any other component on the
 * same page (or the home page when navigated to) can react.
 *
 * The original team-page FollowButton took `{ teamSlug, teamName }`.
 * This one takes `{ awayTeam, homeTeam }` so the game page can
 * surface follow for both teams in a single leaf.
 */

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'rs_followed_games';

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
  try {
    window.dispatchEvent(new CustomEvent('rs_followed_changed', { detail: list }));
  } catch {}
}

interface TeamRef {
  slug: string;
  name: string;
}

function FollowOne({ team }: { team: TeamRef }) {
  const [followed, setFollowed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFollowed(readFollowed().includes(team.slug));
    setHydrated(true);
  }, [team.slug]);

  function toggle() {
    const list = readFollowed();
    const next = list.includes(team.slug) ? list.filter(s => s !== team.slug) : [...list, team.slug];
    writeFollowed(next);
    setFollowed(!followed);
  }

  if (!hydrated) {
    // Render a placeholder of the same height to avoid layout shift.
    return <span style={{ display: 'inline-block', minWidth: 90, minHeight: 28 }} />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={followed}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0.8rem',
        borderRadius: '8px',
        background: followed ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
        border: followed ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.12)',
        color: followed ? '#34d399' : 'rgba(255,255,255,0.85)',
        fontSize: '0.8125rem',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {followed ? '✓ Following' : `+ Follow ${team.name}`}
    </button>
  );
}

export default function FollowGameButton({ awayTeam, homeTeam }: { awayTeam: TeamRef; homeTeam: TeamRef }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
      <FollowOne team={awayTeam} />
      <FollowOne team={homeTeam} />
    </div>
  );
}
