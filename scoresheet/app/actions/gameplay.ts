'use server';

/**
 * Server actions for live gameplay.
 *
 * Powers the scorekeeper view: start game, pause/resume, advance period,
 * record events (goal, assist, penalty, save, shot, etc.), finalize.
 *
 * Game lifecycle:
 *   scheduled  →  in_progress  (startGame)
 *   in_progress  →  in_progress  (pauseClock, resumeClock, advancePeriod, recordEvent)
 *   in_progress  →  final  (finalizeGame)
 *
 * All actions verify the user owns the game before writing. RLS also
 * enforces this, but we check at the app layer for clearer error messages.
 */

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Game = Database['public']['Tables']['games']['Row'];
type Event = Database['public']['Tables']['game_events']['Row'];

export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

async function loadGame(gameId: string): Promise<{ game: Game; userId: string } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Not signed in.' };
  const sb = getServerSupabase();
  if (!sb) return { error: 'Database unavailable.' };
  const { data, error } = await sb
    .from('games')
    .select('*')
    .eq('id', gameId)
    .maybeSingle();
  if (error || !data) return { error: 'Game not found.' };
  if ((data as Game).owner_user_id !== userId) return { error: 'Not your game.' };
  return { game: data as Game, userId };
}

/**
 * Transition a scheduled game to in_progress. Stamps started_at.
 * Idempotent: calling on an already-in_progress game is a no-op.
 */
export async function startGameAction(gameId: string): Promise<ActionResult> {
  const loaded = await loadGame(gameId);
  if ('error' in loaded) return { ok: false, error: loaded.error };
  const { game } = loaded;
  if (game.status === 'in_progress') return { ok: true };
  if (game.status !== 'scheduled') {
    return { ok: false, error: `Cannot start a ${game.status} game.` };
  }
  const sb = getServerSupabase()!;
  const { error } = await sb
    .from('games')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      current_period: 1,
      clock_seconds: 0,
      clock_running: false,
    })
    .eq('id', gameId);
  if (error) return { ok: false, error: 'Failed to start game.' };
  revalidatePath(`/scoresheet/${gameId}`);
  return { ok: true };
}

/**
 * Set clock_running. Use this for both pause and resume — the action
 * is just "toggle running state to the given value."
 */
export async function setClockAction(gameId: string, running: boolean): Promise<ActionResult> {
  const loaded = await loadGame(gameId);
  if ('error' in loaded) return { ok: false, error: loaded.error };
  const sb = getServerSupabase()!;
  const { error } = await sb.from('games').update({ clock_running: running }).eq('id', gameId);
  if (error) return { ok: false, error: 'Failed to update clock.' };
  revalidatePath(`/scoresheet/${gameId}`);
  return { ok: true };
}

/**
 * Set the current period (1-N). The scorekeeper view calls this when
 * "End period" is tapped. Also resets the clock to 0 and pauses.
 */
export async function setPeriodAction(gameId: string, period: number): Promise<ActionResult> {
  const loaded = await loadGame(gameId);
  if ('error' in loaded) return { ok: false, error: loaded.error };
  if (period < 1 || period > 6) return { ok: false, error: 'Period must be 1-6.' };
  const sb = getServerSupabase()!;
  const { error } = await sb
    .from('games')
    .update({ current_period: period, clock_seconds: 0, clock_running: false })
    .eq('id', gameId);
  if (error) return { ok: false, error: 'Failed to update period.' };
  revalidatePath(`/scoresheet/${gameId}`);
  return { ok: true };
}

/**
 * Record a play-by-play event. Updates the game score if applicable.
 *
 * The scorekeeper view passes a partial event; we fill in the rest
 * (period, clock_seconds, recorded_by, sequence_number) server-side.
 *
 * For goals, increments the team's score by 1.
 */
export interface RecordEventInput {
  team_side: 'home' | 'away';
  event_type: string;
  scorer_jersey?: number | null;
  primary_assist_jersey?: number | null;
  secondary_assist_jersey?: number | null;
  goalie_jersey?: number | null;
  strength?: string | null;
  shot_quality?: string | null;
  penalty_jersey?: number | null;
  penalty_type?: string | null;
  penalty_minutes?: number | null;
  shooter_jersey?: number | null;
  save_quality?: string | null;
  description?: string | null;
}

const SCORING_TYPES = new Set(['goal', 'shootout_goal']);

export async function recordEventAction(
  gameId: string,
  input: RecordEventInput
): Promise<ActionResult<{ eventId: string }>> {
  const loaded = await loadGame(gameId);
  if ('error' in loaded) return { ok: false, error: loaded.error };
  const { game, userId } = loaded;
  if (game.status !== 'in_progress') {
    return { ok: false, error: 'Game is not in progress.' };
  }
  const sb = getServerSupabase()!;

  // Sequence number: count existing events for this game, +1.
  const { count: existingCount } = await sb
    .from('game_events')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId);

  const eventInsert: Database['public']['Tables']['game_events']['Insert'] = {
    game_id: gameId,
    period: game.current_period,
    clock_seconds: game.clock_seconds,
    sequence_number: (existingCount || 0) + 1,
    team_side: input.team_side,
    event_type: input.event_type,
    scorer_jersey: input.scorer_jersey ?? null,
    primary_assist_jersey: input.primary_assist_jersey ?? null,
    secondary_assist_jersey: input.secondary_assist_jersey ?? null,
    goalie_jersey: input.goalie_jersey ?? null,
    strength: input.strength ?? null,
    shot_quality: input.shot_quality ?? null,
    penalty_jersey: input.penalty_jersey ?? null,
    penalty_type: input.penalty_type ?? null,
    penalty_minutes: input.penalty_minutes ?? null,
    shooter_jersey: input.shooter_jersey ?? null,
    save_quality: input.save_quality ?? null,
    description: input.description ?? null,
    recorded_by: userId,
  };

  const { data: inserted, error: insertError } = await sb
    .from('game_events')
    .insert(eventInsert)
    .select('id')
    .single();

  if (insertError || !inserted) {
    console.error('[recordEventAction] insert error:', insertError);
    return { ok: false, error: 'Failed to record event.' };
  }

  // Update the game score if this is a scoring event.
  if (SCORING_TYPES.has(input.event_type)) {
    const field = input.team_side === 'home' ? 'home_score' : 'away_score';
    const current = input.team_side === 'home' ? game.home_score : game.away_score;
    const { error: scoreError } = await sb
      .from('games')
      .update({ [field]: current + 1 })
      .eq('id', gameId);
    if (scoreError) {
      console.error('[recordEventAction] score update error:', scoreError);
      // Non-fatal: event was recorded, just the score didn't tick.
    }
  }

  revalidatePath(`/scoresheet/${gameId}`);
  return { ok: true, eventId: inserted.id };
}

/**
 * Undo the last recorded event. Removes the event row and decrements
 * the score if the event was a scoring event.
 *
 * "Last" is determined by the highest sequence_number for the game.
 */
export async function undoLastEventAction(
  gameId: string
): Promise<ActionResult<{ removedType: string | null }>> {
  const loaded = await loadGame(gameId);
  if ('error' in loaded) return { ok: false, error: loaded.error };
  const sb = getServerSupabase()!;

  // Fetch the most recent event.
  const { data: last, error: fetchError } = await sb
    .from('game_events')
    .select('*')
    .eq('game_id', gameId)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fetchError || !last) return { ok: false, error: 'No events to undo.' };
  const lastEvent = last as Event;

  // Delete it.
  const { error: deleteError } = await sb
    .from('game_events')
    .delete()
    .eq('id', lastEvent.id);
  if (deleteError) return { ok: false, error: 'Failed to remove event.' };

  // If it was a scoring event, decrement the score.
  if (SCORING_TYPES.has(lastEvent.event_type)) {
    const field = lastEvent.team_side === 'home' ? 'home_score' : 'away_score';
    const current = lastEvent.team_side === 'home' ? loaded.game.home_score : loaded.game.away_score;
    if (current > 0) {
      await sb.from('games').update({ [field]: current - 1 }).eq('id', gameId);
    }
  }

  revalidatePath(`/scoresheet/${gameId}`);
  return { ok: true, removedType: lastEvent.event_type };
}

/**
 * Finalize the game. Sets status to 'final', stops the clock, records
 * ended_at.
 */
export async function finalizeGameAction(gameId: string): Promise<ActionResult> {
  const loaded = await loadGame(gameId);
  if ('error' in loaded) return { ok: false, error: loaded.error };
  if (loaded.game.status === 'final') return { ok: true };
  if (loaded.game.status !== 'in_progress') {
    return { ok: false, error: 'Only in-progress games can be finalized.' };
  }
  const sb = getServerSupabase()!;
  const { error } = await sb
    .from('games')
    .update({
      status: 'final',
      clock_running: false,
      ended_at: new Date().toISOString(),
    })
    .eq('id', gameId);
  if (error) return { ok: false, error: 'Failed to finalize game.' };
  revalidatePath(`/scoresheet/${gameId}`);
  revalidatePath('/scoresheet');
  return { ok: true };
}
