'use client';

/**
 * PlayerDocumentList — Phase 1b-1 (Player Documents)
 * Approved by Arnel 2026-07-06 07:33 CDT (Telegram msg #32742).
 *
 * Client component. Renders documents for a single player. Two render
 * variants:
 *
 *   1. 'all'   — active + expired + archived (with archive hidden by default)
 *   2. 'active' — only status='active' and computed-on-read status='expired'
 *
 * Per Arnel Q4: hide archived files from the main view; show an "X archived"
 * footer pill that opens the archived list on click. This is the consumption
 * UX. Archive action is exposed per-row via a small menu.
 *
 * Signed URLs: each row has a "View" button that calls GET /api/player-documents/[id]
 * to mint a 60-second signed URL, then opens it in a new tab. View + download
 * are both audited server-side.
 *
 * Archive action: PATCH /api/player-documents/[id]. The server is idempotent
 * (returns the same response if already archived). We locally mark the row
 * as archived immediately so the list re-renders without a refresh, then
 * call onChange() so the parent can refresh server-side counts.
 *
 * No DELETE in v1 (per destructive action protocol). Archive is the only
 * removal semantic.
 */

import { useEffect, useState } from 'react';

const CATEGORY_LABEL: Record<string, string> = {
  birth_certificate: 'Birth Certificate',
  waiver: 'Waiver',
  medical_form: 'Medical Form',
  vaccination_record: 'Vaccination Record',
  proof_of_residence: 'Proof of Residence',
  photo_id: 'Photo ID',
  other: 'Other',
};

const STATUS_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  active: {
    bg: 'rgba(20,184,166,0.12)',
    fg: '#14B8A6',
    border: 'rgba(20,184,166,0.4)',
  },
  expired: {
    bg: 'rgba(255,184,28,0.12)',
    fg: '#FFB81C',
    border: 'rgba(255,184,28,0.4)',
  },
  archived: {
    bg: 'rgba(255,255,255,0.06)',
    fg: '#888',
    border: 'rgba(255,255,255,0.15)',
  },
};

const MIME_ICON: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/heic': '🖼️',
  'image/webp': '🖼️',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export interface PlayerDocument {
  id: string;
  player_id: string;
  category: string;
  title: string;
  description: string | null;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  expires_at: string | null;
  status: 'active' | 'expired' | 'archived';
  created_at: string;
  updated_at: string;
}

interface PlayerDocumentListProps {
  playerId: string;
  documents: PlayerDocument[];
  variant?: 'all' | 'active';
  /** Called after a successful archive so the parent can re-fetch counts. */
  onChange?: () => void;
  /** Optional: open the upload UI (controlled by parent when list and
   *  upload share a card). */
  onRequestUpload?: () => void;
}

export default function PlayerDocumentList({
  playerId: _playerId,
  documents,
  variant = 'all',
  onChange,
  onRequestUpload,
}: PlayerDocumentListProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optimisticArchive, setOptimisticArchive] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);

  // Reset optimistic archive when documents prop changes (parent refresh).
  useEffect(() => {
    setOptimisticArchive(new Set());
  }, [documents]);

  const augmented: PlayerDocument[] = documents.map((d) =>
    optimisticArchive.has(d.id) ? { ...d, status: 'archived' } : d
  );

  const archived = augmented.filter((d) => d.status === 'archived');
  const active = augmented.filter((d) => d.status === 'active' || d.status === 'expired');
  const visible = variant === 'active' ? active : showArchived ? augmented : active;

  async function handleView(doc: PlayerDocument) {
    setError(null);
    setBusy(doc.id);
    try {
      const res = await fetch(`/api/player-documents/${doc.id}`, { method: 'GET' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `View failed (${res.status})`);
      }
      const { url } = (await res.json()) as { url: string };
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleArchive(doc: PlayerDocument) {
    if (!confirm(`Archive "${doc.title}"?\n\nArchived documents are hidden from the list but kept on file (v1 has no permanent delete). You can re-upload a replacement at any time.`)) {
      return;
    }
    setError(null);
    setBusy(doc.id);
    // Optimistic update first.
    setOptimisticArchive((prev) => {
      const next = new Set(prev);
      next.add(doc.id);
      return next;
    });
    try {
      const res = await fetch(`/api/player-documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        // Roll back optimistic update on failure.
        setOptimisticArchive((prev) => {
          const next = new Set(prev);
          next.delete(doc.id);
          return next;
        });
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Archive failed (${res.status})`);
      }
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div data-testid="player-document-list">
      {error ? (
        <div
          role="alert"
          style={{
            padding: '0.65rem 0.85rem',
            background: 'rgba(200,16,46,0.12)',
            border: '1px solid rgba(200,16,46,0.4)',
            borderRadius: 8,
            color: '#FF6B7A',
            fontSize: '0.85rem',
            marginBottom: '0.75rem',
          }}
        >
          {error}
        </div>
      ) : null}

      {visible.length === 0 && archived.length === 0 ? (
        <div
          data-testid="player-document-empty"
          style={{
            padding: '1.25rem 1rem',
            background: '#0a0a0a',
            border: '1px dashed rgba(255,255,255,0.15)',
            borderRadius: 10,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: 6 }} aria-hidden>
            📄
          </div>
          <p
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '0.95rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0 0 0.25rem',
            }}
          >
            NO DOCUMENTS YET
          </p>
          <p
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.85rem',
              margin: '0 0 0.75rem',
              maxWidth: 360,
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.5,
            }}
          >
            Upload a birth certificate, waiver, or medical form to get your child&rsquo;s Hockey Passport started.
          </p>
          {onRequestUpload ? (
            <button
              type="button"
              onClick={onRequestUpload}
              style={{
                display: 'inline-block',
                padding: '0.55rem 1rem',
                background: '#14B8A6',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: 6,
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Upload first document
            </button>
          ) : null}
        </div>
      ) : visible.length === 0 && archived.length > 0 ? (
        <div
          data-testid="player-document-all-archived"
          style={{
            padding: '1rem',
            background: '#0a0a0a',
            border: '1px dashed rgba(255,255,255,0.15)',
            borderRadius: 10,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.55)',
            fontSize: '0.85rem',
          }}
        >
          All documents for this player are archived. Click &ldquo;Show archived&rdquo; below to view them.
        </div>
      ) : null}

      {visible.length > 0 ? (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {visible.map((doc) => {
            const colors = STATUS_COLORS[doc.status] ?? STATUS_COLORS.active;
            return (
              <li
                key={doc.id}
                data-testid="player-document-row"
                data-status={doc.status}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '0.7rem 0.85rem',
                  background: '#0a0a0a',
                  border: '1px solid #141414',
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: '1.1rem' }} aria-hidden>
                  {MIME_ICON[doc.mime_type] ?? '📄'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: '#fff',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={doc.title}
                  >
                    {doc.title}
                  </div>
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.45)',
                      fontSize: '0.72rem',
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginTop: 2,
                    }}
                  >
                    <span>{CATEGORY_LABEL[doc.category] ?? doc.category}</span>
                    <span aria-hidden>·</span>
                    <span>{formatFileSize(doc.file_size_bytes)}</span>
                    <span aria-hidden>·</span>
                    <span>added {formatDate(doc.created_at)}</span>
                    {doc.expires_at ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>
                          {doc.status === 'expired' ? 'expired' : 'expires'}{' '}
                          {formatDate(doc.expires_at)}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '0.18rem 0.45rem',
                    borderRadius: 999,
                    background: colors.bg,
                    color: colors.fg,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {doc.status}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => handleView(doc)}
                    disabled={busy === doc.id || doc.status === 'archived'}
                    title="View / download (signed URL, 60s)"
                    style={{
                      padding: '0.4rem 0.65rem',
                      background: '#141414',
                      border: '1px solid #2a2a2a',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: busy === doc.id || doc.status === 'archived' ? 'not-allowed' : 'pointer',
                      opacity: busy === doc.id || doc.status === 'archived' ? 0.5 : 1,
                    }}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(doc)}
                    disabled={busy === doc.id || doc.status === 'archived'}
                    title="Archive this document (v1 has no permanent delete)"
                    style={{
                      padding: '0.4rem 0.65rem',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 6,
                      color: 'rgba(255,255,255,0.65)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: busy === doc.id || doc.status === 'archived' ? 'not-allowed' : 'pointer',
                      opacity: busy === doc.id || doc.status === 'archived' ? 0.5 : 1,
                    }}
                  >
                    Archive
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {archived.length > 0 ? (
        <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            data-testid="player-document-toggle-archived"
            style={{
              padding: '0.4rem 0.8rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 999,
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
          </button>
        </div>
      ) : null}
    </div>
  );
}
