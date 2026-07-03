/**
 * Shared helper for the workspace switcher (Step 5).
 *
 * Used by UserMenu and MobileMenu to write the active workspace to
 * localStorage. Pattern mirrors the existing switchRole() helper in
 * UserMenu.tsx:58 — write to localStorage, then reload so RoleAwareTabBar
 * and the workspace hub re-read on next render.
 *
 * Storage key: `rinkstop_active_workspace` (parallel to the existing
 * `rinkstop_active_role` key, not a replacement).
 */

import { WORKSPACES } from './workspaces';

const ACTIVE_WORKSPACE_KEY = 'rinkstop_active_workspace';
const ACTIVE_ROLE_KEY = 'rinkstop_active_role';

/** All valid workspace IDs (typed) */
export type WorkspaceId = 'personal' | 'organization' | 'business';

/**
 * Switch the active workspace. Writes to localStorage and reloads the page
 * so RoleAwareTabBar + WorkspaceHub re-render with the new value.
 *
 * Safe to call on both client and SSR (no-ops on SSR).
 */
export function switchWorkspace(workspaceId: WorkspaceId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
  } catch {
    /* noop — localStorage blocked */
  }
  // Reload so RoleAwareTabBar (which reads on mount) and WorkspaceHub
  // re-render with the new value. Matches the existing switchRole pattern.
  window.location.reload();
}

/**
 * Get the active workspace from localStorage. Returns null if not set or
 * if the value isn't a valid workspace id.
 *
 * Safe on SSR (returns null).
 */
export function getActiveWorkspace(): WorkspaceId | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    if (saved === 'personal' || saved === 'organization' || saved === 'business') {
      return saved;
    }
  } catch {
    /* noop */
  }
  return null;
}

/**
 * Map an account type to its workspace ID.
 * Personal account types all map to 'personal'. Organization roles map to
 * 'organization'. Business roles map to 'business'.
 *
 * Used for the migration: when reading legacy rinkstop_active_role, derive
 * the workspace from the role.
 */
export function accountTypeToWorkspace(accountType: string): WorkspaceId | null {
  const ws = WORKSPACES.find((w) =>
    w.requiredAccountTypes.includes(accountType),
  );
  if (ws) return ws.id;
  // Personal types (player/parent/scout/fan) have requiredAccountTypes=[]
  // so we need to check explicitly.
  const personalTypes = ['player', 'parent', 'scout', 'fan'];
  if (personalTypes.includes(accountType)) return 'personal';
  return null;
}

/**
 * Migrate from legacy rinkstop_active_role to rinkstop_active_workspace.
 * Idempotent — only writes if workspace key is not already set.
 *
 * Returns the resolved workspace (either the existing one or the migrated
 * one) so callers can use it for highlighting.
 */
export function migrateActiveRoleToWorkspace(): WorkspaceId | null {
  if (typeof window === 'undefined') return null;
  const existing = getActiveWorkspace();
  if (existing) return existing;

  let legacyRole: string | null = null;
  try {
    legacyRole = window.localStorage.getItem(ACTIVE_ROLE_KEY);
  } catch {
    /* noop */
  }
  if (!legacyRole) return null;

  const derived = accountTypeToWorkspace(legacyRole);
  if (derived) {
    try {
      window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, derived);
    } catch {
      /* noop */
    }
  }
  return derived;
}