'use client';

// CancelButton — admin cancels a booking. Buyer is refunded via Stripe
// (handled separately in Phase 4 when Stripe Connect is in place; for the
// pilot, admin issues refund manually via Stripe dashboard and then
// marks the booking cancelled here).
//
// Prompts for a reason (required). Cancelled bookings stay in the system
// for audit but don't count toward the active bookable inventory.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  bookingId: string;
}

export default function CancelButton({ bookingId }: Props) {
  const router = useRouter();
  const [showPrompt, setShowPrompt] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError('A reason is required.');
      return;
    }
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to cancel');
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Network error');
      setBusy(false);
    }
  }

  if (!showPrompt) {
    return (
      <button
        type="button"
        onClick={() => setShowPrompt(true)}
        style={{ padding: '0.5rem 1rem', background: '#C8102E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
      >
        Cancel booking
      </button>
    );
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700, color: '#991b1b' }}>Cancel this booking?</h3>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
        This will flip status to "cancelled". You'll need to issue a refund via Stripe dashboard manually (Phase 4 will automate this).
      </p>
      {error && (
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid #C8102E', borderRadius: 6, padding: '0.5rem 0.75rem', color: '#991b1b', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}
      <textarea
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="e.g. Buyer cancelled, rink can't host, schedule conflict"
        style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem', marginBottom: '0.75rem', resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => { setShowPrompt(false); setReason(''); setError(null); }}
          style={{ padding: '0.5rem 1rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' }}
        >
          Keep booking
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          style={{ padding: '0.5rem 1rem', background: busy ? '#9ca3af' : '#C8102E', color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          {busy ? 'Cancelling…' : 'Cancel booking'}
        </button>
      </div>
    </div>
  );
}