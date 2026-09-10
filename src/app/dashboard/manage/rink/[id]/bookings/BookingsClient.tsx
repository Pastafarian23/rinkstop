'use client';

// BookingsClient — rink-side view of admin-arranged bookings.
//
// Rink owner can:
//   - Confirm a booking (status: pending_payment | paid → confirmed)
//   - Decline a booking (status: → declined) — must provide a reason
//   - Mark booking as completed after the slot happens (status: confirmed → completed)
//
// Rink owner CANNOT change:
//   - Price, fee, settlement amount (admin sets those)
//   - Payment status (Stripe webhook sets those)
//
// Optimistic updates: state reflects the API response. On error, restore
// previous state and show error.

import { useState } from 'react';

interface Booking {
  id: string;
  title: string;
  notes: string | null;
  start_time: string;
  end_time: string;
  price_cents: number;
  fee_cents: number;
  settlement_cents: number;
  currency: string;
  payment_status: string;
  paid_at: string | null;
  status: string;
  settlement_status: string;
  settlement_method: string | null;
  settlement_sent_at: string | null;
  settlement_reference: string | null;
  created_at: string;
  buyer_contact_name: string;
  buyer_contact_email: string;
  buyer_contact_phone: string | null;
  buyer_team_workspace_id: string | null;
}

interface Props {
  rinkId: string;
  bookings: Booking[];
}

function formatMoney(cents: number, currency: string): string {
  const symbol =
    currency.toUpperCase() === 'USD' ? '$' :
    currency.toUpperCase() === 'PHP' ? '₱' :
    currency.toUpperCase() === 'EUR' ? '€' :
    currency.toUpperCase() === 'GBP' ? '£' :
    '';
  return `${symbol}${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function formatLocalTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export default function BookingsClient({ rinkId, bookings }: Props) {
  const [items, setItems] = useState<Booking[]>(bookings);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declinePrompt, setDeclinePrompt] = useState<{ id: string; reason: string } | null>(null);

  async function update(id: string, patch: { status?: string; cancelled_reason?: string }, optimistic: Partial<Booking>) {
    setBusyId(id);
    setError(null);

    // Save current state for rollback
    const prev = items;

    // Optimistic update
    setItems((cur) => cur.map((b) => (b.id === id ? { ...b, ...optimistic } : b)));

    try {
      const res = await fetch(`/api/owner/rinks/${rinkId}/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update');
        setItems(prev); // rollback
        return;
      }
      // Update from server response (in case server normalized anything)
      if (data.booking) {
        setItems((cur) => cur.map((b) => (b.id === id ? { ...b, ...data.booking } : b)));
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
      setItems(prev);
    } finally {
      setBusyId(null);
    }
  }

  function handleConfirm(b: Booking) {
    if (b.status !== 'pending_payment' && b.status !== 'paid') {
      setError(`Cannot confirm a booking in "${b.status}" state.`);
      return;
    }
    update(b.id, { status: 'confirmed' }, { status: 'confirmed' });
  }

  function handleStartDecline(b: Booking) {
    if (b.status === 'declined' || b.status === 'cancelled' || b.status === 'completed') {
      setError(`Cannot decline a booking already in "${b.status}" state.`);
      return;
    }
    setDeclinePrompt({ id: b.id, reason: '' });
  }

  function handleConfirmDecline() {
    if (!declinePrompt) return;
    if (!declinePrompt.reason.trim()) {
      setError('A reason is required to decline.');
      return;
    }
    const id = declinePrompt.id;
    const reason = declinePrompt.reason;
    setDeclinePrompt(null);
    update(id, { status: 'declined', cancelled_reason: reason }, { status: 'declined' });
  }

  function handleComplete(b: Booking) {
    if (b.status !== 'confirmed') {
      setError(`Only confirmed bookings can be completed. Current status: ${b.status}.`);
      return;
    }
    update(b.id, { status: 'completed' }, { status: 'completed' });
  }

  if (items.length === 0) {
    return (
      <div style={{ background: '#f7f7f8', border: '1px solid #e5e7eb', borderRadius: 8, padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
        <div style={{ fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>No bookings yet</div>
        <div style={{ fontSize: '0.85rem' }}>
          When RinkStop brokers a booking for this rink, it'll show up here.
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid #C8102E', borderRadius: 6, padding: '0.75rem 1rem', color: '#C8102E', fontSize: '0.9rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {items.map((b) => {
          const isBusy = busyId === b.id;
          return (
            <div
              key={b.id}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '1.25rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                opacity: isBusy ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#041E42', fontSize: '1.05rem' }}>
                    {b.title}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 2 }}>
                    {formatLocalTime(b.start_time)} – {formatLocalTime(b.end_time)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <StatusBadge label="Booking" value={b.status} />
                  <StatusBadge label="Payment" value={b.payment_status} />
                  {b.settlement_status !== 'not_sent' && (
                    <StatusBadge label="Settlement" value={b.settlement_status} />
                  )}
                </div>
              </div>

              <div style={{ background: '#EEF5FF', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                <div><strong>Buyer:</strong> {b.buyer_contact_name} &lt;{b.buyer_contact_email}&gt;{b.buyer_contact_phone ? ` · ${b.buyer_contact_phone}` : ''}</div>
                <div><strong>Total:</strong> {formatMoney(b.price_cents, b.currency)}</div>
                <div><strong>Your settlement:</strong> <span style={{ color: '#041E42', fontWeight: 700 }}>{formatMoney(b.settlement_cents, b.currency)}</span> (RinkStop fee: {formatMoney(b.fee_cents, b.currency)})</div>
                {b.settlement_sent_at && (
                  <div style={{ marginTop: '0.25rem', color: '#6b7280' }}>
                    <strong>Settlement sent:</strong> {formatLocalTime(b.settlement_sent_at)}
                    {b.settlement_reference ? ` · ${b.settlement_reference}` : ''}
                  </div>
                )}
              </div>

              {b.notes && (
                <div style={{ background: '#fffbeb', borderLeft: '3px solid #FFB81C', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  <strong>Buyer note:</strong> {b.notes}
                </div>
              )}

              {(b.status === 'pending_payment' || b.status === 'paid') && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleConfirm(b)}
                    disabled={isBusy}
                    style={{ padding: '0.5rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: isBusy ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartDecline(b)}
                    disabled={isBusy}
                    style={{ padding: '0.5rem 1rem', background: '#C8102E', color: '#fff', border: 'none', borderRadius: 6, cursor: isBusy ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    Decline
                  </button>
                </div>
              )}

              {b.status === 'confirmed' && (
                <button
                  type="button"
                  onClick={() => handleComplete(b)}
                  disabled={isBusy}
                  style={{ padding: '0.5rem 1rem', background: '#041E42', color: '#fff', border: 'none', borderRadius: 6, cursor: isBusy ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Mark as completed
                </button>
              )}

              <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.75rem' }}>
                Booking ID: <code>{b.id}</code>
              </div>
            </div>
          );
        })}
      </div>

      {/* Decline prompt modal */}
      {declinePrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '1.5rem', maxWidth: 480, width: '100%' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', fontWeight: 700, color: '#041E42' }}>Decline this booking?</h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#6b7280' }}>
              The buyer will be notified. Briefly explain why so RinkStop can follow up if needed.
            </p>
            <textarea
              autoFocus
              value={declinePrompt.reason}
              onChange={(e) => setDeclinePrompt({ ...declinePrompt, reason: e.target.value })}
              rows={3}
              placeholder="e.g. Slot already booked offline, ice maintenance scheduled, etc."
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.9rem', resize: 'vertical', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeclinePrompt(null)}
                style={{ padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                style={{ padding: '0.5rem 1rem', background: '#C8102E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                Decline booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ label, value }: { label: string; value: string }) {
  const color = (() => {
    switch (value) {
      case 'pending_payment':
      case 'not_sent':
        return { bg: 'rgba(255,184,28,0.1)', fg: '#FFB81C' };
      case 'paid':
      case 'confirmed':
      case 'sent':
        return { bg: 'rgba(16,185,129,0.1)', fg: '#10b981' };
      case 'completed':
        return { bg: 'rgba(4,30,66,0.1)', fg: '#041E42' };
      case 'declined':
      case 'cancelled':
      case 'failed':
      case 'refunded':
        return { bg: 'rgba(200,16,46,0.1)', fg: '#C8102E' };
      default:
        return { bg: '#f7f7f8', fg: '#6b7280' };
    }
  })();
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.2rem 0.65rem',
      borderRadius: 999,
      background: color.bg,
      color: color.fg,
      fontSize: '0.7rem',
      fontWeight: 700,
      letterSpacing: '0.02em',
    }}>
      {label}: {value.replace(/_/g, ' ')}
    </span>
  );
}