/**
 * Notification deriver — Phase 1b-4 (Consumer Notifications)
 *
 * Pure function: takes a userId and their linked player IDs, returns
 * notification-shaped rows derived from source tables. The route INSERTs
 * these rows with onConflictDoNothing (UNIQUE constraint ensures dedup).
 *
 * Sources (4 in v1):
 *   1. player_documents.expires_at → document_expiring_* / document_expired
 *   2. profiles.identity_verified_at → identity_renewal_due (after 730 days — matches
 *      the 'Verification renewal every two years' claim on /pricing)
 *   3. (achievement_added — feature-flagged; 1b-2 source is fully wired in route)
 *
 * Cost: ~10ms per `/dashboard` page load. Reads are O(player-scoped) and small.
 *
 * WS14 PR1 (2026-07-31): onboarding kinds (signup_welcome, identity_verify_recommended,
 * wizard_incomplete, claim_paid_tier_unlocked, profile_first_visitor) are NOT derived by
 * this function — they are emitted by their respective call sites (signup hook, tier
 * gate, cron, claim-approval, profile page). This deriver remains idempotent + safe
 * for re-derivation (DELETE-then-INSERT pattern in the route). Onboarding kinds are
 * not picked up here because they're meant to be one-shot with explicit snooze_until,
 * not state-derived.
 */

import { supabaseAdmin } from '@/lib/supabase';

export type ConsumerNotificationKind =
  | 'document_expiring_30d'
  | 'document_expiring_7d'
  | 'document_expiring_1d'
  | 'document_expired'
  | 'identity_renewal_due'
  | 'achievement_added'
  | 'stamp_received';

export interface NewNotification {
  user_id: string;
  kind: ConsumerNotificationKind;
  source_key: string;
  player_id: string | null;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
}

export async function deriveNotifications(
  userId: string,
  playerIds: string[]
): Promise<NewNotification[]> {
  const notifications: NewNotification[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // Source 1: document expiry (1b-1 surface)
  if (playerIds.length > 0) {
    const docsRes = await supabaseAdmin
      .from('player_documents')
      .select('id, player_id, title, expires_at, status')
      .in('player_id', playerIds)
      .neq('status', 'archived')
      .not('expires_at', 'is', null);

    for (const d of (docsRes.data || []) as Array<{
      id: string;
      player_id: string;
      title: string;
      expires_at: string;
      status: string;
    }>) {
      if (!d.expires_at) continue;
      const days = daysBetween(today, d.expires_at);
      if (days < 0) {
        notifications.push({
          user_id: userId,
          kind: 'document_expired',
          source_key: `player_documents:${d.id}:expired`,
          player_id: d.player_id,
          title: `${d.title} has expired`,
          body: 'Re-upload a current version to keep your child\'s Hockey Passport up to date.',
          metadata: { document_id: d.id },
        });
      } else if (days <= 1) {
        notifications.push({
          user_id: userId,
          kind: 'document_expiring_1d',
          source_key: `player_documents:${d.id}:expiring:1d`,
          player_id: d.player_id,
          title: `${d.title} expires tomorrow`,
          body: 'Re-upload now to avoid a gap in your child\'s Hockey Passport.',
          metadata: { document_id: d.id },
        });
      } else if (days <= 7) {
        notifications.push({
          user_id: userId,
          kind: 'document_expiring_7d',
          source_key: `player_documents:${d.id}:expiring:7d`,
          player_id: d.player_id,
          title: `${d.title} expires in ${days} days`,
          body: `Plan ahead: re-upload before ${d.expires_at}.`,
          metadata: { document_id: d.id },
        });
      } else if (days <= 30) {
        notifications.push({
          user_id: userId,
          kind: 'document_expiring_30d',
          source_key: `player_documents:${d.id}:expiring:30d`,
          player_id: d.player_id,
          title: `${d.title} expires in ${days} days`,
          body: 'Heads-up: this document is due for renewal.',
          metadata: { document_id: d.id },
        });
      }
    }
  }

  // Source 2: identity renewal
  const profileRes = await supabaseAdmin
    .from('profiles')
    .select('identity_verified_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (profileRes.data?.identity_verified_at) {
    const verifiedAt = profileRes.data.identity_verified_at.slice(0, 10);
    const days = daysBetween(verifiedAt, today);
    if (days >= 730) {
      notifications.push({
        user_id: userId,
        kind: 'identity_renewal_due',
        source_key: `profiles:${userId}:identity_renewal`,
        player_id: null,
        title: 'Your identity verification is due for renewal',
        body: 'Re-verify to keep your verification checkmark on RinkStop.',
        metadata: {},
      });
    }
  }

  // Source 3: achievement_added (1b-2 source). We generate one notification
  // per achievement. The deriver is idempotent on source_key.
  if (playerIds.length > 0) {
    const achsRes = await supabaseAdmin
      .from('player_achievements')
      .select('id, player_id, title, category, achieved_at, created_at')
      .in('player_id', playerIds)
      .order('created_at', { ascending: false })
      .limit(20);
    for (const a of (achsRes.data || []) as Array<{
      id: string;
      player_id: string;
      title: string;
      category: string;
      achieved_at: string;
      created_at: string;
    }>) {
      notifications.push({
        user_id: userId,
        kind: 'achievement_added',
        source_key: `player_achievements:${a.id}`,
        player_id: a.player_id,
        title: `Achievement added: ${a.title}`,
        body: null,
        metadata: { achievement_id: a.id, category: a.category, achieved_at: a.achieved_at },
      });
    }
  }

  return notifications;
}
