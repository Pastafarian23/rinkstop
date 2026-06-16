// Server-side data loader for the dashboard overview's inbox widget.
// Returns a slim shape that the InboxCard can render directly.
//
// Why a separate file from dashboardTypeData.ts:
// - Inbox is global (not type-scoped) and reads different tables
// - Keeps TypeSectionData pure for the type-aware card grid
// - Easier to add inbox-specific behavior (mark-as-read, search) later

import { supabaseAdmin } from '@/lib/supabase';

export interface InboxThread {
  id: string;
  connectionId: string;
  otherUser: {
    userId: string;
    displayName: string | null;
    avatarUrl: string | null;
    tier: string;
    username: string | null;
  };
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

export interface InboxSummary {
  /** Number of accepted connections. */
  connectionCount: number;
  /** Number of accepted connections that have at least one thread. */
  threadCount: number;
  /** Sum of unread messages across all threads. */
  totalUnread: number;
  /** Top N threads, sorted by last_message_at desc. */
  recent: InboxThread[];
}

const RECENT_LIMIT = 3;

export async function loadInboxSummary(userId: string): Promise<InboxSummary> {
  const empty: InboxSummary = {
    connectionCount: 0,
    threadCount: 0,
    totalUnread: 0,
    recent: [],
  };

  // 1) Get all of the caller's accepted connections.
  let connections: any[] | null = null;
  try {
    const { data } = await supabaseAdmin
      .from('connections')
      .select('id, user_low, user_high')
      .or(`user_low.eq.${userId},user_high.eq.${userId}`)
      .eq('status', 'accepted');
    connections = data;
  } catch {
    return empty;
  }
  if (!connections || connections.length === 0) return empty;

  // 2) Map connection.id -> otherUserId for hydration later.
  const otherUserIdByConnId: Record<string, string> = {};
  const otherUserIds = new Set<string>();
  for (const c of connections) {
    const other = c.user_low === userId ? c.user_high : c.user_low;
    otherUserIdByConnId[c.id] = other;
    otherUserIds.add(other);
  }

  // 3) Get all threads for those connections.
  const connectionIds = connections.map((c: any) => c.id);
  const { data: threads } = await supabaseAdmin
    .from('threads')
    .select('id, connection_id, last_message_at, last_message_preview, context_profile_type, context_profile_id')
    .in('connection_id', connectionIds)
    .order('last_message_at', { ascending: false });

  // 4) Hydrate other-party profile.
  let profilesById: Record<string, any> = {};
  if (otherUserIds.size > 0) {
    const { data: profs } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, avatar_url, tier, username')
      .in('user_id', Array.from(otherUserIds));
    if (profs) {
      for (const p of profs) profilesById[p.user_id] = p;
    }
  }

  // 5) Compute unread counts.
  let totalUnread = 0;
  const recent: InboxThread[] = [];
  const threadIds = (threads || []).map((t: any) => t.id);
  let unreadByThread: Record<string, number> = {};
  if (threadIds.length > 0) {
    const { data: msgs } = await supabaseAdmin
      .from('messages')
      .select('thread_id, sender_user_id, read_at')
      .in('thread_id', threadIds);
    if (msgs) {
      for (const m of msgs) {
        const isUnread = m.sender_user_id !== userId && !m.read_at;
        if (isUnread) {
          totalUnread += 1;
          unreadByThread[m.thread_id] = (unreadByThread[m.thread_id] || 0) + 1;
        }
      }
    }
  }

  // 6) Build the top-N list.
  for (const t of (threads || []).slice(0, RECENT_LIMIT)) {
    const otherUserId = otherUserIdByConnId[t.connection_id];
    const prof = profilesById[otherUserId];
    recent.push({
      id: t.id,
      connectionId: t.connection_id,
      otherUser: {
        userId: otherUserId,
        displayName: prof?.display_name ?? null,
        avatarUrl: prof?.avatar_url ?? null,
        tier: prof?.tier ?? 'free',
        username: prof?.username ?? null,
      },
      lastMessagePreview: t.last_message_preview ?? null,
      lastMessageAt: t.last_message_at,
      unreadCount: unreadByThread[t.id] || 0,
    });
  }

  return {
    connectionCount: connections.length,
    threadCount: (threads || []).length,
    totalUnread,
    recent,
  };
}
