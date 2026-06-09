'use client';

import { useState } from 'react';

interface Props {
  hasStripeCustomer: boolean;
  hasStripeSubscription: boolean;
  initialTier: string;
}

/**
 * ManageSubscriptionClient
 *
 * Provides a "Manage in Stripe" button that opens the Stripe Customer Portal
 * for billing history, payment method, and invoice PDFs.
 *
 * INTENTIONAL: There is no "Cancel subscription" button here.
 * To change or cancel a paid plan, users must contact support@rinkstop.com.
 * This is a founder-friendly design decision — easy billing history,
 * friction on cancel/downgrade so we can hear what we could do better.
 *
 * The Stripe Customer Portal must be configured (in the Stripe Dashboard)
 * to disable the "Cancel subscription" flow. See /api/billing/portal/route.ts.
 */
export default function ManageSubscriptionClient({ hasStripeCustomer, initialTier }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await r.json();
      if (!r.ok) {
        throw new Error(data.error || data.message || 'Could not open billing portal');
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong opening the billing portal.');
      setLoading(false);
    }
  }

  if (!hasStripeCustomer && initialTier === 'free') {
    // Free user with no Stripe history — no portal to show
    return null;
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '1.25rem 1.5rem',
      marginBottom: '1rem',
    }}>
      <h3 style={{
        color: '#fff', fontSize: '0.95rem', fontWeight: 700,
        margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        Billing & Invoices
      </h3>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
        View and download invoices, update your payment method, and check your billing history.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={openPortal}
          disabled={loading}
          style={{
            background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
            color: '#fff',
            padding: '0.7rem 1.1rem',
            borderRadius: 6,
            fontSize: '0.85rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Opening Stripe…' : 'Manage in Stripe →'}
        </button>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
          Opens Stripe&apos;s secure billing portal
        </span>
      </div>

      {error && (
        <p style={{ color: '#C8102E', fontSize: '0.85rem', margin: '0.75rem 0 0' }}>
          {error}
        </p>
      )}

      <p style={{
        color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', margin: '1rem 0 0',
        paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)',
        lineHeight: 1.5,
      }}>
        To change or cancel your plan, email <a href="mailto:support@rinkstop.com" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'underline' }}>support@rinkstop.com</a>.
        We respond within 24 hours.
      </p>
    </div>
  );
}
