'use client';

import { useMemo } from 'react';
// Re-export from the shared (server-safe) module so client components can
// keep importing these helpers from their existing path. The actual
// definitions live in src/lib/accountTypeMeta.ts so server components can
// import them too (TypeSectionCard was crashing with "Attempted to call
// getAccountTypeMeta() from the server but getAccountTypeMeta is on the
// client." because the original definitions lived in a 'use client' file).
export { ACCOUNT_TYPE_META, getAccountTypeMeta } from '@/lib/accountTypeMeta';
import { ACCOUNT_TYPE_META, getAccountTypeMeta } from '@/lib/accountTypeMeta';

interface AccountTypeBadgesProps {
  types: string[];
  primary?: string | null;
  size?: 'sm' | 'md';
}

/**
 * Renders account-type badges. Primary type is first, gold-bordered, no emoji de-emphasis.
 * Other types come after, sorted by display label.
 */
export default function AccountTypeBadges({ types, primary, size = 'sm' }: AccountTypeBadgesProps) {
  const ordered = useMemo(() => {
    const set = new Set(types);
    const rest = types.filter((t) => t !== primary);
    rest.sort((a, b) => getAccountTypeMeta(a).label.localeCompare(getAccountTypeMeta(b).label));
    return primary && set.has(primary) ? [primary, ...rest] : rest;
  }, [types, primary]);

  if (ordered.length === 0) return null;

  const fontSize = size === 'sm' ? 11 : 13;
  const padY = size === 'sm' ? '0.15rem' : '0.3rem';
  const padX = size === 'sm' ? '0.5rem' : '0.7rem';

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {ordered.map((t) => {
        const m = getAccountTypeMeta(t);
        const isPrimary = t === primary;
        return (
          <span
            key={t}
            title={m.label}
            data-account-type={t}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize,
              fontWeight: isPrimary ? 700 : 600,
              color: m.color,
              background: m.bg,
              border: isPrimary ? `1.5px solid ${m.color}` : `1px solid ${m.border}`,
              borderRadius: 999,
              padding: `${padY} ${padX}`,
              letterSpacing: '0.01em',
            }}
          >
            <span style={{ fontSize: fontSize + 1 }} aria-hidden>
              {m.emoji}
            </span>
            <span>{m.label}</span>
          </span>
        );
      })}
    </div>
  );
}
