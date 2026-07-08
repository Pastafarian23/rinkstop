'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Claim {
  id: string;
  user_id: string;
  claim_type: string;
  entity_id: string;
  entity_name: string;
  reason: string;
  proof?: string | null;
  status: string;
  created_at: string;
  reviewed_at?: string | null;
  reviewer_note?: string | null;
}

interface Props {
  pending: Claim[];
  recent: Claim[];
  submitterLabels: Record<string, string>;
  entityLabels: Record<string, string>;
}

function statusBadge(status: string) {
  const styles: Record<string, React.CSSProperties> = {
    pending: { background: 'rgba(255,184,28,0.12)', color: '#FFB81C', border: '1px solid rgba(255,184,28,0.4)' },
    approved: { background: 'rgba(20,184,166,0.12)', color: '#14B8A6', border: '1px solid rgba(20,184,166,0.4)' },
    rejected: { background: 'rgba(200,16,46,0.12)', color: '#FF6B7A', border: '1px solid rgba(200,16,46,0.4)' },
  };
  return (
    <span
      style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        padding: '0.18rem 0.5rem',
        borderRadius: 999,
        ...(styles[status] || styles.pending),
      }}
    >
      {status}
    </span>
  );
}

export default function ClaimsQueue({ pending, recent, submitterLabels, entityLabels }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingNotes, setPendingNotes] = useState<Record<string, string>>({});

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setBusyId(id);
    setError(null);
    setWarning(null);
    try {
      const r = await fetch(`/api/admin/claims/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: pendingNotes[id] || undefined }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || `${action} failed.`);
        setBusyId(null);
        return;
      }
      if (data.warning) setWarning(data.warning);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {error ? (
        <div role="alert" style={{ padding: '0.6rem 0.85rem', background: 'rgba(200,16,46,0.12)', border: '1px solid rgba(200,16,46,0.4)', borderRadius: 8, color: '#FF6B7A', fontSize: '0.85rem' }}>
          {error}
        </div>
      ) : null}
      {warning ? (
        <div role="status" style={{ padding: '0.6rem 0.85rem', background: 'rgba(255,184,28,0.1)', border: '1px solid rgba(255,184,28,0.4)', borderRadius: 8, color: '#FFB81C', fontSize: '0.85rem' }}>
          {warning}
        </div>
      ) : null}

      <section
        data-testid="claims-pending"
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: 0,
          }}>
            PENDING ({pending.length})
          </h2>
        </div>

        {pending.length === 0 ? (
          <div style={{ padding: '1rem', background: '#0a0a0a', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 10, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            Queue empty. Nothing to review right now.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pending.map((c) => {
              const entityLabel = entityLabels[`${c.claim_type}:${c.entity_id}`] || c.entity_name || c.entity_id.slice(0, 12);
              const submitterLabel = submitterLabels[c.user_id] || c.user_id.slice(0, 12);
              return (
                <div
                  key={c.id}
                  data-testid={`claim-pending-${c.id}`}
                  style={{
                    background: '#0a0a0a',
                    border: '1px solid #141414',
                    borderRadius: 10,
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '0.6rem' }}>
                    <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700 }}>
                      {c.claim_type}: <span style={{ color: 'rgba(255,255,255,0.65)' }}>{entityLabel}</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                      by {submitterLabel} · {new Date(c.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '0.4rem' }}>
                    <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Reason:</strong> {c.reason}
                  </div>

                  {c.proof ? (
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '0.6rem' }}>
                      <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Proof:</strong> {c.proof}
                    </div>
                  ) : null}

                  <textarea
                    value={pendingNotes[c.id] || ''}
                    onChange={(e) => setPendingNotes((m) => ({ ...m, [c.id]: e.target.value }))}
                    placeholder="Optional reviewer note (visible to submitter)"
                    rows={2}
                    maxLength={500}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.6rem',
                      background: '#0f0f0f',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontFamily: 'inherit',
                      marginBottom: '0.6rem',
                      resize: 'vertical',
                    }}
                  />

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleAction(c.id, 'approve')}
                      disabled={busyId === c.id}
                      style={{
                        padding: '0.4rem 0.9rem',
                        background: busyId === c.id ? 'rgba(20,184,166,0.3)' : '#14B8A6',
                        color: '#0a0a0a',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: busyId === c.id ? 'wait' : 'pointer',
                      }}
                    >
                      {busyId === c.id ? '…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(c.id, 'reject')}
                      disabled={busyId === c.id}
                      style={{
                        padding: '0.4rem 0.9rem',
                        background: 'transparent',
                        color: '#FF6B7A',
                        border: '1px solid rgba(200,16,46,0.5)',
                        borderRadius: 6,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: busyId === c.id ? 'wait' : 'pointer',
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: 0,
          }}>
            HISTORY
          </h2>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            style={{
              padding: '0.35rem 0.75rem',
              background: 'transparent',
              color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            {showHistory ? 'Hide' : 'Show'} ({recent.length})
          </button>
        </div>

        {showHistory && recent.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recent.map((c) => {
              const entityLabel = entityLabels[`${c.claim_type}:${c.entity_id}`] || c.entity_name || c.entity_id.slice(0, 12);
              const submitterLabel = submitterLabels[c.user_id] || c.user_id.slice(0, 12);
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0.55rem 0.85rem',
                    background: '#0a0a0a',
                    border: '1px solid #141414',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                      {c.claim_type}: {entityLabel}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>
                      by {submitterLabel} · reviewed {c.reviewed_at ? new Date(c.reviewed_at).toLocaleString() : '—'}
                      {c.reviewer_note ? ` · "${c.reviewer_note}"` : ''}
                    </div>
                  </div>
                  {statusBadge(c.status)}
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </>
  );
}