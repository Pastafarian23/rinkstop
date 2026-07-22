'use client';

/**
 * src/app/dashboard/passport/stamp-history-list.tsx
 *
 * Client component for the WS3 PR3 stamp history view on /dashboard/passport.
 *
 * Receives the holder's stamp rows from the server component, renders them
 * with a per-row visibility toggle (Public / Private). The toggle hits
 * PATCH /api/passport/stamp/[stampId] which enforces the locked rule
 * (actor OR subject can toggle; coach can't toggle their own authored stamp
 * even though they can see it).
 *
 * UI:
 *   - Mobile-first, dark theme matching the existing dashboard
 *   - Per-row badge for target_type (Rink / Venue / Event)
 *   - Per-row badge for visibility (Public / Private) — clickable to toggle
 *   - Date stamp at right
 */

import { useState, useTransition } from 'react';
import type { StampVisibility } from '@/lib/passport';

interface StampRow {
  id: string;
  targetType: 'rink' | 'venue' | 'event';
  targetName: string;
  visibility: StampVisibility;
  status: string;
  stampedAt: string;
  isHolder: boolean;
  isSubject: boolean;
}

const TYPE_BADGE: Record<StampRow['targetType'], string> = {
  rink: '#041E42',
  venue: '#6d28d9',
  event: '#b45309',
};

export function StampHistoryList({ rows }: { rows: StampRow[] }) {
  const [items, setItems] = useState<StampRow[]>(rows);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleVisibility(row: StampRow) {
    if (row.status !== 'confirmed') return;
    const next: StampVisibility =
      row.visibility === 'public' ? 'private' : 'public';
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/passport/stamp/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? `Request failed (${res.status})`);
        return;
      }
      setItems((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, visibility: next } : r))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {error && (
        <p
          style={{
            color: '#FCA5A5',
            fontSize: 13,
            padding: '10px 16px',
            margin: 0,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
          role="alert"
        >
          {error}
        </p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((row, i) => (
          <li
            key={row.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderTop:
                i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#fff',
                background: TYPE_BADGE[row.targetType],
                borderRadius: 4,
                padding: '3px 6px',
                flexShrink: 0,
              }}
            >
              {row.targetType}
            </span>
            <span
              style={{
                flex: 1,
                color: '#fff',
                fontSize: 15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.targetName}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              {formatDate(row.stampedAt)}
            </span>
            <button
              type="button"
              onClick={() =>
                startTransition(() => {
                  void toggleVisibility(row);
                })
              }
              disabled={pending && busyId === row.id}
              title={
                row.status !== 'confirmed'
                  ? 'Cannot toggle a disputed or revoked stamp'
                  : 'Toggle visibility'
              }
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '6px 10px',
                borderRadius: 999,
                border: 'none',
                cursor:
                  row.status === 'confirmed' ? 'pointer' : 'not-allowed',
                opacity:
                  pending && busyId === row.id ? 0.6 : 1,
                background:
                  row.visibility === 'public' ? '#FFB81C' : 'rgba(255,255,255,0.15)',
                color:
                  row.visibility === 'public' ? '#041E42' : 'rgba(255,255,255,0.7)',
              }}
            >
              {row.visibility === 'public' ? 'Public' : 'Private'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
