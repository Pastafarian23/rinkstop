'use client';

/**
 * Client wrapper for the dispute queue table rows. Each row has two
 * action buttons (Uphold / Overturn) that POST to
 * /api/passport/stamp/[stampId]/adjudicate, plus an optional reason
 * textarea. After a successful adjudication the row disappears from
 * the queue (parent re-renders by revalidating via router.refresh).
 *
 * Per WS3.5 PR2 spec:
 *   - Uphold turns the stamp to 'rejected' (never counts). Stamper gets a
 *     `dispute_upheld` inbox notification.
 *   - Overturn restores the stamp to 'confirmed' (counts normally).
 *     Stamper gets a `dispute_overturned` inbox notification.
 *   - Reason is optional free-text, max 1000 chars, stored on
 *     stamps.rejected_reason (uphold only — overturn ignores reason).
 *
 * Anti-recovery: while a request is in flight, both buttons for that
 * row are disabled. Concurrent clicks for the same stamp return 200
 * idempotent (server-side).
 */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DisputeRow {
  stampId: string;
  stamperDisplayName: string | null;
  stamperRole: string;
  stampedAt: string;
  disputeReason: string | null;
}

interface Props {
  rinkId: string;
  disputes: DisputeRow[];
}

export function DisputeActions({ rinkId, disputes }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyStampId, setBusyStampId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reasonByStamp, setReasonByStamp] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<Record<string, 'uphold' | 'overturn'>>({});

  const handleAction = async (stampId: string, action: 'uphold' | 'overturn') => {
    setError(null);
    setBusyStampId(stampId);
    try {
      const res = await fetch(
        `/api/passport/stamp/${encodeURIComponent(stampId)}/adjudicate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            reason: reasonByStamp[stampId]?.slice(0, 1000) || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || 'Adjudication failed');
        return;
      }
      setCompleted((prev) => ({ ...prev, [stampId]: action }));
      // Soft refresh — server component re-fetches the disputed-stamp list
      // and removes the just-adjudicated row.
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBusyStampId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && (
        <div style={{
          background: 'rgba(200,16,46,0.1)',
          border: '1px solid rgba(200,16,46,0.4)',
          color: '#FF6B7A',
          padding: '0.75rem 1rem',
          borderRadius: 8,
          fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      {disputes.map((d) => {
        const isBusy = busyStampId === d.stampId || pending;
        const verdict = completed[d.stampId];
        const verifiedUphold = verdict === 'uphold';
        const verifiedOverturn = verdict === 'overturn';
        return (
          <div
            key={d.stampId}
            style={{
              background: '#0f0f0f',
              border: '1px solid #1e1e1e',
              borderRadius: 12,
              padding: '1.25rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              opacity: isBusy ? 0.6 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 600 }}>
                  {d.stamperDisplayName ?? 'Anonymous visitor'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                  {d.stamperRole} · stamped {new Date(d.stampedAt).toLocaleString()}
                </div>
              </div>
              {verdict && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '0.25rem 0.6rem',
                    borderRadius: 999,
                    background: verifiedUphold ? 'rgba(200,16,46,0.15)' : 'rgba(20,184,166,0.15)',
                    color: verifiedUphold ? '#FF6B7A' : '#14B8A6',
                    border: verifiedUphold
                      ? '1px solid rgba(200,16,46,0.4)'
                      : '1px solid rgba(20,184,166,0.4)',
                  }}
                >
                  {verifiedUphold ? 'Rejected' : 'Confirmed'}
                </div>
              )}
            </div>

            {d.disputeReason && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  padding: '0.75rem',
                  borderRadius: 6,
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                }}
              >
                Holder said: &ldquo;{d.disputeReason}&rdquo;
              </div>
            )}

            <textarea
              placeholder="Reason (optional, max 1000 chars, visible internally only in v1)"
              value={reasonByStamp[d.stampId] ?? ''}
              onChange={(e) =>
                setReasonByStamp((prev) => ({ ...prev, [d.stampId]: e.target.value }))
              }
              disabled={isBusy || Boolean(verdict)}
              maxLength={1000}
              style={{
                width: '100%',
                minHeight: 60,
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #1e1e1e',
                borderRadius: 6,
                color: '#fff',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => handleAction(d.stampId, 'overturn')}
                disabled={isBusy || Boolean(verdict)}
                style={{
                  padding: '0.5rem 1rem',
                  background: verifiedOverturn ? 'rgba(20,184,166,0.3)' : '#14B8A6',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: isBusy || verdict ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Overturn dispute
              </button>
              <button
                type="button"
                onClick={() => handleAction(d.stampId, 'uphold')}
                disabled={isBusy || Boolean(verdict)}
                style={{
                  padding: '0.5rem 1rem',
                  background: verifiedUphold ? 'rgba(200,16,46,0.3)' : '#C8102E',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: isBusy || verdict ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Uphold dispute
              </button>
            </div>
          </div>
        );
      })}

      <Link
        href={`/dashboard/manage/rink/${rinkId}`}
        style={{
          fontSize: '0.85rem',
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
          marginTop: '0.5rem',
          textDecoration: 'none',
        }}
      >
        ← Back to {`rink`}
      </Link>
    </div>
  );
}
