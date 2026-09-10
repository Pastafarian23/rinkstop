'use client';

// SettlementForm — admin marks a booking's settlement as sent.
//
// POSTs to /api/admin/bookings/[id]/settlement with:
//   - method: offline | gcash | bank_transfer | stripe_connect | paymongo | paymaya
//   - reference: free-text reference number (bank ref / GCash ref / etc.)
//
// Server validates the booking is in a state where settlement makes sense
// (paid | confirmed | completed) and that settlement hasn't already been
// marked 'confirmed'. Once sent, the admin can flip to 'confirmed' in the
// next visit if the rink acknowledged receipt.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  bookingId: string;
  currentStatus: string;
}

const METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'gcash', label: 'GCash' },
  { value: 'paymaya', label: 'PayMaya' },
  { value: 'paymongo', label: 'PayMongo' },
  { value: 'stripe_connect', label: 'Stripe Connect' },
  { value: 'offline', label: 'Other (cash, etc.)' },
];

export default function SettlementForm({ bookingId, currentStatus }: Props) {
  const router = useRouter();
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/settlement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, reference: reference.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to mark settlement');
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Network error');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid #C8102E', borderRadius: 6, padding: '0.5rem 0.75rem', color: '#991b1b', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem', background: '#fff' }}>
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Reference (bank ref, GCash ref, etc.)</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. BPI ref 1234567"
            style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          style={{ padding: '0.4rem 1rem', background: busy ? '#9ca3af' : '#041E42', color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.85rem', height: 'fit-content' }}
        >
          {busy ? 'Saving…' : currentStatus === 'sent' ? 'Mark confirmed' : 'Mark sent'}
        </button>
      </div>
    </form>
  );
}