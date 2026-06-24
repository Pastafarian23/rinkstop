import type { CSSProperties } from 'react';

export type EventKind = 'practice' | 'game' | 'tournament' | 'tryout' | 'meeting' | 'team_event';

const KIND_META: Record<EventKind, { label: string; emoji: string; color: string; bg: string }> = {
  practice:     { label: 'Practice',     emoji: '🏒', color: '#FFB81C', bg: 'rgba(255,184,28,0.12)' },
  game:         { label: 'Game',         emoji: '🏆', color: '#C8102E', bg: 'rgba(200,16,46,0.12)' },
  tournament:   { label: 'Tournament',   emoji: '🥇', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  tryout:       { label: 'Tryout',       emoji: '🔍', color: '#14b8a6', bg: 'rgba(20,184,166,0.12)' },
  meeting:      { label: 'Meeting',      emoji: '📋', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  team_event:   { label: 'Team event',   emoji: '🧢', color: '#e5e7eb', bg: 'rgba(255,255,255,0.06)' },
};

export default function EventKindBadge({
  kind,
  size = 'sm',
  extraLabel,
}: {
  kind: EventKind | string;
  size?: 'xs' | 'sm' | 'md';
  extraLabel?: string;
}) {
  const meta = KIND_META[kind as EventKind] || {
    label: kind,
    emoji: '📅',
    color: '#e5e7eb',
    bg: 'rgba(255,255,255,0.06)',
  };

  const sizeMap = {
    xs: { fontSize: 10, padding: '0.1rem 0.4rem' },
    sm: { fontSize: 11, padding: '0.15rem 0.55rem' },
    md: { fontSize: 13, padding: '0.25rem 0.7rem' },
  } as const;

  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: meta.color,
    background: meta.bg,
    border: `1px solid ${meta.color}40`,
    ...sizeMap[size],
  };

  return (
    <span style={style}>
      <span aria-hidden="true">{meta.emoji}</span>
      <span>{extraLabel ?? meta.label}</span>
    </span>
  );
}