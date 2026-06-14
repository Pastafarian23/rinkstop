'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VerifiedCheckmark, TierBadge } from './TierBadge';

interface ClaimedBy {
  claim_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  tier: string;
  is_founding_member: boolean;
  username: string | null;
  claimed_at: string;
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

  const isVerified = data.tier === 'verified' || data.tier === 'pro';
  const displayName = data.display_name || 'Verified Owner';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0.75rem 1rem',
        background: isVerified ? 'rgba(20,184,166,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isVerified ? 'rgba(20,184,166,0.3)' : 'rgba(255,255,255,0.1)'}`,
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
          {isVerified && <VerifiedCheckmark size={14} />}
          <TierBadge tier={data.tier} size="xs" />
        </div>
      </div>
    </div>
  );
}
