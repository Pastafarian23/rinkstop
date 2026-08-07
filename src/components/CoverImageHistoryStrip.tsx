'use client';

/**
 * CoverImageHistoryStrip — public list of previous cover images on
 * /profile/[slug]. Mirrors the profile_photo_history UX and the "Facebook
 * photo history strip" pattern.
 *
 * Visibility:
 *   - The strip is rendered for EVERY visitor (public). The user can see
 *     what covers a profile has used over time.
 *   - The "Delete" button on each entry only renders for the owner.
 *
 * Behavior:
 *   - Hover on an entry: shows a delete button (owner only).
 *   - Click delete: confirms, then calls DELETE with { history_id }.
 *   - The current row is shown with a "(current)" badge and is NOT
 *     deletable from the strip (use the editor's "Remove cover" button).
 *   - Removed entries are filtered out at the query layer (parent passes
 *     only rows where removed_at IS NULL).
 */

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

export interface CoverHistoryEntry {
  id: string;
  url: string | null;
  position: string; // 'center' | 'top' | 'bottom'
  set_at: string;
  replaced_at: string | null;
  removed_at: string | null;
  source: string; // 'manual' | 'admin_reset'
}

interface CoverImageHistoryStripProps {
  entries: CoverHistoryEntry[];
  /** Whether the viewer is the owner. Controls the delete button. */
  isOwner: boolean;
  /** Callback after a successful delete so the parent can refresh. */
  onDeleted?: (historyId: string) => void;
}

export default function CoverImageHistoryStrip({
  entries,
  isOwner,
  onDeleted,
}: CoverImageHistoryStripProps) {
  const { isLoaded, isSignedIn } = useUser();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (entries.length === 0) return null;

  async function deleteEntry(id: string) {
    if (!confirm('Delete this cover from your history? This will also remove the image from storage.')) {
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch('/api/profile/cover-image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history_id: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Delete failed.');
        setBusyId(null);
        return;
      }
      onDeleted?.(id);
      setBusyId(null);
    } catch (e: any) {
      setError(e?.message || 'Network error.');
      setBusyId(null);
    }
  }

  // Suppress unused-var lint when isLoaded/isSignedIn aren't used in render
  void isLoaded;
  void isSignedIn;

  return (
    <section
      aria-label="Cover image history"
      style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Cover history
        </h3>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          {entries.length} {entries.length === 1 ? 'cover' : 'covers'}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 8,
        }}
      >
        {entries.map((entry) => {
          const isCurrent = entry.replaced_at === null && entry.removed_at === null;
          const isRemoved = entry.removed_at !== null;
          if (isRemoved) return null;

          return (
            <div
              key={entry.id}
              style={{
                position: 'relative',
                aspectRatio: '5 / 2',
                borderRadius: 6,
                overflow: 'hidden',
                border: isCurrent
                  ? '2px solid var(--red)'
                  : '1px solid rgba(255,255,255,0.1)',
                background: '#000',
              }}
            >
              {entry.url ? (
                <img
                  src={entry.url}
                  alt={`Cover from ${new Date(entry.set_at).toLocaleDateString()}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: entry.position,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'rgba(255,255,255,0.05)',
                  }}
                />
              )}

              {isCurrent && (
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    background: 'var(--red)',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  Current
                </div>
              )}

              {isOwner && !isCurrent && (
                <button
                  onClick={() => deleteEntry(entry.id)}
                  disabled={busyId === entry.id}
                  aria-label="Delete this cover from history"
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: busyId === entry.id ? 'default' : 'pointer',
                    opacity: busyId === entry.id ? 0.6 : 1,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {busyId === entry.id ? '…' : 'Delete'}
                </button>
              )}

              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
                  padding: '12px 6px 4px',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.7)',
                  textAlign: 'center',
                }}
              >
                {new Date(entry.set_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                })}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            marginTop: 8,
            background: 'rgba(200,16,46,0.15)',
            border: '1px solid rgba(200,16,46,0.4)',
            color: '#FFB81C',
            padding: '0.5rem 0.7rem',
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
    </section>
  );
}
