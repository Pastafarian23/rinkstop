'use client';

import { useState } from 'react';
import type { TierName } from '@/lib/pricing';

export interface ClaimUpgradeButtonProps {
  tier: TierName;
  entity: string;
  entityId?: string;
  entityName: string;
  label: string;
}

/**
 * One-click upgrade button on /dashboard/claims.
 *
 * Calls POST /api/tier/upgrade with the entity context for resume.
 * On success, redirects to Stripe Checkout. On failure, shows the error
 * inline so the user doesn't lose their claim context.
 *
 * Audit fix 2026-08-11: Created as a separate client component so the
 * parent ClaimIntentPanel can stay a server component (no inline event
 * handlers, which would break RSC streaming).
 */
export function ClaimUpgradeButton({ tier, entity, entityId, entityName, label }: ClaimUpgradeButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);

    try {
      // Best-effort analytics beacon before checkout. Fire-and-forget so a
      // dropped network call can't block the checkout flow.
      try {
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(
            '/api/track',
            new Blob(
              [
                JSON.stringify({
                  name: 'claim_upgrade_started',
                  pathname: '/dashboard/claims',
                  props: {
                    from: 'claim_intent_panel',
                    tier,
                    entity,
                    entity_id: entityId ?? null,
                  },
                }),
              ],
              { type: 'application/json' }
            )
          );
        }
      } catch {
        // ignore
      }

      const res = await fetch('/api/tier/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          // Resume back to /dashboard/claims with the same entity context
          // so the user can finish the claim form after payment.
          original_pathname: typeof window !== 'undefined' ? window.location.pathname + window.location.search : null,
          entity,
          entity_id: entityId ?? null,
          entity_name: entityName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Federation = contact sales (no Stripe product). Redirect gracefully.
        if (res.status === 303 && data?.url) {
          window.location.href = data.url;
          return;
        }
        setError(data.error || `Checkout failed (${res.status})`);
        setBusy(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
    } else {
        setError('Checkout did not return a URL');
        setBusy(false);
      }
    } catch (err) {
      setError('Network error - please try again');
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: 280 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        data-testid="claim-upgrade-button"
        style={{
          background: busy ? 'rgba(255,184,28,0.5)' : '#FFB81C',
          color: '#0a0a0a',
          padding: '0.85rem 1.5rem',
          borderRadius: 8,
          border: 'none',
          fontWeight: 700,
          fontSize: '0.95rem',
          letterSpacing: '0.02em',
          cursor: busy ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {busy ? 'Loading checkout...' : label}
      </button>
      {error ? (
        <div
          style={{
            background: 'rgba(200,16,46,0.1)',
            border: '1px solid rgba(200,16,46,0.3)',
            color: '#FF6B7A',
            padding: '0.6rem 0.85rem',
            borderRadius: 6,
            fontSize: '0.8rem',
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}