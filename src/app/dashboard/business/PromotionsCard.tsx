'use client';

// Business dashboard: Promotions management card.
// Lets the user create, pause, and delete promotion codes for a listing.
// Requires Business Plus tier (gated server-side in the API; if the
// API returns 402, the card shows the upgrade prompt).

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Promotion {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  starts_at: string;
  ends_at: string;
  max_redemptions: number | null;
  redemption_count: number;
  is_active: boolean;
}

interface PromotionsCardProps {
  listingId: string;
  userTier: string;
}

export default function PromotionsCard({ listingId, userTier }: PromotionsCardProps) {
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const tierRank: Record<string, number> = { free: 0, business_listing: 1, business_plus: 2 };
  const hasPlus = (tierRank[userTier] ?? 0) >= 2;

  useEffect(() => {
    if (!hasPlus) return;
    let cancelled = false;
    (async () => {
      const r = await fetch(`/api/manage/business/promotions?listing_id=${listingId}`);
      if (cancelled) return;
      if (!r.ok) {
        setError(`Failed to load (${r.status})`);
        return;
      }
      const j = await r.json();
      setPromotions(j.promotions || []);
    })();
    return () => { cancelled = true; };
  }, [listingId, hasPlus]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const r = await fetch('/api/manage/business/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id: listingId,
        code,
        description: description || null,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        ends_at: endsAt ? new Date(endsAt).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        max_redemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : null,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error || `Failed (${r.status})`);
      setSubmitting(false);
      return;
    }
    setPromotions((prev) => (prev ? [j.promotion, ...prev] : [j.promotion]));
    setCode(''); setDescription(''); setDiscountValue(''); setEndsAt(''); setMaxRedemptions('');
    setShowForm(false);
    setSubmitting(false);
  }

  if (!hasPlus) {
    return (
      <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '1.1rem' }}>🎟️</span>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
            PROMOTIONS
          </h2>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0.25rem 0 0.75rem' }}>
          Create coupon codes for your customers. Requires Business Plus ($299/yr).
        </p>
        <Link
          href="/pricing?for=business"
          style={{ display: 'inline-block', background: '#C8102E', color: '#fff', padding: '0.5rem 0.875rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}
        >
          Upgrade to Business Plus →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>🎟️</span>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.15rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
            PROMOTIONS
          </h2>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#7DD3FC', padding: '0.375rem 0.75rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : '+ New promotion'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.875rem', marginBottom: '0.875rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.625rem' }}>
          <Field label="Code (e.g. SPRING20)">
            <input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} style={inp} placeholder="SPRING20" />
          </Field>
          <Field label="Discount type">
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')} style={inp}>
              <option value="percent">% off</option>
              <option value="fixed">$ off</option>
            </select>
          </Field>
          <Field label="Discount value">
            <input required type="number" min="0.01" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} style={inp} placeholder={discountType === 'percent' ? '20' : '10.00'} />
          </Field>
          <Field label="Expires at">
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} style={inp} />
          </Field>
          <Field label="Max redemptions (optional)">
            <input type="number" min="1" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} style={inp} placeholder="unlimited" />
          </Field>
          <Field label="Description (optional)">
            <input value={description} onChange={(e) => setDescription(e.target.value)} style={inp} placeholder="Spring sale" />
          </Field>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button type="submit" disabled={submitting} style={{ background: '#38BDF8', color: '#0F172A', border: 'none', borderRadius: 6, padding: '0.5rem 0.875rem', fontWeight: 600, fontSize: '0.85rem', cursor: submitting ? 'wait' : 'pointer' }}>
              {submitting ? 'Saving…' : 'Create promotion'}
            </button>
            {error && <span style={{ color: '#FF6B7A', fontSize: '0.8rem' }}>{error}</span>}
          </div>
        </form>
      )}

      {error && !showForm && <p style={{ color: '#FF6B7A', fontSize: '0.85rem' }}>{error}</p>}

      {promotions === null ? (
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Loading…</p>
      ) : promotions.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>No promotions yet. Create one above.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontSize: '0.7rem' }}>
              <th style={{ textAlign: 'left', padding: '0.4rem 0' }}>Code</th>
              <th style={{ textAlign: 'left' }}>Discount</th>
              <th style={{ textAlign: 'left' }}>Redemptions</th>
              <th style={{ textAlign: 'left' }}>Expires</th>
              <th style={{ textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((p) => {
              const expired = new Date(p.ends_at) < new Date();
              return (
                <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '0.5rem 0', color: '#fff', fontWeight: 600 }}>{p.code}</td>
                  <td style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {p.discount_type === 'percent' ? `${p.discount_value}% off` : `$${p.discount_value} off`}
                  </td>
                  <td style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {p.redemption_count}{p.max_redemptions ? ` / ${p.max_redemptions}` : ''}
                  </td>
                  <td style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {new Date(p.ends_at).toLocaleDateString()}
                  </td>
                  <td>
                    {expired ? <span style={{ color: '#888' }}>Expired</span>
                      : p.is_active ? <span style={{ color: '#86EFAC' }}>Active</span>
                      : <span style={{ color: '#FFB81C' }}>Paused</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const inp: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '0.4rem 0.6rem',
  color: '#fff',
  fontSize: '0.8rem',
  outline: 'none',
  width: '100%',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      {children}
    </label>
  );
}
