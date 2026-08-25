// src/app/dashboard/manage/rink/[id]/threads/[threadId]/page.tsx
//
// WS17 PR4 Phase 2A — Thread detail: message history + reply.

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import ThreadDetailClient from './ThreadDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string; threadId: string }>;
}

const TYPE_LABELS: Record<string, string> = {
  general: 'General',
  booking_request: 'Booking Request',
  contract_request: 'Contract Request',
  agreement: 'Agreement',
  payment: 'Payment',
  dispute: 'Dispute',
};

export default async function ThreadDetailPage({ params }: PageProps) {
  const { id: rinkId, threadId } = await params;

  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  // Owner check
  const { count: claimCount } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('claim_type', 'rink')
    .eq('entity_id', rinkId)
    .eq('status', 'approved');

  if (!claimCount) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#FFB81C', padding: '1rem 1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          You don&rsquo;t have an approved claim for this rink.
        </div>
        <Link href="/dashboard/claims" style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6' }}>← Back to claims</Link>
      </div>
    );
  }

  // Load rink
  const { data: rink } = await supabaseAdmin
    .from('rinks')
    .select('id, name')
    .eq('id', rinkId)
    .maybeSingle();

  // Load thread
  const { data: threadData, error: threadErr } = await supabaseAdmin
    .from('rink_threads')
    .select(`
      id, connection_id, thread_type, subject, status, expires_at, created_at, updated_at,
      connection:rink_org_connections(id, org_name, org_type, role)
    `)
    .eq('id', threadId)
    .single();

  if (threadErr || !threadData) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5', padding: '1rem 1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          Thread not found.
        </div>
        <Link href={`/dashboard/manage/rink/${rinkId}/threads`} style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6' }}>← Back to messages</Link>
      </div>
    );
  }

  // Load messages
  const { data: messages, error: msgErr } = await supabaseAdmin
    .from('rink_messages')
    .select('id, thread_id, sender_id, content, attachments, read_at, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (msgErr) console.error('[thread-detail] messages load failed', msgErr);

  const threadAny = threadData as any;
  const connAny = Array.isArray(threadAny.connection) ? threadAny.connection[0] : threadAny.connection;

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link href={`/dashboard/manage/rink/${rinkId}/threads`} style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
          ← Messages
        </Link>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>
          {threadData.subject || connAny?.org_name || 'Thread'}
        </h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.375rem', flexWrap: 'wrap' }}>
          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
            {TYPE_LABELS[threadData.thread_type] || threadData.thread_type}
            {connAny ? ` · ${connAny.org_name}` : ''}
          </span>
          <span style={{
            background: threadData.status === 'open' ? 'rgba(56,189,248,0.15)' : threadData.status === 'resolved' ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
            color: threadData.status === 'open' ? '#7DD3FC' : threadData.status === 'resolved' ? '#86efac' : '#94A3B8',
            padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize',
          }}>
            {threadData.status}
          </span>
        </div>
      </div>

      <ThreadDetailClient
        rinkId={rinkId}
        thread={{ ...threadData as any }}
        initialMessages={(messages || []) as any[]}
        currentUserId={userId}
      />
    </div>
  );
}
