'use client';

import { useEffect, useState } from 'react';
import { buildSlug, SlugValidationError } from '@/lib/slug-builder';

interface TeamRef {
  id: string;
  name?: string | null;
  slug?: string | null;
}

interface Props {
  /** Current effective home team. May be a pipeline ref (full slug) or null if not set. */
  homeTeam: TeamRef | null;
  /** Current effective away team. */
  awayTeam: TeamRef | null;
  /** The game date in any parseable format. */
  gameDate: string | null | undefined;
  /** The post's own ID — excluded from collision check. */
  currentPostId: string;
}

/**
 * Live preview of the clean post slug that will be generated
 * when the post is saved with the current team + date state.
 *
 * Shows a red warning if the projected slug collides with another
 * post (so Arnel can decide how to handle it — rename, archive,
 * leave the old slug, etc.).
 */
export default function SlugPreviewBanner({ homeTeam, awayTeam, gameDate, currentPostId }: Props) {
  const [collision, setCollision] = useState<{ id: string; slug: string } | null>(null);
  const [collisionLoading, setCollisionLoading] = useState(false);

  // Compute the slug every time the inputs change.
  let computed: { slug: string; source: string; warnings: string[] } | null = null;
  let validationError: string | null = null;

  try {
    if (homeTeam || awayTeam || gameDate) {
      computed = buildSlug({
        homeTeamSlug: homeTeam?.slug,
        homeTeamName: homeTeam?.name,
        awayTeamSlug: awayTeam?.slug,
        awayTeamName: awayTeam?.name,
        gameDate,
      });
    }
  } catch (e) {
    if (e instanceof SlugValidationError) {
      validationError = e.message;
    } else {
      validationError = 'unexpected error';
    }
  }

  // Check for slug collision when we have a valid slug to check.
  useEffect(() => {
    if (!computed?.slug) {
      setCollision(null);
      return;
    }
    let cancelled = false;
    setCollisionLoading(true);
    fetch(`/api/admin/articles/slug-exists?slug=${encodeURIComponent(computed.slug)}&id=${encodeURIComponent(currentPostId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return;
        if (data?.exists) {
          setCollision({ id: data.existing.id, slug: data.existing.slug });
        } else {
          setCollision(null);
        }
      })
      .catch(() => {
        if (!cancelled) setCollision(null);
      })
      .finally(() => {
        if (!cancelled) setCollisionLoading(false);
      });
    return () => { cancelled = true; };
  }, [computed?.slug, currentPostId]);

  // Render states
  if (!homeTeam && !awayTeam) {
    return (
      <div
        className="admin-card p-3"
        style={{
          background: 'rgba(96,165,250,0.05)',
          borderColor: 'rgba(96,165,250,0.3)',
          marginBottom: '1rem',
        }}
      >
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
          🔍 New slug preview
        </div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
          Pick home and away teams to see the projected slug.
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div
        className="admin-card p-3"
        style={{
          background: 'rgba(250,204,21,0.05)',
          borderColor: 'rgba(250,204,21,0.3)',
          marginBottom: '1rem',
        }}
      >
        <div style={{ fontSize: '0.75rem', color: '#FACC15', marginBottom: 4 }}>
          🔍 New slug preview — incomplete
        </div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
          {validationError}
        </div>
        {!gameDate && (
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            Tip: set <code>game_date</code> in the post to generate a slug.
          </div>
        )}
      </div>
    );
  }

  if (!computed) return null;

  return (
    <div
      className="admin-card p-3"
      style={{
        background: collision ? 'rgba(248,113,113,0.05)' : 'rgba(20,184,166,0.05)',
        borderColor: collision ? 'rgba(248,113,113,0.3)' : 'rgba(20,184,166,0.3)',
        marginBottom: '1rem',
      }}
    >
      <div style={{ fontSize: '0.75rem', color: collision ? '#F87171' : '#14B8A6', marginBottom: 4 }}>
        🔍 New slug will be: {collision && '⚠️ COLLISION'}
      </div>
      <code
        style={{
          fontSize: '0.95rem',
          color: 'rgba(255,255,255,0.95)',
          fontWeight: 500,
          wordBreak: 'break-all',
        }}
      >
        {computed.slug}
      </code>
      {computed.source === 'raw-name' && (
        <div style={{ fontSize: '0.7rem', color: 'rgba(250,204,21,0.8)', marginTop: 4 }}>
          ⚠️ Using slugified team names (no teams-table slug found). Save will log a warning.
        </div>
      )}
      {collision && (
        <div style={{ fontSize: '0.75rem', color: '#F87171', marginTop: 6 }}>
          This slug is already used on another post. Save anyway, then handle the collision (rename or archive).
          {collisionLoading ? ' (re-checking…)' : ''}
        </div>
      )}
      {computed.warnings.length > 0 && (
        <ul style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: 4, paddingLeft: 18 }}>
          {computed.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}
    </div>
  );
}
