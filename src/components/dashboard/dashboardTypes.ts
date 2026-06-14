// Single source of truth for the 10 account types used across the dashboard.
// Keep values in sync with the Postgres account_type_enum in
// supabase/migrations/2026-06-13-multi-account-type.sql

export const ACCOUNT_TYPES = [
  'player',
  'parent',
  'coach',
  'scout',
  'referee',
  'team_admin',
  'league_admin',
  'rink_operator',
  'business',
  'fan',
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function isAccountType(v: string): v is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(v);
}
