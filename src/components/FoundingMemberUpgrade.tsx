'use client';

// DEPRECATED 2026-06-12 — replaced by /pricing and /api/tier/upgrade.
// Kept as a thin redirect shim so old imports don't 404 during the deprecation window.

import { useState } from 'react';

export function FoundingMemberUpgrade({ entityId, entityType }: { entityId: string; entityType: string }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    // The 8-entity founding member program has been consolidated into 3 tiers.
    // Direct the user to the new pricing page where they can pick the right tier.
    window.location.href = '/pricing';
  };

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      style={{
        padding: '0.75rem 1.25rem',
        background: '#C8102E',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        fontSize: '0.875rem',
        fontWeight: 700,
        cursor: loading ? 'wait' : 'pointer',
      }}
    >
      {loading ? 'Loading…' : 'See pricing'}
    </button>
  );
}
