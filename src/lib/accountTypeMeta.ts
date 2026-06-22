// Account type metadata — display-friendly labels and colors for the 10
// account types. Used by both server components (TypeSectionCard) and
// client components (AccountTypeBadges, UserMenu).
//
// IMPORTANT: This file MUST NOT have 'use client'. The `getAccountTypeMeta`
// helper was previously exported from a `'use client'` file (AccountTypeBadges.tsx),
// which made it impossible to call from server components. Next.js threw
// "Attempted to call getAccountTypeMeta() from the server but
// getAccountTypeMeta is on the client." See commit history for context.

export interface AccountTypeMeta {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
}

export const ACCOUNT_TYPE_META: Record<string, AccountTypeMeta> = {
  player:        { label: 'Player',        emoji: '🏒', color: '#14B8A6', bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.35)' },
  parent:        { label: 'Parent',        emoji: '👨👧', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)' },
  coach:         { label: 'Coach',         emoji: '🥅', color: '#FFB81C', bg: 'rgba(255,184,28,0.12)',  border: 'rgba(255,184,28,0.35)' },
  scout:         { label: 'Scout',         emoji: '🔍', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.35)' },
  referee:       { label: 'Referee',       emoji: '🟥🟨', color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)' },
  team_admin:    { label: 'Team Admin',    emoji: '📋', color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)' },
  league_admin:  { label: 'League Admin',  emoji: '🏆', color: '#C084FC', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.35)' },
  rink_operator: { label: 'Rink Operator', emoji: '🏟️', color: '#FB923C', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.35)' },
  business:      { label: 'Business',      emoji: '🛍️', color: '#F472B6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.35)' },
  fan:           { label: 'Fan',           emoji: '🎟️', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)' },
};

export function getAccountTypeMeta(value: string): AccountTypeMeta {
  return ACCOUNT_TYPE_META[value] || { label: value, emoji: '•', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)' };
}
