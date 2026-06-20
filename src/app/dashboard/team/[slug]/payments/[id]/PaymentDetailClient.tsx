'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Record {
  id: string;
  player_id: string;
  amount_due: number | string;
  amount_paid: number | string;
  status: string;
  paid_via: string | null;
  paid_at: string | null;
  reference_number: string | null;
  receipt_url: string | null;
  notes: string | null;
  player_name: string;
  is_self: boolean;
}

interface Props {
  teamId: string;
  teamSlug: string;
  teamName: string;
  payment: {
    id: string;
    title: string;
    description: string | null;
    amount_per_player: number | string;
    currency: string;
    convenience_fee_pct: number | string;
    due_date: string | null;
    status: string;
  };
  records: Record[];
  isAdmin: boolean;
}

function fmtMoney(n: number | string, currency: string): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export default function PaymentDetailClient({ teamSlug, teamName, payment, records: initialRecords, isAdmin }: Props) {
  const router = useRouter();
  const [records, setRecords] = useState(initialRecords);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('paid');
  const [editPaidVia, setEditPaidVia] = useState<string>('gcash');
  const [editRefNumber, setEditRefNumber] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const paidCount = records.filter(r => r.status === 'paid').length;
  const pendingCount = records.filter(r => r.status === 'pending_verification').length;
  const unpaidCount = records.filter(r => r.status === 'unpaid' || r.status === 'partial').length;
  const waivedCount = records.filter(r => r.status === 'waived').length;
  const totalCollected = records.reduce((sum, r) => sum + parseFloat(String(r.amount_paid || 0)), 0);
  const totalExpected = records.reduce((sum, r) => sum + parseFloat(String(r.amount_due || 0)), 0);
  const fee = parseFloat(String(payment.convenience_fee_pct || 0)) / 100;
  const feeAmount = totalCollected * fee;

  async function startEdit(record: Record) {
    setEditingId(record.id);
    setEditStatus(record.status);
    setEditPaidVia(record.paid_via || 'gcash');
    setEditRefNumber(record.reference_number || '');
    setEditNotes(record.notes || '');
  }

  async function saveEdit(recordId: string) {
    setSubmitting(true);
    try {
      const resp = await fetch(`/api/team/${teamSlug}/payments/${payment.id}/records/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          paid_via: editPaidVia,
          reference_number: editRefNumber || null,
          notes: editNotes || null,
        }),
      });
      if (resp.ok) {
        const updated = await resp.json();
        setRecords(records.map(r => r.id === recordId ? { ...r, ...updated.record } : r));
        setEditingId(null);
        router.refresh();
      } else {
        const err = await resp.json();
        alert(`Failed: ${err.error || 'unknown'}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; fg: string; label: string }> = {
      paid: { bg: '#22c55e', fg: '#fff', label: 'Paid' },
      pending_verification: { bg: '#FFB81C', fg: '#041E42', label: 'Pending' },
      unpaid: { bg: '#f1f5f9', fg: '#1a1a1a', label: 'Unpaid' },
      partial: { bg: '#FFB81C', fg: '#041E42', label: 'Partial' },
      waived: { bg: '#9ca3af', fg: '#fff', label: 'Waived' },
      refunded: { bg: '#9ca3af', fg: '#fff', label: 'Refunded' },
    };
    const c = colors[status] || colors.unpaid;
    return (
      <span style={{
        background: c.bg,
        color: c.fg,
        padding: '0.125rem 0.5rem',
        borderRadius: 4,
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {c.label}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: 980, padding: '2rem 1.5rem' }}>
      <Link href={`/dashboard/team/${teamSlug}/payments`} style={{ fontSize: '0.85rem', color: '#041E42' }}>
        ← Back to payments
      </Link>

      <h1 style={{ margin: '0.5rem 0 0.25rem', color: '#041E42', fontSize: '1.875rem', fontWeight: 800 }}>
        {payment.title}
      </h1>
      {payment.description && (
        <p style={{ margin: '0 0 0.5rem', color: '#6b7280' }}>{payment.description}</p>
      )}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <span>{teamName}</span>
        <span>·</span>
        <span><strong style={{ color: '#041E42' }}>{fmtMoney(payment.amount_per_player, payment.currency)}</strong> per player</span>
        {parseFloat(String(payment.convenience_fee_pct)) > 0 && (
          <>
            <span>·</span>
            <span>{payment.convenience_fee_pct}% RinkStop fee</span>
          </>
        )}
        {payment.due_date && (
          <>
            <span>·</span>
            <span>Due {new Date(payment.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </>
        )}
      </div>

      {/* Summary card */}
      <div style={{
        background: '#041E42',
        color: '#fff',
        borderRadius: 8,
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1rem',
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, fontWeight: 700 }}>Collected</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>{fmtMoney(totalCollected, payment.currency)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, fontWeight: 700 }}>Expected</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', opacity: 0.5 }}>{fmtMoney(totalExpected, payment.currency)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, fontWeight: 700 }}>RinkStop Fee</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: '#FFB81C' }}>{fmtMoney(feeAmount, payment.currency)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, fontWeight: 700 }}>Status</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' }}>{paidCount} paid / {records.length} total</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.125rem' }}>
            {pendingCount > 0 && `${pendingCount} pending · `}
            {unpaidCount > 0 && `${unpaidCount} unpaid · `}
            {waivedCount > 0 && `${waivedCount} waived`}
          </div>
        </div>
      </div>

      {/* Player records table */}
      <h2 style={{ margin: '1.5rem 0 0.75rem', color: '#041E42', fontSize: '1.125rem', fontWeight: 800 }}>Player payments</h2>
      {records.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>
          No players on this team yet.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#041E42' }}>Player</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#041E42' }}>Due</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#041E42' }}>Paid</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#041E42' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#041E42' }}>Method</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#041E42' }}>Ref #</th>
                {isAdmin && <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#041E42' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: r.is_self ? 700 : 400 }}>
                    {r.player_name} {r.is_self && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>(you)</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{fmtMoney(r.amount_due, payment.currency)}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700 }}>{fmtMoney(r.amount_paid, payment.currency)}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{statusBadge(r.status)}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{r.paid_via || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.reference_number || '—'}</td>
                  {isAdmin && (
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => startEdit(r)}
                        style={{ background: '#041E42', color: '#fff', border: 'none', padding: '0.375rem 0.75rem', borderRadius: 4, fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal (inline) */}
      {editingId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', maxWidth: 480, width: '100%' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#041E42', fontSize: '1.125rem', fontWeight: 800 }}>Update payment record</h3>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>Status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4 }}>
                <option value="unpaid">Unpaid</option>
                <option value="pending_verification">Pending verification</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="waived">Waived</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            {(editStatus === 'paid' || editStatus === 'partial' || editStatus === 'pending_verification') && (
              <>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>Paid via</label>
                  <select value={editPaidVia} onChange={(e) => setEditPaidVia(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4 }}>
                    <option value="gcash">GCash</option>
                    <option value="paymaya">PayMaya</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank transfer</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>Reference number (GCash ref, etc.)</label>
                  <input type="text" value={editRefNumber} onChange={(e) => setEditRefNumber(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4 }} />
                </div>
              </>
            )}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>Notes</label>
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingId(null)} style={{ padding: '0.5rem 1rem', background: '#fff', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => saveEdit(editingId)} disabled={submitting} style={{ padding: '0.5rem 1rem', background: submitting ? '#9ca3af' : '#C8102E', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}