'use client';

import { useMemo } from 'react';

// Display-friendly labels for the DB enum. Keep in sync with AccountTypePicker.tsx.
export const ACCOUNT_TYPE_META: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  player:        { label: 'Player',        emoji: '🏒', color: '#14B8A6', bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.35)' },
  parent:        { label: 'Parent',        emoji: '👨‍👧', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)' },
  coach:         { label: 'Coach',         emoji: '🥅', color: '#FFB81C', bg: 'rgba(255,184,28,0.12)',  border: 'rgba(255,184,28,0.35)' },
  scout:         { label: 'Scout',         emoji: '🔍', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.35)' },
  referee:       { label: 'Referee',       emoji: '🟥🟨', color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)' },
  team_admin:    { label: 'Team Admin',    emoji: '📋', color: '#34D399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.35)' },
  league_admin:  { label: 'League Admin',  emoji: '🏆', color: '#C084FC', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.35)' },
  rink_operator: { label: 'Rink Operator', emoji: '🏟️', color: '#FB923C', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)' },
  business:      { label: 'Business',      emoji: '🛍️', color: '#F472B6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.35)' },
  fan:           { label: 'Fan',           emoji: '🎟️', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)' },
};

export function getAccountTypeMeta(value: string) {
  return ACCOUNT_TYPE_META[value] || { label: value, emoji: '•', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)' };
}

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

  const fontSize = size === 'md' ? '0.8rem' : '0.7rem';
  const padding = size === 'md' ? '0.25rem 0.65rem' : '0.15rem 0.5rem';
  const emojiSize = size === 'md' ? '0.95rem' : '0.85rem';

  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
      {ordered.map((t) => {
        const m = getAccountTypeMeta(t);
        const isPrimary = t === primary;
        return (
          <span
            key={t}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding,
              fontSize,
              fontWeight: isPrimary ? 700 : 500,
              letterSpacing: '0.02em',
              borderRadius: 999,
              background: m.bg,
              color: m.color,
              border: isPrimary ? `1.5px solid ${m.color}` : `1px solid ${m.border}`,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: emojiSize }}>{m.emoji}</span>
            <span>{m.label}</span>
            {isPrimary && (
              <span style={{ fontSize: '0.55rem', opacity: 0.8, marginLeft: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                · Primary
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
