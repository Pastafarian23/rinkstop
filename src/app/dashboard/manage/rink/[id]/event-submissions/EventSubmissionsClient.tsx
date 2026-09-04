'use client';

// Owner event submissions review queue.
// Uses actual DB columns: title, description, event_type, starts_at, ends_at,
// source_url, status, rejection_reason, raw_payload.

import { useState, useCallback } from 'react';

function StatusBadge({ status, colors }: { status: string; colors: Record<string, { bg: string; fg: string }> }) {
  const c = colors[status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
  return (
    <span style={{ background: c.bg, color: c.fg, padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {status}
    </span>
  );
}

export default function EventSubmissionsClient({
  rinkId,
  initialSubmissions,
  statusColors,
  eventTypeLabels,
  formatDate,
}: {
  rinkId: string;
  initialSubmissions: any[];
  statusColors: Record<string, { bg: string; fg: string }>;
  eventTypeLabels: Record<string, string>;
  formatDate: (iso: string) => string;
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'spam' | 'duplicate'>('all');
  const [resolving, setResolving] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/owner/rinks/${rinkId}/event-submissions?limit=200`);
    const j = await r.json();
    if (r.ok) setSubmissions(j.submissions);
  }, [rinkId]);

  const resolve = async (submissionId: string, status: string) => {
    if (status === 'rejected' || status === 'spam' || status === 'duplicate') {
      const reason = prompt(
        status === 'spam' ? 'Mark as spam?' :
        status === 'duplicate' ? 'What is this a duplicate of?' :
        'Rejection reason (visible to submitter):', ''
      );
      if (reason === null) return;
      setResolving(submissionId);
      const r = await fetch(`/api/owner/rinks/${rinkId}/event-submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejection_reason: reason }),
      });
      if (r.ok) await refresh();
      else { const j = await r.json(); alert(j.error || 'Failed.'); }
      setResolving(null);
    } else {
      setResolving(submissionId);
      const r = await fetch(`/api/owner/rinks/${rinkId}/event-submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (r.ok) {
        const j = await r.json();
        await refresh();
        if (j.created_event_id) {
          alert(`Approved! Draft event created in your events dashboard. Edit it there and publish.`);
        }
      } else {
        const j = await r.json(); alert(j.error || 'Failed.');
      }
      setResolving(null);
    }
  };

  const filtered = filter === 'all'
    ? submissions
    : submissions.filter((s: any) => s.status === filter);

  const counts = {
    all: submissions.length,
    pending: submissions.filter((s: any) => s.status === 'pending').length,
    approved: submissions.filter((s: any) => s.status === 'approved').length,
    rejected: submissions.filter((s: any) => s.status === 'rejected').length,
    spam: submissions.filter((s: any) => s.status === 'spam').length,
    duplicate: submissions.filter((s: any) => s.status === 'duplicate').length,
  };

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {(['all', 'pending', 'approved', 'rejected', 'spam', 'duplicate'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? 'var(--accent)' : 'transparent',
              color: filter === f ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
              padding: '0.4rem 0.85rem',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'capitalize',
            }}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 8 }}>
          {filter === 'all'
            ? 'No submissions yet. Share the public submit link to get your first ones.'
            : `No ${filter} submissions.`}
          <div style={{ marginTop: '1rem' }}>
            <a href="/events/submit" style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>View the public submit form →</a>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {filtered.map((s: any) => {
            const raw = s.raw_payload || {};
            const submittedAddress = raw.submitted_address;
            const submittedNotes = raw.submitted_notes;
            return (
              <div key={s.id} style={{
                padding: '1.25rem',
                background: 'var(--bg-elevated)',
                border: `1px solid ${s.status === 'pending' ? 'rgba(255,184,28,0.4)' : 'var(--border)'}`,
                borderRadius: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--fg)' }}>{s.title}</h3>
                      <StatusBadge status={s.status} colors={statusColors} />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {eventTypeLabels[s.event_type] || s.event_type} · {formatDate(s.starts_at)} → {formatDate(s.ends_at)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Submitted by</div>
                    <div style={{ color: 'var(--fg)' }}>{s.submitter_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.submitter_email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Submitted at</div>
                    <div style={{ color: 'var(--fg)' }}>{formatDate(s.created_at)}</div>
                  </div>
                </div>

                {submittedAddress && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    📍 {submittedAddress}
                  </div>
                )}
                {s.source_url && (
                  <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    🔗 <a href={s.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{s.source_url}</a>
                  </div>
                )}
                {submittedNotes && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--fg)', background: 'var(--bg)', padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: '0.75rem' }}>
                    <strong>Notes:</strong> {submittedNotes}
                  </div>
                )}
                {s.description && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--fg)', background: 'var(--bg)', padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: '0.75rem' }}>
                    <strong>Description:</strong> {s.description}
                  </div>
                )}
                {s.rejection_reason && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: '0.75rem' }}>
                    <strong>Resolution:</strong> {s.rejection_reason}
                  </div>
                )}

                {s.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => resolve(s.id, 'approved')}
                      disabled={resolving === s.id}
                      style={{
                        background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', color: '#86EFAC',
                        padding: '0.4rem 0.85rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                      }}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => resolve(s.id, 'rejected')}
                      disabled={resolving === s.id}
                      style={{
                        background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.3)', color: '#FCA5A5',
                        padding: '0.4rem 0.85rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem',
                      }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => resolve(s.id, 'duplicate')}
                      disabled={resolving === s.id}
                      style={{
                        background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.3)', color: '#94A3B8',
                        padding: '0.4rem 0.85rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem',
                      }}
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => resolve(s.id, 'spam')}
                      disabled={resolving === s.id}
                      style={{
                        background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)',
                        padding: '0.4rem 0.85rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem',
                      }}
                    >
                      Mark spam
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
