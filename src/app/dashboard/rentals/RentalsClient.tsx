'use client';

// Parent rentals dashboard: list rentals, pay deposit, view payment history.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function formatPrice(cents: number | null, currency: string): string {
  if (!cents) return '—';
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return '—'; }
}

function StatusBadge({ status, colors }: { status: string; colors: Record<string, { bg: string; fg: string }> }) {
  const c = colors[status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' };
  return (
    <span style={{ background: c.bg, color: c.fg, padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {status}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    succeeded: { bg: 'rgba(74,222,128,0.15)', fg: '#86EFAC' },
    failed: { bg: 'rgba(200,16,46,0.15)', fg: '#FCA5A5' },
    pending: { bg: 'rgba(255,184,28,0.15)', fg: '#FCD34D' },
    refunded: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
  };
  const c = colors[status] || colors.pending;
  return (
    <span style={{ background: c.bg, color: c.fg, padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase' }}>
      {status}
    </span>
  );
}

export default function RentalsClient({
  rentals,
  paymentsByRental,
  rentalStatusColors,
  equipmentTypes,
  formatPrice: formatPriceFn,
  formatDate: formatDateFn,
}: {
  rentals: any[];
  paymentsByRental: Record<string, any[]>;
  rentalStatusColors: Record<string, { bg: string; fg: string }>;
  equipmentTypes: Record<string, string>;
  formatPrice: (cents: number | null, currency: string) => string;
  formatDate: (iso: string | null | undefined) => string;
}) {
  const router = useRouter();
  const [loadingRentalId, setLoadingRentalId] = useState<string | null>(null);
  const [expandedRentalId, setExpandedRentalId] = useState<string | null>(null);

  const active = rentals.filter(r => r.status !== 'cancelled');
  const past = rentals.filter(r => r.status === 'cancelled' || r.status === 'returned');

  const startCheckout = async (rentalId: string) => {
    setLoadingRentalId(rentalId);
    try {
      const r = await fetch(`/api/parent/rentals/${rentalId}/checkout`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) {
        alert(j.error || 'Could not start checkout.');
        return;
      }
      window.location.href = j.url;
    } catch (e) {
      alert('Network error. Please try again.');
    } finally {
      setLoadingRentalId(null);
    }
  };

  const renderRental = (rental: any) => {
    const owedDeposit = rental.deposit_required_cents - rental.deposit_paid_cents;
    const payments = paymentsByRental[rental.id] || [];
    const hasOverduePayment = payments.some((p: any) => p.status === 'failed');
    const isExpanded = expandedRentalId === rental.id;

    return (
      <div key={rental.id} style={{
        padding: '1rem',
        background: 'var(--bg-elevated)',
        border: `1px solid ${rental.status === 'overdue' ? 'rgba(200,16,46,0.4)' : 'var(--border)'}`,
        borderRadius: 8,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--fg)', fontSize: '0.95rem' }}>
                {rental.equipment_items?.label || 'Unknown Item'}
              </div>
              <StatusBadge status={rental.status} colors={rentalStatusColors} />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {equipmentTypes[rental.equipment_items?.type] || rental.equipment_items?.type}
              {rental.equipment_items?.brand && ` · ${rental.equipment_items.brand}`}
              {rental.equipment_items?.size && ` · Size ${rental.equipment_items.size}`}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {formatDateFn(rental.starts_at)}
              {rental.ends_at ? ` → ${formatDateFn(rental.ends_at)}` : ' → open-ended'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '120px', textAlign: 'right' }}>
            {rental.deposit_required_cents > 0 && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Deposit: <strong style={{ color: 'var(--fg)' }}>{formatPriceFn(rental.deposit_required_cents, rental.currency)}</strong>
                {owedDeposit > 0 && <span style={{ color: '#FCD34D', marginLeft: '0.25rem' }}>({formatPriceFn(owedDeposit, rental.currency)} owed)</span>}
              </div>
            )}
            {rental.monthly_rate_cents > 0 && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Monthly: <strong style={{ color: 'var(--fg)' }}>{formatPriceFn(rental.monthly_rate_cents, rental.currency)}</strong>
              </div>
            )}
            {rental.next_bill_at && rental.status === 'active' && (
              <div style={{ fontSize: '0.8rem', color: hasOverduePayment ? '#FCA5A5' : 'var(--text-muted)' }}>
                Next: <strong>{formatDateFn(rental.next_bill_at)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          {(rental.status === 'pending' || owedDeposit > 0) && rental.status !== 'cancelled' && (
            <button
              onClick={() => startCheckout(rental.id)}
              disabled={loadingRentalId === rental.id}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: 6,
                cursor: loadingRentalId === rental.id ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              {loadingRentalId === rental.id ? 'Loading...' : owedDeposit > 0 ? `Pay ${formatPriceFn(owedDeposit, rental.currency)} deposit` : 'Pay & Activate'}
            </button>
          )}
          {payments.length > 0 && (
            <button
              onClick={() => setExpandedRentalId(isExpanded ? null : rental.id)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                padding: '0.5rem 1rem',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              {isExpanded ? 'Hide' : 'View'} Payment History ({payments.length})
            </button>
          )}
        </div>

        {/* Payment history expanded */}
        {isExpanded && payments.length > 0 && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Payments
            </div>
            {payments.map((p: any) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--fg)' }}>
                  {p.kind === 'deposit' ? 'Deposit' : p.kind === 'monthly' ? 'Monthly fee' : p.kind}
                  {p.period_start && p.period_end && ` · ${formatDateFn(p.period_start)} → ${formatDateFn(p.period_end)}`}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--fg)', fontWeight: 600 }}>{formatPriceFn(p.amount_cents, p.currency)}</span>
                  <PaymentStatusBadge status={p.status} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateFn(p.paid_at || p.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Active rentals */}
      <h2 style={{ fontSize: '1.05rem', color: 'var(--fg)', marginBottom: '0.75rem' }}>
        Active ({active.length})
      </h2>
      {active.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 8, marginBottom: '2rem' }}>
          No active rentals. When a rink rents gear to your kid, it shows up here.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
          {active.map(renderRental)}
        </div>
      )}

      {/* Past rentals */}
      {past.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.05rem', color: 'var(--fg)', marginBottom: '0.75rem' }}>
            Past ({past.length})
          </h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {past.map(renderRental)}
          </div>
        </>
      )}
    </div>
  );
}
