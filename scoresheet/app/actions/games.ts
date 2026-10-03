'use server';

/**
 * Server actions for the game creation wizard.
 *
 * Each action is a thin wrapper around a Supabase write. All actions:
 *   - Verify the user is signed in via Clerk
 *   - Use the service-role Supabase client (RLS bypass)
 *   - Enforce ownership/permission checks at the application layer
 *   - Return a discriminated union: { ok: true, ... } | { ok: false, error }
 *
 * The wizard pages call these from client components via useTransition.
 */

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase';
import type { GameMode, GameType, TeamSource } from '@/types/scoresheet';

export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

interface CreateGameInput {
  mode: GameMode;
  home_team_name: string;
  home_team_color: string;
  home_team_source: TeamSource;
  home_team_rinkstop_id: string | null;
  away_team_name: string;
  away_team_color: string;
  away_team_source: TeamSource;
  away_team_rinkstop_id: string | null;
  venue_name: string | null;
  scheduled_at: string | null;
  game_type: GameType;
}

/**
 * Step 1: Create a draft game. Returns the game id for redirecting to
 * the next step.
 */
export async function createGameAction(
  input: CreateGameInput
): Promise<ActionResult<{ gameId: string }>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Not signed in.' };

  const sb = getServerSupabase();
  if (!sb) return { ok: false, error: 'Database unavailable.' };

  // For live mode: stay in 'draft' until the roster step completes.
  // For watch mode: jump to 'scheduled' so it shows up in the dashboard
  // ready-to-track.
  const initialStatus = input.mode === 'watch' ? 'scheduled' : 'draft';

  const { data, error } = await sb
    .from('games')
    .insert({
      owner_user_id: userId,
      mode: input.mode,
      status: initialStatus,
      home_team_name: input.home_team_name,
      home_team_color: input.home_team_color,
      home_team_source: input.home_team_source,
      home_team_rinkstop_id: input.home_team_rinkstop_id,
      home_roster: null,
      away_team_name: input.away_team_name,
      away_team_color: input.away_team_color,
      away_team_source: input.away_team_source,
      away_team_rinkstop_id: input.away_team_rinkstop_id,
      away_roster: null,
      venue_name: input.venue_name,
      scheduled_at: input.scheduled_at,
      game_type: input.game_type,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[createGameAction]', error);
    return { ok: false, error: 'Failed to create game. Please try again.' };
  }
  revalidatePath('/scoresheet');
  return { ok: true, gameId: data.id };
}

/**
 * Step 2: Save the roster for a draft game. The roster is stored as
 * a JSONB array of player entries.
 */
export async function saveRosterAction(
  gameId: string,
  homeRoster: any[],
  awayRoster: any[]
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Not signed in.' };
  const sb = getServerSupabase();
  if (!sb) return { ok: false, error: 'Database unavailable.' };

  // Verify ownership before write.
  const { data: game, error: gameError } = await sb
    .from('games')
    .select('id, owner_user_id, status')
    .eq('id', gameId)
    .maybeSingle();
  if (gameError || !game) return { ok: false, error: 'Game not found.' };
  if (game.owner_user_id !== userId) return { ok: false, error: 'Not your game.' };

  const { error } = await sb
    .from('games')
    .update({ home_roster: homeRoster, away_roster: awayRoster })
    .eq('id', gameId);

  if (error) {
    console.error('[saveRosterAction]', error);
    return { ok: false, error: 'Failed to save roster.' };
  }
  revalidatePath(`/scoresheet/${gameId}`);
  return { ok: true };
}

/**
 * Step 3: Save settings (period length, OT rules, etc.) and transition
 * a draft game to 'scheduled' so it shows in the dashboard.
 */
export async function saveSettingsAction(
  gameId: string,
  settings: {
    period_length_seconds: number;
    periods_total: number;
    overtime_length_seconds: number;
    shootout_enabled: boolean;
  }
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Not signed in.' };
  const sb = getServerSupabase();
  if (!sb) return { ok: false, error: 'Database unavailable.' };

  const { data: game, error: gameError } = await sb
    .from('games')
    .select('id, owner_user_id, status, mode')
    .eq('id', gameId)
    .maybeSingle();
  if (gameError || !game) return { ok: false, error: 'Game not found.' };
  if (game.owner_user_id !== userId) return { ok: false, error: 'Not your game.' };

  // For live mode: after settings, the game moves to 'scheduled' so
  // it shows on the dashboard ready to be started.
  // For watch mode: stays 'scheduled' (already there from step 1).
  const newStatus = game.status === 'draft' ? 'scheduled' : game.status;

  const { error } = await sb
    .from('games')
    .update({ ...settings, status: newStatus })
    .eq('id', gameId);

  if (error) {
    console.error('[saveSettingsAction]', error);
    return { ok: false, error: 'Failed to save settings.' };
  }
  revalidatePath('/scoresheet');
  revalidatePath(`/scoresheet/${gameId}`);
  return { ok: true };
}
