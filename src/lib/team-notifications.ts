import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from './email';

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

const PREF_TO_EMAIL_COL: Record<FanoutArgs['pref'], string> = {
  notify_news: 'email_team_news',
  notify_results: 'email_team_results',
  notify_schedule: 'email_team_schedule',
};

/**
 * Fan out an in-app notification to all members of a team.
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

/**
 * Fan out an EMAIL for the same notification. Companion to fanOutTeamNotification
 * — call both. This one is opt-in via the email_* columns on profiles.
 *
 * Skips the actor. Skips members without a profile email. Skips members who
 * turned the email off. Resolves a profile for each remaining user_id, then
 * fires a sendEmail (best-effort) in parallel.
 *
 * Returns the number of emails queued (or attempted — failures are logged
 * inside sendEmail).
 */
export async function fanOutTeamEmail(args: FanoutArgs): Promise<number> {
  try {
    const emailCol = PREF_TO_EMAIL_COL[args.pref];
    const teamId = args.team_id;
    const actor = args.actor_user_id;

    // 1. Get the team's slug + name (we need them for the template).
    const { data: team } = await supabaseAdmin
      .from('team_workspaces')
      .select('id, slug, name')
      .eq('id', teamId)
      .maybeSingle();
    if (!team) return 0;

    // 2. Get the actor's display name.
    const { data: actorProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, username')
      .eq('user_id', actor)
      .maybeSingle();
    const actorName =
      actorProfile?.display_name ||
      actorProfile?.username ||
      'A team admin';

    // 3. Find active members whose team-level notify_* is true.
    const { data: members } = await supabaseAdmin
      .from('team_members')
      .select(`user_id, ${args.pref}`)
      .eq('team_id', teamId)
      .is('left_at', null);

    if (!members || members.length === 0) return 0;

    const eligibleUserIds = members
      .filter((m: any) => m.user_id !== actor && m[args.pref] === true)
      .map((m: any) => m.user_id);
    if (eligibleUserIds.length === 0) return 0;

    // 4. Resolve each user's email + email_* preference.
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select(`user_id, email, display_name, username, ${emailCol}`)
      .in('user_id', eligibleUserIds);

    if (!profiles || profiles.length === 0) return 0;

    // COALESCE(NULL, true) — treat missing as opt-in (matches backfill default).
    const wants = (p: any) => p[emailCol] !== false;

    const recipients = profiles.filter((p: any) => p.email && wants(p));
    if (recipients.length === 0) return 0;

    // 5. Fire all sends in parallel. Each sendEmail is best-effort.
    await Promise.allSettled(
      recipients.map((p: any) =>
        sendEmail({
          to: p.email,
          subject: `${team.name}: ${args.title}`,
          template: 'team-post',
          data: {
            teamName: team.name,
            teamSlug: team.slug,
            postKind: args.kind,
            title: args.title,
            body: args.body ?? null,
            authorName: actorName,
          },
          tag: `team-${args.kind}`,
        }).then(() => undefined)
      )
    );

    return recipients.length;
  } catch (err) {
    console.warn('[team-notifications] email fanout exception:', err);
    return 0;
  }
}
