import { supabaseAdmin } from '@/lib/supabase';

interface FanoutArgs {
  team_id: string;
  actor_user_id: string;
  kind: 'news' | 'result' | 'schedule';
  entity_id: string;
  title: string;
  body?: string | null;
  payload?: Record<string, unknown>;
  // which notification type preference gates this
  pref: 'notify_news' | 'notify_results' | 'notify_schedule';
}

/**
 * Fan out a notification to all members of a team.
 *
 * - Skips the actor themselves (you don't notify yourself).
 * - Filters by the recipient's preference (notify_news/notify_results/notify_schedule).
 * - Best-effort: errors are swallowed and logged. Notifications must never
 *   block the post-write path.
 *
 * Used by /api/team/[slug]/posts after a successful published insert.
 */
export async function fanOutTeamNotification(args: FanoutArgs): Promise<number> {
  try {
    // Look up active members with their notify_* preference.
    const { data: members } = await supabaseAdmin
      .from('team_members')
      .select(`user_id, ${args.pref}`)
      .eq('team_id', args.team_id)
      .is('left_at', null);

    if (!members || members.length === 0) return 0;

    // Build the rows for everyone who opted in, excluding the actor.
    const rows = members
      .filter((m: any) => m.user_id !== args.actor_user_id && m[args.pref] === true)
      .map((m: any) => ({
        user_id: m.user_id,
        team_id: args.team_id,
        actor_user_id: args.actor_user_id,
        kind: args.kind,
        entity_id: args.entity_id,
        title: args.title,
        body: args.body ?? null,
        payload: args.payload ?? {},
      }));

    if (rows.length === 0) return 0;

    const { error } = await supabaseAdmin.from('team_notifications').insert(rows);
    if (error) {
      console.warn('[team-notifications] fanout insert failed:', error.message);
      return 0;
    }
    return rows.length;
  } catch (err) {
    console.warn('[team-notifications] fanout exception:', err);
    return 0;
  }
}