import { supabaseAdmin } from './supabase';

/**
 * Bulk-load email preferences for a list of user IDs.
 * Returns a Map keyed by user_id with the email_* columns.
 */
export async function getEmailPreferences(userIds: string[]): Promise<Map<string, Record<string, boolean>>> {
  if (userIds.length === 0) return new Map();
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('user_id, email_team_news, email_team_results, email_team_schedule, email_connection_requests, email_dm_notifications, email_marketing')
    .in('user_id', userIds);

  const map = new Map<string, Record<string, boolean>>();
  for (const row of data || []) {
    map.set(row.user_id, {
      email_team_news: row.email_team_news !== false,
      email_team_results: row.email_team_results !== false,
      email_team_schedule: row.email_team_schedule !== false,
      email_connection_requests: row.email_connection_requests !== false,
      email_dm_notifications: row.email_dm_notifications !== false,
      email_marketing: row.email_marketing === true,
    });
  }
  return map;
}