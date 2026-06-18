/**
 * Team workspace helpers.
 *
 * Pure functions — no DB calls, no React.
 * Used by both server components and client components for team hub rendering.
 */

export const TEAM_ROLES = [
  'head_coach',
  'assistant_coach',
  'goalie_coach',
  'skills_coach',
  'manager',
  'team_staff',
  'president',
  'vice_president',
  'secretary',
  'treasurer',
  'board_member',
  'safety_officer',
  'player',
  'goalie',
  'alternate_player',
  'parent_rep',
] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

export const AGE_CATEGORIES = ['youth', 'adult', 'mixed'] as const;
export type AgeCategory = (typeof AGE_CATEGORIES)[number];

const ROLE_LABEL: Record<TeamRole, string> = {
  head_coach: 'Head Coach',
  assistant_coach: 'Assistant Coach',
  goalie_coach: 'Goalie Coach',
  skills_coach: 'Skills Coach',
  manager: 'Manager',
  team_staff: 'Team Staff',
  president: 'President',
  vice_president: 'Vice President',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  board_member: 'Board Member',
  safety_officer: 'Safety Officer',
  player: 'Player',
  goalie: 'Goalie',
  alternate_player: 'Alternate Player',
  parent_rep: 'Parent Rep',
};

const ROLE_COLOR: Record<TeamRole, { bg: string; text: string; border: string }> = {
  head_coach: { bg: 'rgba(255,184,28,0.12)', text: '#FFB81C', border: 'rgba(255,184,28,0.4)' },
  assistant_coach: { bg: 'rgba(255,184,28,0.08)', text: 'rgba(255,184,28,0.85)', border: 'rgba(255,184,28,0.3)' },
  goalie_coach: { bg: 'rgba(255,184,28,0.08)', text: 'rgba(255,184,28,0.85)', border: 'rgba(255,184,28,0.3)' },
  skills_coach: { bg: 'rgba(255,184,28,0.08)', text: 'rgba(255,184,28,0.85)', border: 'rgba(255,184,28,0.3)' },
  manager: { bg: 'rgba(20,184,166,0.12)', text: '#14B8A6', border: 'rgba(20,184,166,0.4)' },
  team_staff: { bg: 'rgba(20,184,166,0.08)', text: 'rgba(20,184,166,0.85)', border: 'rgba(20,184,166,0.3)' },
  president: { bg: 'rgba(99,102,241,0.12)', text: '#818CF8', border: 'rgba(99,102,241,0.4)' },
  vice_president: { bg: 'rgba(99,102,241,0.08)', text: 'rgba(129,140,248,0.85)', border: 'rgba(99,102,241,0.3)' },
  secretary: { bg: 'rgba(99,102,241,0.08)', text: 'rgba(129,140,248,0.85)', border: 'rgba(99,102,241,0.3)' },
  treasurer: { bg: 'rgba(99,102,241,0.08)', text: 'rgba(129,140,248,0.85)', border: 'rgba(99,102,241,0.3)' },
  board_member: { bg: 'rgba(99,102,241,0.06)', text: 'rgba(129,140,248,0.75)', border: 'rgba(99,102,241,0.25)' },
  safety_officer: { bg: 'rgba(239,68,68,0.10)', text: '#F87171', border: 'rgba(239,68,68,0.3)' },
  player: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.75)', border: 'rgba(255,255,255,0.15)' },
  goalie: { bg: 'rgba(168,85,247,0.10)', text: '#C084FC', border: 'rgba(168,85,247,0.3)' },
  alternate_player: { bg: 'rgba(255,255,255,0.04)', text: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.12)' },
  parent_rep: { bg: 'rgba(236,72,153,0.10)', text: '#F472B6', border: 'rgba(236,72,153,0.3)' },
};

export function formatRole(role: string): string {
  return ROLE_LABEL[role as TeamRole] ?? role;
}

export function roleColor(role: string): { bg: string; text: string; border: string } {
  return ROLE_COLOR[role as TeamRole] ?? ROLE_COLOR.player;
}

export function isAdminRole(role: string): boolean {
  return [
    'head_coach',
    'manager',
    'president',
    'vice_president',
    'secretary',
  ].includes(role);
}

/**
 * Country code (ISO 3166-1 alpha-2) to flag emoji.
 * Uses Unicode regional indicator symbols.
 */
const COUNTRY_FLAG: Record<string, string> = {
  PH: '🇵🇭', US: '🇺🇸', CA: '🇨🇦', GB: '🇬🇧', AU: '🇦🇺',
  DE: '🇩🇪', FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸', NL: '🇳🇱',
  SE: '🇸🇪', FI: '🇫🇮', NO: '🇳🇴', DK: '🇩🇰', CH: '🇨🇭',
  AT: '🇦🇹', BE: '🇧🇪', IE: '🇮🇪', PT: '🇵🇹', PL: '🇵🇱',
  CZ: '🇨🇿', SK: '🇸🇰', HU: '🇭🇺', RO: '🇷🇴', BG: '🇧🇬',
  GR: '🇬🇷', TR: '🇹🇷', RU: '🇷🇺', UA: '🇺🇦', JP: '🇯🇵',
  KR: '🇰🇷', CN: '🇨🇳', HK: '🇭🇰', TW: '🇹🇼', SG: '🇸🇬',
  MY: '🇲🇾', TH: '🇹🇭', VN: '🇻🇳', ID: '🇮🇩', IN: '🇮🇳',
  PK: '🇵🇰', BD: '🇧🇩', LK: '🇱🇰', NZ: '🇳🇿', MX: '🇲🇽',
  BR: '🇧🇷', AR: '🇦🇷', CL: '🇨🇱', CO: '🇨🇴', PE: '🇵🇪',
  ZA: '🇿🇦', EG: '🇪🇬', NG: '🇳🇬', KE: '🇰🇪', MA: '🇲🇦',
  AE: '🇦🇪', SA: '🇸🇦', IL: '🇮🇱', QA: '🇶🇦', KW: '🇰🇼',
};

export function countryFlag(code: string | null | undefined): string {
  if (!code) return '🏳️';
  return COUNTRY_FLAG[code.toUpperCase()] ?? '🏳️';
}

export function formatAgeCategory(cat: string): string {
  switch (cat) {
    case 'youth':
      return 'Youth';
    case 'adult':
      return 'Adult';
    case 'mixed':
      return 'Mixed (youth + adult)';
    default:
      return cat;
  }
}

/**
 * Generate a slug from a team name. Lowercase, replace non-alphanumerics with
 * hyphens, collapse hyphens, trim. Used to auto-suggest slugs in the form.
 */
export function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}
