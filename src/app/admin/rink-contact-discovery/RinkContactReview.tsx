'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Candidate {
  id: string;
  rink_id: string;
  email: string;
  source_url: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'used';
  rejected_reason: string | null;
  notes: string | null;
  discovered_at: string;
  rink_name?: string;
  rink_city?: string | null;
  rink_state?: string | null;
  rink_country?: string | null;
  rink_website?: string | null;
}

interface Props {
  candidates: Candidate[];
  currentFilter: string;
}

export default function RinkContactReview({ candidates, currentFilter }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleReview = async (
    id: string,
    action: 'approved' | 'rejected',
    rejectedReason?: string
  ) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/rink-contact-discovery/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectedReason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e.message || 'Failed to update');
    }
  };

  const handleCopyAll = async () => {
    const approved = candidates.filter((c) => c.status === 'approved');
    if (approved.length === 0) {
      setError('No approved candidates to copy.');
      return;
    }
    const text = approved
      .map(
        (c) =>
          `${c.email}\t${c.rink_name || ''}\t${[c.rink_city, c.rink_state, c.rink_country].filter(Boolean).join(', ')}\t${c.rink_website || ''}`
      )
      .join('\n');
    await navigator.clipboard.writeText(text);
    setError(`Copied ${approved.length} approved rows to clipboard.`);
  };

  if (candidates.length === 0) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
        {currentFilter === 'pending'
          ? 'No pending candidates. Run scripts/discover-rink-contacts.mjs to scrape more.'
          : `No ${currentFilter} candidates yet.`}
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      {currentFilter === 'approved' && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleCopyAll}
            style={{
              background: '#FFB81C',
              color: '#041E42',
              border: 'none',
              padding: '0.6rem 1.1rem',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            📋 Copy approved rows as TSV
          </button>
          <span style={{ color: '#6b7280', fontSize: '0.8rem', alignSelf: 'center' }}>
            Paste into a sheet, or feed to your outreach tool.
          </span>
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5',
            padding: '0.6rem 0.9rem',
            borderRadius: 6,
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {candidates.map((c) => {
          const isExpanded = expanded.has(c.id);
          const confColor = c.confidence >= 0.85 ? '#14B8A6' : c.confidence >= 0.7 ? '#FFB81C' : '#9ca3af';

          return (
            <div
              key={c.id}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                padding: '0.9rem 1.1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                {/* Confidence badge */}
                <div
                  style={{
                    background: `${confColor}20`,
                    color: confColor,
                    border: `1px solid ${confColor}40`,
                    borderRadius: 6,
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    minWidth: 44,
                    textAlign: 'center',
                  }}
                  title={`Confidence: ${(c.confidence * 100).toFixed(0)}%`}
                >
                  {(c.confidence * 100).toFixed(0)}%
                </div>

                {/* Email */}
                <a
                  href={`mailto:${c.email}`}
                  style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.95rem', textDecoration: 'none', fontWeight: 600 }}
                >
                  {c.email}
                </a>

                {/* Rink name */}
                <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                  {c.rink_name || '(unknown rink)'}
                </span>

                {/* Location */}
                {(c.rink_city || c.rink_state || c.rink_country) && (
                  <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                    {[c.rink_city, c.rink_state, c.rink_country].filter(Boolean).join(', ')}
                  </span>
                )}

                {/* Status badge */}
                <span
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: '#9ca3af',
                    borderRadius: 4,
                    padding: '0.15rem 0.5rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {c.status}
                </span>

                <div style={{ flex: 1 }} />

                {/* Action buttons */}
                {c.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleReview(c.id, 'approved')}
                      disabled={pending}
                      style={{
                        background: '#14B8A6',
                        color: '#041E42',
                        border: 'none',
                        padding: '0.4rem 0.85rem',
                        borderRadius: 5,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: pending ? 'wait' : 'pointer',
                      }}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = window.prompt('Reason for rejection? (e.g. "vendor email", "wrong rink", "info@ generic")');
                        if (reason !== null) handleReview(c.id, 'rejected', reason);
                      }}
                      disabled={pending}
                      style={{
                        background: 'transparent',
                        color: '#9ca3af',
                        border: '1px solid rgba(255,255,255,0.15)',
                        padding: '0.4rem 0.85rem',
                        borderRadius: 5,
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: pending ? 'wait' : 'pointer',
                      }}
                    >
                      ✕ Reject
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    const next = new Set(expanded);
                    if (isExpanded) next.delete(c.id);
                    else next.add(c.id);
                    setExpanded(next);
                  }}
                  style={{
                    background: 'transparent',
                    color: '#9ca3af',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 5,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  {isExpanded ? '▲' : '▼'}
                </button>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.85rem' }}>
                  <div style={{ marginBottom: '0.4rem' }}>
                    <span style={{ color: '#6b7280' }}>Source URL:</span>{' '}
                    <a href={c.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', wordBreak: 'break-all' }}>
                      {c.source_url}
                    </a>
                  </div>
                  {c.rink_website && c.rink_website !== c.source_url && (
                    <div style={{ marginBottom: '0.4rem' }}>
                      <span style={{ color: '#6b7280' }}>Rink website:</span>{' '}
                      <a href={c.rink_website} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', wordBreak: 'break-all' }}>
                        {c.rink_website}
                      </a>
                    </div>
                  )}
                  <div style={{ marginBottom: '0.4rem' }}>
                    <span style={{ color: '#6b7280' }}>Discovered:</span>{' '}
                    <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{new Date(c.discovered_at).toLocaleString()}</span>
                  </div>
                  {c.rejected_reason && (
                    <div style={{ marginBottom: '0.4rem' }}>
                      <span style={{ color: '#6b7280' }}>Rejection reason:</span>{' '}
                      <span style={{ color: '#fca5a5' }}>{c.rejected_reason}</span>
                    </div>
                  )}
                  <div>
                    <a href={`/directory/rinks/${c.rink_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }}>
                      View rink page →
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
