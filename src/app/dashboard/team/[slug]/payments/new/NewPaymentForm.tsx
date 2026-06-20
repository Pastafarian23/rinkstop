'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  teamId: string;
  teamSlug: string;
  defaultCurrency: string;
}

export default function NewPaymentForm({ teamId, teamSlug, defaultCurrency }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amountPerPlayer, setAmountPerPlayer] = useState('800');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [convenienceFeePct, setConvenienceFeePct] = useState('5');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch(`/api/team/${teamSlug}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: teamId,
          title,
          description: description || null,
          amount_per_player: parseFloat(amountPerPlayer),
          currency,
          convenience_fee_pct: parseFloat(convenienceFeePct),
          due_date: dueDate || null,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json();
        setError(body.error || 'Failed to create payment');
        setSubmitting(false);
        return;
      }
      const data = await resp.json();
      router.push(`/dashboard/team/${teamSlug}/payments/${data.payment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#041E42', marginBottom: '0.25rem' }}>
          Title *
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Oct 27 Sunday Session"
          style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#041E42', marginBottom: '0.25rem' }}>
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Notes about this payment event"
          style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.95rem', resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#041E42', marginBottom: '0.25rem' }}>
            Amount per player *
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={amountPerPlayer}
            onChange={(e) => setAmountPerPlayer(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#041E42', marginBottom: '0.25rem' }}>
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem' }}
          >
            <option value="PHP">PHP</option>
            <option value="USD">USD</option>
            <option value="CAD">CAD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#041E42', marginBottom: '0.25rem' }}>
            RinkStop service fee (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={convenienceFeePct}
            onChange={(e) => setConvenienceFeePct(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem' }}
          />
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
            Charged to the player on top of the session fee. Standard 5% — covers payment processing + RinkStop service. You receive the full session fee.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#041E42', marginBottom: '0.25rem' }}>
          Due date (optional)
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1rem' }}
        />
      </div>

      {error && (
        <div style={{ background: 'rgba(200,16,46,0.10)', border: '1px solid rgba(200,16,46,0.4)', color: '#C8102E', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/team/${teamSlug}/payments`)}
          style={{ padding: '0.625rem 1rem', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.95rem', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '0.625rem 1.25rem',
            background: submitting ? '#9ca3af' : '#C8102E',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Creating…' : 'Create payment'}
        </button>
      </div>
    </form>
  );
}