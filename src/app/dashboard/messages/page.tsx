import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import MessagesClient from './MessagesClient';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.userId) redirect('/login');
  const userEmail = (await currentUser())?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) redirect('/login');

  // Initial server-render: load threads + first 5 of each. The client component
  // refreshes on action.
  const { data: threads } = await supabaseAdmin
    .from('direct_message_threads')
    .select('id, user_a_id, user_b_id, last_message_at, last_message_preview, created_at')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  const otherUserIds = (threads || []).map((t) =>
    t.user_a_id === userId ? t.user_b_id : t.user_a_id
  );
  let profilesById: Record<string, { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null }> = {};
  if (otherUserIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, username, avatar_url')
      .in('user_id', otherUserIds);
    for (const p of (profiles || []) as any[]) profilesById[p.user_id] = p;
  }

  // Compute unread per thread
  const threadIds = (threads || []).map((t) => t.id);
  const unreadByThread: Record<string, number> = {};
  if (threadIds.length > 0) {
    const { data: unreadMsgs } = await supabaseAdmin
      .from('direct_messages')
      .select('thread_id')
      .in('thread_id', threadIds)
      .is('read_at', null)
      .neq('sender_id', userId);
    for (const m of (unreadMsgs || []) as Array<{ thread_id: string }>) {
      unreadByThread[m.thread_id] = (unreadByThread[m.thread_id] || 0) + 1;
    }
  }

  const initialThreads = (threads || []).map((t) => {
    const otherUserId = t.user_a_id === userId ? t.user_b_id : t.user_a_id;
    return {
      id: t.id,
      other_user_id: otherUserId,
      other_user: profilesById[otherUserId] || null,
      last_message_at: t.last_message_at,
      last_message_preview: t.last_message_preview,
      unread_count: unreadByThread[t.id] || 0,
    };
  });

  return <MessagesClient userId={userId} initialThreads={initialThreads} />;
}
