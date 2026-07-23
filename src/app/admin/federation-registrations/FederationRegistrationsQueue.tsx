'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminRegistrationRow {
  id: string;
  registration_number: string;
  submission_status: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_at: string | null;
  submitted_by: string | null;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  player_id: string | null;
  coach_id: string | null;
  referee_user_id: string | null;
  federation: { slug: string; name: string } | null;
}

function persona(r: AdminRegistrationRow): 'player' | 'coach' | 'referee' | 'unknown' {
  if (r.player_id) return 'player';
  if (r.coach_id) return 'coach';
  if (r.referee_user_id) return 'referee';
  return 'unknown';
}

function statusBadge(status: string) {
  const styles: Record<string, React.CSSProperties> = {
    pending:  { background: 'rgba(255,184,28,0.12)', color: '#FFB81C', border: '1px solid rgba(255,184,28,0.4)' },
    approved: { background: 'rgba(0,150,80,0.12)',   color: '#009650', border: '1px solid rgba(0,150,80,0.4)' },
    rejected: { background: 'rgba(200,16,46,0.12)',   color: '#FF6B7A', border: '1px solid rgba(200,16,46,0.4)' },
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

export default function FederationRegistrationsQueue({
  pending,
  recent,
  subjectLabels,
}: {
  pending: AdminRegistrationRow[];
  recent: AdminRegistrationRow[];
  subjectLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectForId, setRejectForId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function callApi(path: string, body: any) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json;
  }

  async function approve(id: string) {
    setError(null);
    setBusyId(id);
    try {
      await callApi(`/api/admin/federation-registrations/${id}/approve`, {});
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) {
      setError('Rejection reason is required.');
      return;
    }
    setError(null);
    setBusyId(id);
    try {
      await callApi(`/api/admin/federation-registrations/${id}/reject`, { reason: rejectReason.trim() });
      setRejectForId(null);
      setRejectReason('');
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Failed.');
    } finally {
      setBusyId(null);
    }
  }

  function rowSubjectLabel(r: AdminRegistrationRow): string {
    if (r.player_id) return subjectLabels[r.player_id] ?? `Player ${r.player_id.slice(0, 8)}`;
    if (r.coach_id) return `Coach ${r.coach_id.slice(0, 8)}`;
    if (r.referee_user_id) return `Referee ${r.referee_user_id.slice(0, 12)}`;
    return '—';
  }

  return (
    <div>
      {error && (
        <div style={{ padding: '0.75rem', background: 'rgba(200,16,46,0.18)', color: '#FF6B7A', borderRadius: 6, marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>
        Pending ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>No pending submissions.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
          {pending.map((r) => (
            <div
              key={r.id}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                padding: '0.85rem 1rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr auto',
                gap: '0.75rem',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                  {persona(r)}
                </div>
                <div style={{ fontWeight: 600 }}>{rowSubjectLabel(r)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                  Federation
                </div>
                <div>{r.federation?.name ?? r.federation?.slug ?? '—'}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem', marginTop: 4 }}>{r.registration_number}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                  Submitted
                </div>
                <div style={{ fontSize: '0.8125rem' }}>
                  {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => approve(r.id)}
                  disabled={busyId === r.id}
                  style={{
                    background: '#009650',
                    color: '#fff',
                    padding: '0.45rem 0.9rem',
                    border: 'none',
                    borderRadius: 4,
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: busyId === r.id ? 'wait' : 'pointer',
                  }}
                >
                  {busyId === r.id ? '…' : 'Approve'}
                </button>
                <button
                  onClick={() => { setRejectForId(r.id); setRejectReason(''); }}
                  disabled={busyId === r.id}
                  style={{
                    background: 'transparent',
                    color: '#FF6B7A',
                    padding: '0.45rem 0.9rem',
                    border: '1px solid #FF6B7A',
                    borderRadius: 4,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    cursor: busyId === r.id ? 'wait' : 'pointer',
                  }}
                >
                  Reject
                </button>
              </div>
              {rejectForId === r.id && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Reason (required, shown to owner)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.65rem',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 4,
                      color: '#fff',
                      fontSize: '0.8125rem',
                    }}
                  />
                  <button
                    onClick={() => reject(r.id)}
                    disabled={busyId === r.id}
                    style={{
                      background: '#C8102E',
                      color: '#fff',
                      padding: '0.45rem 0.9rem',
                      border: 'none',
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: busyId === r.id ? 'wait' : 'pointer',
                    }}
                  >
                    Confirm reject
                  </button>
                  <button
                    onClick={() => { setRejectForId(null); setRejectReason(''); }}
                    style={{
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.7)',
                      padding: '0.45rem 0.9rem',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>
        Recent decisions ({recent.length})
      </h2>
      {recent.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>No recent decisions.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {recent.map((r) => (
            <div
              key={r.id}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
                padding: '0.6rem 0.85rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr auto',
                gap: '0.75rem',
                alignItems: 'center',
                fontSize: '0.8125rem',
              }}
            >
              <div>{rowSubjectLabel(r)}</div>
              <div>
                {r.federation?.name ?? r.federation?.slug ?? '—'} · <span style={{ fontFamily: 'monospace' }}>{r.registration_number}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                {r.verified_at ? new Date(r.verified_at).toLocaleString() : '—'}
              </div>
              <div>{statusBadge(r.submission_status)}</div>
              {r.rejection_reason && (
                <div style={{ gridColumn: '1 / -1', color: '#FF6B7A', fontSize: '0.75rem' }}>
                  Reason: {r.rejection_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
