// src/app/dashboard/rink-connections/[connectionId]/page.tsx
//
// WS17 PR4 Phase 2A — User-facing connection + thread view.

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import UserThreadClient from './UserThreadClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ connectionId: string }>;
}

export default async function UserConnectionPage({ params }: PageProps) {
  const { connectionId } = await params;
  const session = await auth();
  if (!session.userId) redirect('/login');

  // Load connection
  const connResult = await supabaseAdmin
    .from('rink_org_connections')
    .select(`id, org_name, org_type, role, status, created_by, rink:rinks(id, name, slug)`)
    .eq('id', connectionId)
    .single();

  if (connResult.error || !connResult.data) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5', padding: '1rem 1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          Connection not found.
        </div>
        <Link href="/dashboard/rink-connections" style={{ display: 'inline-block', marginTop: '1rem', color: '#38BDF8' }}>← Back to connections</Link>
      </div>
    );
  }

  const connAny = connResult.data as any;
  const rinkAny = Array.isArray(connAny.rink) ? connAny.rink[0] : connAny.rink;

  if (connAny.created_by !== session.userId) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#FFB81C', padding: '1rem 1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          You do not have access to this connection.
        </div>
        <Link href="/dashboard/rink-connections" style={{ display: 'inline-block', marginTop: '1rem', color: '#38BDF8' }}>← Back to connections</Link>
      </div>
    );
  }

  // Load threads
  const threadsResult = await supabaseAdmin
    .from('rink_threads')
    .select('id, thread_type, subject, status, updated_at, created_at')
    .eq('connection_id', connectionId)
    .order('updated_at', { ascending: false });

  if (threadsResult.error) console.error('[user-connection] threads load failed', threadsResult.error);

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dashboard/rink-connections" style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
          ← My Rink Connections
        </Link>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>
          {connAny.org_name}
        </h1>
        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          {connAny.org_type} · {rinkAny?.name || 'Rink connection'}
        </div>
      </div>

      <UserThreadClient
        connectionId={connectionId}
        initialThreads={threadsResult.data || []}
        currentUserId={session.userId}
      />
    </div>
  );
}
