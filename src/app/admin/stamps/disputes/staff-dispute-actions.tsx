'use client';

/**
 * Client wrapper for the staff dispute queue. Same shape as the operator
 * queue's DisputeActions (PR2) but adds:
 *   - Target type badge (rink/venue/event) per row
 *   - Target name + city link to the public directory page
 *
 * Both endpoint (POST /api/passport/stamp/[stampId]/adjudicate) and
 * adjudicateStamp() service method are isStaff-aware — they work
 * identically for the staff queue and the operator queue. UI is the
 * only thing that's different.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface StaffDisputeRow {
  stampId: string;
  targetType: 'rink' | 'venue' | 'event';
  targetId: string;
  targetDisplay: string;
  targetLocation: string | null;
  stamperDisplayName: string | null;
  stamperRole: string;
  stampedAt: string;
  disputeReason: string | null;
}

interface Props {
  disputes: StaffDisputeRow[];
}

const TYPE_LABEL: Record<'rink' | 'venue' | 'event', string> = {
  rink: 'Rink',
  venue: 'Venue',
  event: 'Event',
};

const TYPE_COLOR: Record<'rink' | 'venue' | 'event', string> = {
  rink: '#0ea5e9',
  venue: '#a855f7',
  event: '#f97316',
};

export function StaffDisputeActions({ disputes }: Props) {
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
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#991b1b',
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
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '1.25rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              opacity: isBusy ? 0.6 : 1,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 4,
                    background: TYPE_COLOR[d.targetType],
                    color: '#fff',
                  }}>
                    {TYPE_LABEL[d.targetType]}
                  </span>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>
                    {d.targetDisplay}
                  </span>
                  {d.targetLocation && (
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      · {d.targetLocation}
                    </span>
                  )}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                  {d.stamperDisplayName ?? 'Anonymous'} ({d.stamperRole}) · stamped{' '}
                  {new Date(d.stampedAt).toLocaleString()}
                </div>
              </div>
              {verdict && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '0.25rem 0.6rem',
                    borderRadius: 999,
                    background: verifiedUphold ? '#fee2e2' : '#dcfce7',
                    color: verifiedUphold ? '#991b1b' : '#166534',
                  }}
                >
                  {verifiedUphold ? 'Rejected' : 'Confirmed'}
                </div>
              )}
            </div>

            {d.disputeReason && (
              <div
                style={{
                  background: '#f8fafc',
                  padding: '0.75rem',
                  borderRadius: 6,
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                  borderLeft: '3px solid #cbd5e1',
                }}
              >
                Holder said: &ldquo;{d.disputeReason}&rdquo;
              </div>
            )}

            <textarea
              placeholder="Reason (optional, max 1000 chars)"
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
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                color: '#0f172a',
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
                  background: verifiedOverturn ? '#15803d' : '#16a34a',
                  color: '#fff',
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
                  background: verifiedUphold ? '#991b1b' : '#dc2626',
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
    </div>
  );
}
