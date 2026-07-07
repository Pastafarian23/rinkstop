/**
 * Timeline builder — Phase 1b-2 (Player Achievements + Career Timeline)
 *
 * Pure function that builds a player's career timeline by joining existing
 * data sources. No persistence in v1 (computed on read).
 *
 * Sources (5):
 *   1. team_members.joined_at  → "Joined Team {name}"
 *   2. team_members.left_at    → "Left Team {name}"
 *   3. profiles.identity_verified_at → "Identity Verified" (caller's profile)
 *   4. player_documents.created_at   → "Uploaded {category_label}: {title}"
 *   5. player_achievements.achieved_at → "{title}" (parent-entered)
 *
 * The result is sorted by date desc.
 */

import { supabaseAdmin } from '@/lib/supabase';

export type TimelineEventType =
  | 'joined_team'
  | 'left_team'
  | 'identity_verified'
  | 'document_uploaded'
  | 'achievement_granted';

export interface TimelineEvent {
  type: TimelineEventType;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  body?: string;
  metadata: Record<string, unknown>;
}

const DOC_CATEGORY_LABEL: Record<string, string> = {
  birth_certificate: 'Birth Certificate',
  waiver: 'Waiver',
  medical_form: 'Medical Form',
  vaccination_record: 'Vaccination Record',
  proof_of_residence: 'Proof of Residence',
  photo_id: 'Photo ID',
  other: 'Other',
};

/**
 * Build the timeline for a single player.
 * Pass `managerUserId` (the parent's Clerk user_id) so we can read
 * `profiles.identity_verified_at` for the parent's own verification status
 * (which is what the parent sees as their own verified event).
 */
export async function buildTimeline(
  playerId: string,
  managerUserId: string
): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  // 1 + 2. Team memberships
  const membershipsRes = await supabaseAdmin
    .from('team_members')
    .select('id, joined_at, left_at, team_id, teams!inner(name)')
    .eq('player_id', playerId)
    .not('joined_at', 'is', null);

  const memberships = (membershipsRes.data || []) as Array<{
    id: string;
    joined_at: string;
    left_at: string | null;
    team_id: string;
    teams: { name: string } | { name: string }[] | null;
  }>;

  for (const m of memberships) {
    const teamName = Array.isArray(m.teams) ? m.teams[0]?.name : m.teams?.name;
    const name = teamName || 'a team';
    events.push({
      type: 'joined_team',
      date: m.joined_at.slice(0, 10),
      title: `Joined Team ${name}`,
      metadata: { team_id: m.team_id, membership_id: m.id, team_name: name },
    });
    if (m.left_at) {
      events.push({
        type: 'left_team',
        date: m.left_at.slice(0, 10),
        title: `Left Team ${name}`,
        metadata: { team_id: m.team_id, membership_id: m.id, team_name: name },
      });
    }
  }

  // 3. Identity verified (parent's own profile)
  const profileRes = await supabaseAdmin
    .from('profiles')
    .select('identity_verified_at')
    .eq('user_id', managerUserId)
    .maybeSingle();
  if (profileRes.data?.identity_verified_at) {
    events.push({
      type: 'identity_verified',
      date: profileRes.data.identity_verified_at.slice(0, 10),
      title: 'Identity Verified',
      body: 'You verified your identity on RinkStop.',
      metadata: {},
    });
  }

  // 4. Player documents (active + archived, exclude expires_at null)
  const docsRes = await supabaseAdmin
    .from('player_documents')
    .select('id, category, title, created_at')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });
  for (const d of (docsRes.data || []) as Array<{
    id: string;
    category: string;
    title: string;
    created_at: string;
  }>) {
    const label = DOC_CATEGORY_LABEL[d.category] || d.category;
    events.push({
      type: 'document_uploaded',
      date: d.created_at.slice(0, 10),
      title: `Uploaded ${label}: ${d.title}`,
      metadata: { document_id: d.id, category: d.category },
    });
  }

  // 5. Player achievements
  const achRes = await supabaseAdmin
    .from('player_achievements')
    .select('id, title, category, achieved_at, description')
    .eq('player_id', playerId)
    .order('achieved_at', { ascending: false });
  for (const a of (achRes.data || []) as Array<{
    id: string;
    title: string;
    category: string;
    achieved_at: string;
    description: string | null;
  }>) {
    events.push({
      type: 'achievement_granted',
      date: a.achieved_at,
      title: a.title,
      body: a.description || undefined,
      metadata: { achievement_id: a.id, category: a.category },
    });
  }

  // Sort by date desc, ties broken by type (achievements before teams before docs)
  const typeOrder: Record<TimelineEventType, number> = {
    achievement_granted: 0,
    identity_verified: 1,
    joined_team: 2,
    left_team: 3,
    document_uploaded: 4,
  };
  events.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return typeOrder[a.type] - typeOrder[b.type];
  });

  return events;
}

export const TIMELINE_EVENT_ICONS: Record<TimelineEventType, string> = {
  joined_team: '🏒',
  left_team: '👋',
  identity_verified: '✅',
  document_uploaded: '📄',
  achievement_granted: '🏅',
};
