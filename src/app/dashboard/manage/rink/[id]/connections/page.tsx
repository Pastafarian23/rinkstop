// src/app/dashboard/manage/rink/[id]/connections/page.tsx
//
// WS17 PR4 Phase 2A — Org connections list page.

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import ConnectionsClient from './ConnectionsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  active: { bg: 'rgba(56,189,248,0.15)', fg: '#7DD3FC' },
  pending: { bg: 'rgba(255,184,28,0.15)', fg: '#FCD34D' },
  rejected: { bg: 'rgba(239,68,68,0.15)', fg: '#FCA5A5' },
  expired: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
};

const TYPE_LABELS: Record<string, string> = {
  team: 'Team',
  league: 'League',
  federation: 'Federation',
  school: 'School',
  business: 'Business',
  independent_coach: 'Independent Coach',
  other: 'Other',
};

export default async function ConnectionsPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const { id } = await params;

  const { count: claimCount } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('claim_type', 'rink')
    .eq('entity_id', id)
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

  const { data: rink } = await supabaseAdmin.from('rinks').select('id, name').eq('id', id).maybeSingle();

  const { data: connections, error } = await supabaseAdmin
    .from('rink_org_connections')
    .select('id, org_name, org_type, role, status, contact_name, contact_email, invite_code, created_at, updated_at')
    .eq('rink_id', id)
    .order('created_at', { ascending: false });

  if (error) console.error('[connections-page] load failed', error);

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href={`/dashboard/manage/rink/${id}`} style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
            ← {rink?.name || 'Rink'} dashboard
          </Link>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>Connections</h1>
          <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Teams, leagues, and organizations connected to {rink?.name || 'this rink'}.
          </p>
        </div>
      </div>

      <ConnectionsClient rinkId={id} initialConnections={connections ?? []} />

      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link href={`/dashboard/manage/rink/${id}`} style={{ color: '#94A3B8', fontSize: '0.85rem', textDecoration: 'none' }}>← Back to rink dashboard</Link>
      </div>
    </div>
  );
}
