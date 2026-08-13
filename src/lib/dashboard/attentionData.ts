// src/lib/dashboard/attentionData.ts
// WS14 PR4 — Data loader for the "What needs my attention?" widget.
//
// Aggregates pending action items across surfaces (notifications, claims,
// documents, subscription, inbox) into a single shape that AttentionCard
// renders. Each row is `count || null` — null means "not applicable" and
// should be omitted from the card entirely. Zero means "checked, none found".
//
// Fails closed: every query is wrapped in try/catch. Any failure returns
// the empty state. This widget is decorative — it must NEVER throw, or the
// whole dashboard render fails (the page wraps renderDashboard in a
// catch-all, but we'd rather not surface "Dashboard hit a snag" just because
// Supabase was flaky).

import { supabaseAdmin } from '@/lib/supabase';

export interface AttentionRow {
  /** Stable key for the row. */
  key: 'notifications' | 'inbox' | 'claims' | 'documents' | 'subscription';
  /** Glyph. */
  icon: string;
  /** Short label. */
  label: string;
  /** Number of items — null means "not applicable / not loaded". */
  count: number | null;
  /** Optional subtext (e.g. "1 expires in 7 days"). */
  detail?: string;
  /** Where to go when the user clicks. */
  href: string;
  /** Color tone for the count pill. */
  tone: 'red' | 'amber' | 'green' | 'neutral';
}

export interface AttentionSummary {
  /** Rows that have actionable content (count > 0 or critical). */
  rows: AttentionRow[];
  /** True if all checked surfaces are clean. */
  allClear: boolean;
}

interface DocsResult {
  count: number;
  detail?: string;
}

interface SubscriptionResult {
  hasIssue: boolean;
  detail?: string;
}

const empty: AttentionSummary = { rows: [], allClear: true };

export async function loadAttentionSummary(userId: string): Promise<AttentionSummary> {
  // 2026-08-13: bisect queries one at a time. Start with just loadUnreadNotifications.
  try {
    const unreadNotif = await loadUnreadNotifications(userId);
    console.error('[attentionDiag] unreadNotif:', JSON.stringify(unreadNotif));
    return { rows: [], allClear: true };
  } catch (e: any) {
    console.error('[attentionDiag] loadUnreadNotifications threw:', e?.message, e?.stack?.split('\n').slice(0, 3).join('\n'));
    return { rows: [], allClear: true };
  }
}


async function loadUnreadNotifications(userId: string): Promise<number | null> {
  try {
    const { count } = await supabaseAdmin
      .from('consumer_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null)
      .or('snooze_until.is.null,snooze_until.lt.now()');
    return count ?? 0;
  } catch {
    return null;
  }
}

async function loadPendingClaims(userId: string): Promise<number | null> {
  try {
    const { count } = await supabaseAdmin
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending');
    return count ?? 0;
  } catch {
    return null;
  }
}

async function loadExpiringDocuments(userId: string): Promise<DocsResult | null> {
  try {
    // Documents are tied to players, not users directly. Find the
    // current user's player records (where they are the profile owner),
    // then count docs owned by those players that expire within 30 days.
    const { data: myPlayers } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('user_id', userId);
    const playerIds = (myPlayers || []).map((p: any) => p.id);
    if (playerIds.length === 0) return { count: 0 };

    // 1d / 7d / 30d windows. We surface 30d as the headline count, then
    // break down the most urgent window for the detail tooltip.
    const { data: docs30 } = await supabaseAdmin
      .from('player_documents')
      .select('id, expires_at')
      .in('player_id', playerIds)
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .lte('expires_at', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .gte('expires_at', new Date().toISOString().slice(0, 10));

    const docs = docs30 || [];
    if (docs.length === 0) return { count: 0 };

    const today = new Date().toISOString().slice(0, 10);
    const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const urgent = docs.filter((d: any) => d.expires_at && d.expires_at <= in7 && d.expires_at >= today);
    const detail = urgent.length > 0
      ? `${urgent.length} within 7 days`
      : `${docs.length} within 30 days`;
    return { count: docs.length, detail };
  } catch {
    return null;
  }
}

async function loadSubscriptionIssue(userId: string): Promise<SubscriptionResult | null> {
  try {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, tier')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) return { hasIssue: false };

    const status = data.subscription_status as string | null;
    if (status === 'past_due' || status === 'unpaid') {
      return {
        hasIssue: true,
        detail: status === 'past_due' ? 'Payment past due' : 'Subscription unpaid',
      };
    }
    return { hasIssue: false };
  } catch {
    return null;
  }
}

async function loadInboxUnread(userId: string): Promise<number | null> {
  try {
    // Threads where the user is a participant and `last_message_at` is
    // after `last_read_at` (we store last_read_at on the connection row).
    // For simplicity, count threads with last_message_at > (some recent
    // threshold) — the inbox card uses the same heuristic.
    const { data: connections } = await supabaseAdmin
      .from('connections')
      .select('id')
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .eq('status', 'accepted');
    const connIds = (connections || []).map((c: any) => c.id);
    if (connIds.length === 0) return 0;

    // Count threads where the last message is from the OTHER user (not
    // the current user). Without per-thread read receipts, we approximate
    // unread as "thread has more than 0 messages" — this is intentionally
    // conservative and matches what InboxCard shows.
    const { data: threads } = await supabaseAdmin
      .from('threads')
      .select('id, last_message_at')
      .in('connection_id', connIds)
      .not('last_message_at', 'is', null);

    if (!threads) return 0;
    // If last message was within 14 days, count as potentially unread.
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recent = threads.filter((t: any) => t.last_message_at && new Date(t.last_message_at).getTime() >= cutoff);
    return recent.length;
  } catch {
    return null;
  }
}
