'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase';

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function addFavoriteAction(
  teamName: string,
  teamColor: string | null
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Not signed in.' };
  const sb = getServerSupabase();
  if (!sb) return { ok: false, error: 'Database unavailable.' };
  const name = teamName.trim();
  if (!name) return { ok: false, error: 'Team name is required.' };

  const { error } = await sb.from('user_favorite_teams').insert({
    user_id: userId,
    team_name: name,
    team_color: teamColor,
  });
  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'You already have that team in your favorites.' };
    }
    return { ok: false, error: 'Failed to add favorite.' };
  }
  revalidatePath('/favorites');
  revalidatePath('/scoresheet');
  return { ok: true };
}

export async function removeFavoriteAction(teamName: string): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Not signed in.' };
  const sb = getServerSupabase();
  if (!sb) return { ok: false, error: 'Database unavailable.' };

  const { error } = await sb
    .from('user_favorite_teams')
    .delete()
    .eq('user_id', userId)
    .eq('team_name', teamName);
  if (error) return { ok: false, error: 'Failed to remove favorite.' };
  revalidatePath('/favorites');
  revalidatePath('/scoresheet');
  return { ok: true };
}
