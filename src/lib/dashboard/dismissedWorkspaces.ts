/**
 * Workspace dismiss — service layer
 *
 * 2026-07-22 (Arnel): added so users can hide workspaces they don't use
 * (e.g. a player who never coaches can dismiss the Coach workspace
 * without losing access if they later upgrade).
 *
 * Source of truth: public.profile_dismissed_workspaces table (one row
 * per (user, workspace)). See
 * supabase/migrations/2026-07-22_dismissed_workspaces.sql for schema,
 * RLS, and indexing.
 *
 * IMPORTANT — interaction with the "never hide locked features" rule:
 * Dismiss is opt-in and only filters workspaces the user has FULL ACCESS to.
 * Locked workspaces (unlocked=false OR fullyAvailable=false) ignore the
 * dismiss flag entirely and remain visible with the 🔒 + upgrade CTA.
 * The reasoning: locked workspaces are a deliberate product signal
 * ("here's what you can unlock"), and silently hiding them would defeat
 * that signal.
 *
 * Storage choice (vs profiles.dismissed_workspaces text[]):
 *   - dismissed_at powers "dismissed 3 days ago" UI and stale-dismiss prompts
 *   - reason (enum) gives product signal on which workspaces users find unhelpful
 *   - per-row RLS is cleaner than filtering a column array
 *   - indexed (profile_user_id) lookup is the same cost as reading a column
 *   - hot-path array cache can be added to profiles LATER if needed
 */

import { cache } from 'react';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { WorkspaceId } from './switchWorkspace';

// WorkspaceId is currently 'personal' | 'organization' | 'business' (3 values).
// The dismiss table uses text so future workspace ids don't require a migration.
// We type the field as WorkspaceId | string so reads/writes don't break if a new
// workspace id appears in the table before the TS union is updated.

export type DismissReason = 'not_relevant' | 'too_complex' | 'temporary' | 'other';

/**
 * One dismiss record. Mirrors the row in profile_dismissed_workspaces.
 */
export interface DismissedWorkspace {
  workspaceId: WorkspaceId | string;
  dismissedAt: string;       // ISO timestamp from DB
  reason: DismissReason | null;
}

/**
 * React-cached list of workspaces the current user has dismissed.
 *
 * Cached per request via React.cache() — multiple calls in the same render
 * tree share one Supabase round-trip. The dashboard layout calls this once
 * (or twice: once for "is X dismissed?" checks, once for the "Hidden
 * workspaces" footer).
 *
 * Returns an empty array if the user is unauthenticated, no rows exist, or
 * Supabase errors. Errors are logged but never throw — dashboard chrome
 * must never fail because of a dismiss query failure.
 */
export const getDismissedWorkspaces = cache(async (): Promise<DismissedWorkspace[]> => {
  try {
    const { userId } = await auth();
    if (!userId) return [];

    const { data, error } = await supabaseAdmin
      .from('profile_dismissed_workspaces')
      .select('workspace_id, dismissed_at, reason')
      .eq('profile_user_id', userId)
      .order('dismissed_at', { ascending: false });

    if (error) {
      console.error('[dismissedWorkspaces] getDismissedWorkspaces failed:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      workspaceId: row.workspace_id,
      dismissedAt: row.dismissed_at,
      reason: row.reason as DismissReason | null,
    }));
  } catch (err) {
    console.error('[dismissedWorkspaces] getDismissedWorkspaces threw:', err);
    return [];
  }
});

/**
 * Convenience: returns just the workspace IDs as a Set for O(1) lookup.
 * Use this in the dashboard layout's filter loop:
 *
 *   const dismissed = await getDismissedWorkspaceIds();
 *   const visible = wsAccess.filter(ws =>
 *     !dismissed.has(ws.workspace.id) || !ws.fullyAvailable
 *   );
 */
export const getDismissedWorkspaceIds = cache(async (): Promise<Set<string>> => {
  const list = await getDismissedWorkspaces();
  return new Set(list.map((d) => d.workspaceId));
});

/**
 * Dismiss a workspace for the current user.
 *
 * Idempotent — re-dismissing an already-dismissed workspace updates the
 * reason (and refreshes dismissed_at) without creating duplicate rows,
 * thanks to the UNIQUE (profile_user_id, workspace_id) constraint.
 *
 * Throws on auth failure (caller should catch and surface a user-friendly
 * error). Does NOT swallow Supabase errors other than auth — those bubble
 * up so the API route can return 500.
 */
export async function dismissWorkspace(
  workspaceId: string,
  reason: DismissReason | null = null,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const { error } = await supabaseAdmin
    .from('profile_dismissed_workspaces')
    .upsert(
      {
        profile_user_id: userId,
        workspace_id: workspaceId,
        reason,
        dismissed_at: new Date().toISOString(),
      },
      { onConflict: 'profile_user_id,workspace_id' },
    );

  if (error) throw error;
}

/**
 * Restore a single dismissed workspace for the current user.
 * No-op if the workspace isn't dismissed.
 */
export async function restoreWorkspace(workspaceId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const { error } = await supabaseAdmin
    .from('profile_dismissed_workspaces')
    .delete()
    .eq('profile_user_id', userId)
    .eq('workspace_id', workspaceId);

  if (error) throw error;
}

/**
 * Restore all dismissed workspaces for the current user (bulk).
 * Used by the "Show all workspaces" toggle in settings.
 */
export async function restoreAllWorkspaces(): Promise<number> {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabaseAdmin
    .from('profile_dismissed_workspaces')
    .delete()
    .eq('profile_user_id', userId)
    .select('id');

  if (error) throw error;
  return data?.length || 0;
}
