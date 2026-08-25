'use client';

import { useState } from 'react';

interface Contract {
  id: string;
  title: string;
  contract_type: string;
  status: string;
  expires_at: string | null;
  sent_at: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  connection: { id: string; org_name: string } | null;
}

interface Props {
  rinkId: string;
  initialContracts: Contract[];
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  draft: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
  sent: { bg: 'rgba(255,184,28,0.15)', fg: '#FCD34D' },
  signed: { bg: 'rgba(34,197,94,0.15)', fg: '#86efac' },
  expired: { bg: 'rgba(239,68,68,0.15)', fg: '#FCA5A5' },
};

const TYPE_LABELS: Record<string, string> = {
  ice_rental: 'Ice Rental Agreement',
  coaching_services: 'Coaching Services',
  partnership: 'Partnership Agreement',
  sponsorship: 'Sponsorship',
  usage: 'Facility Usage Agreement',
  other: 'Contract',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ContractsClient({ rinkId, initialContracts }: Props) {
  const [contracts] = useState<Contract[]>(initialContracts);
  const [filter, setFilter] = useState<'all' | 'pending' | 'signed' | 'expired'>('all');

  const filtered = contracts.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'pending') return c.status === 'sent' || c.status === 'draft';
    if (filter === 'signed') return c.status === 'signed';
    if (filter === 'expired') return c.status === 'expired';
    return true;
  });

  const pendingCount = contracts.filter(c => c.status === 'sent' || c.status === 'draft').length;
  const signedCount = contracts.filter(c => c.status === 'signed').length;

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['all','pending','signed','expired'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.03)',
              color: filter === f ? '#7DD3FC' : '#94A3B8',
              border: `1px solid ${filter === f ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 6,
              padding: '0.25rem 0.75rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f} {f === 'pending' ? `(${pendingCount})` : f === 'signed' ? `(${signedCount})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '2.5rem 2rem', textAlign: 'center' }}>
          <p style={{ color: '#94A3B8', fontSize: '0.95rem' }}>No {filter === 'all' ? '' : filter} contracts yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(contract => {
            const sc = STATUS_COLORS[contract.status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
            return (
              <div key={contract.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: 'rgba(13,17,23,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{contract.title}</div>
                  <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '0.125rem' }}>
                    {TYPE_LABELS[contract.contract_type] || contract.contract_type}
                    {contract.connection ? ` · ${contract.connection.org_name}` : ''}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {contract.sent_at ? `Sent ${formatDate(contract.sent_at)}` : `Created ${formatDate(contract.created_at)}`}
                    {contract.signed_at ? ` · Signed ${formatDate(contract.signed_at)}` : ''}
                    {contract.expires_at && contract.status !== 'signed' ? ` · Expires ${formatDate(contract.expires_at)}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                  <span style={{ background: sc.bg, color: sc.fg, padding: '0.125rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize' }}>
                    {contract.status}
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
