// src/app/dashboard/federation/[slug]/FederationDashboardClient.tsx
//
// WS17 PR4 Phase 2D — Federation dashboard client component.

'use client';

import { useState } from 'react';

interface League {
  id: string;
  league_name: string;
  league_slug: string | null;
  country: string | null;
  website: string | null;
  logo_url: string | null;
  status: string;
  created_at: string;
}

interface Props {
  federationId: string;
  leagues: League[];
  pendingCount: number;
  activeCount: number;
  suspendedCount: number;
  isAdmin: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  active: { bg: 'rgba(34,197,94,0.15)', fg: '#86efac' },
  pending: { bg: 'rgba(255,184,28,0.15)', fg: '#FCD34D' },
  suspended: { bg: 'rgba(239,68,68,0.15)', fg: '#FCA5A5' },
  archived: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FederationDashboardClient({ federationId, leagues, pendingCount, activeCount, suspendedCount, isAdmin }: Props) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const filtered = leagues.filter(l => {
    if (filter === 'all') return true;
    return l.status === filter;
  });

  async function handleAction(leagueId: string, action: 'approve' | 'reject') {
    if (!isAdmin) return;
    setError(null);
    setActionMsg(null);
    setLoadingId(leagueId);

    try {
      const res = await fetch(`/api/federation/leagues/${leagueId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'reject' ? JSON.stringify({ reason: '' }) : undefined,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `${action} failed`);
      } else {
        setActionMsg(`League ${action}d successfully.`);
        setTimeout(() => window.location.reload(), 600);
      }
    } catch {
      setError(`${action} failed. Please try again.`);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}
      {actionMsg && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
          {actionMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All', count: leagues.length },
          { key: 'pending', label: 'Pending', count: pendingCount },
          { key: 'active', label: 'Active', count: activeCount },
          { key: 'suspended', label: 'Suspended', count: suspendedCount },
        ].map(tab => (
          <div key={tab.key} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: filter === tab.key ? '#7DD3FC' : '#fff' }}>{tab.count}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>{tab.label}</div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '2.5rem 2rem', textAlign: 'center' }}>
          <p style={{ color: '#94A3B8', fontSize: '0.95rem' }}>No {filter === 'all' ? '' : filter} leagues.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(league => {
            const sc = STATUS_COLORS[league.status] || STATUS_COLORS.archived;
            return (
              <div key={league.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                    {league.logo_url && <img src={league.logo_url} alt="" style={{ width: 24, height: 24, borderRadius: 4, verticalAlign: 'middle', marginRight: '0.5rem' }} />}
                    {league.league_name}
                  </div>
                  <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '0.125rem' }}>
                    {league.country ? `${league.country} · ` : ''}
                    {league.website ? <a href={league.website} target="_blank" rel="noreferrer" style={{ color: '#7DD3FC' }}>Website</a> : '—'}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Added {formatDate(league.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                  {isAdmin && league.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAction(league.id, 'approve')}
                        disabled={loadingId === league.id}
                        style={{
                          background: 'rgba(34,197,94,0.15)',
                          color: '#86efac',
                          border: '1px solid rgba(34,197,94,0.3)',
                          borderRadius: 6,
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.8rem',
                          cursor: loadingId === league.id ? 'not-allowed' : 'pointer',
                          opacity: loadingId === league.id ? 0.6 : 1,
                        }}
                      >
                        {loadingId === league.id ? 'Saving...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleAction(league.id, 'reject')}
                        disabled={loadingId === league.id}
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          color: '#FCA5A5',
                          border: '1px solid rgba(239,68,68,0.25)',
                          borderRadius: 6,
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.8rem',
                          cursor: loadingId === league.id ? 'not-allowed' : 'pointer',
                          opacity: loadingId === league.id ? 0.6 : 1,
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <span style={{ background: sc.bg, color: sc.fg, padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize' }}>
                    {league.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
