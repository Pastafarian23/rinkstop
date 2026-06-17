'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TierBadge } from './TierBadge';
import { IdentityVerified } from './IdentityVerified';

interface ClaimedBy {
  claim_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  tier: string;
  is_founding_member: boolean;
  username: string | null;
  claimed_at: string;
  // Identity verification (added 2026-06-17, requires Phase 1 build to populate)
  identity_verified_at: string | null;
  identity_expires_at: string | null;
}

export function ClaimedBy({ entityType, entityId, entityName }: { entityType: 'rink' | 'team' | 'league' | 'player'; entityId: string; entityName: string }) {
  const [data, setData] = useState<ClaimedBy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/entities/${entityType}/${entityId}/claim`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json.claim);
      } catch {
        // Silent fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  if (loading || !data) return null;

  // Identity verification is the ONLY signal that earns a check on RinkStop.
  // Tier is shown as a text pill (Starter / Pro / Premium / Enterprise).
  // Tier alone is NOT a verification signal.
  const isIdentityVerified =
    !!data.identity_verified_at &&
    !!data.identity_expires_at &&
    new Date(data.identity_expires_at) > new Date();
  const displayName = data.display_name || 'Owner';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0.75rem 1rem',
        background: isIdentityVerified ? 'rgba(4,30,66,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isIdentityVerified ? 'rgba(4,30,66,0.3)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 8,
        marginTop: 12,
        marginBottom: 12,
      }}
    >
      {data.avatar_url ? (
        <img src={data.avatar_url} alt={displayName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#041E42', color: '#FFB81C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
          {displayName[0]?.toUpperCase() || '?'}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          Claimed by
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
          {data.username ? (
            <Link
              href={`/profile/${data.username}`}
              style={{ color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
            >
              {displayName}
            </Link>
          ) : (
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{displayName}</span>
          )}
          {isIdentityVerified && (
            <IdentityVerified
              size={14}
              verifiedAt={data.identity_verified_at ?? undefined}
              expiresAt={data.identity_expires_at ?? undefined}
            />
          )}
          <TierBadge tier={data.tier} size="xs" />
        </div>
      </div>
    </div>
  );
}
