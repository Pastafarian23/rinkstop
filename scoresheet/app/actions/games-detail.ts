'use server';

/**
 * Server actions for editing game-level metadata that wasn't captured
 * during the wizard: rink + sheet + coach details.
 *
 * These are intentionally separate from createGameAction so the wizard
 * can stay fast (3 clicks to start a game) and the scorekeeper can
 * fill in officials / rink / sheet after the fact.
 */

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase';

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

interface GameDetailsInput {
  venue_name?: string | null;
  rink_id?: string | null;
  sheet_label?: string | null;
  home_coach_name?: string | null;
  home_coach_rinkstop_id?: string | null;
  away_coach_name?: string | null;
  away_coach_rinkstop_id?: string | null;
  home_team_rinkstop_id?: string | null;
  away_team_rinkstop_id?: string | null;
}

export async function updateGameDetailsAction(
  gameId: string,
  input: GameDetailsInput
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Not signed in.' };
  const sb = getServerSupabase();
  if (!sb) return { ok: false, error: 'Database unavailable.' };

  // Verify ownership.
  const { data: game, error: gameError } = await sb
    .from('games')
    .select('id, owner_user_id')
    .eq('id', gameId)
    .maybeSingle();
  if (gameError || !game) return { ok: false, error: 'Game not found.' };
  if ((game as any).owner_user_id !== userId) return { ok: false, error: 'Not your game.' };

  const update: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) update[k] = v;
  }
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await sb.from('games').update(update).eq('id', gameId);
  if (error) {
    console.error('[updateGameDetailsAction]', error);
    return { ok: false, error: 'Failed to update game details.' };
  }
  revalidatePath(`/scoresheet/${gameId}`);
  return { ok: true };
}
