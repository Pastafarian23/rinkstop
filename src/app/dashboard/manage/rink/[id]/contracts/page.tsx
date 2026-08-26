// src/app/dashboard/manage/rink/[id]/contracts/page.tsx
//
// WS17 PR4 Phase 2A — Rink contracts page.

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import ContractsClient from './ContractsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractsPage({ params }: PageProps) {
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

  // Load contracts via connections
  const { data: connIds } = await supabaseAdmin
    .from('rink_org_connections')
    .select('id')
    .eq('rink_id', id);

  const cids = connIds?.map(c => c.id) || [];
  const contractsResult = cids.length
    ? await supabaseAdmin
        .from('rink_contracts')
        .select(`id, title, contract_type, status, storage_path, document_hash, document_storage_path, file_size_bytes, file_mime_type, uploaded_at, expires_at, sent_at, signed_at, created_at, updated_at, connection:rink_org_connections(id, org_name, org_type)`)
        .in('connection_id', cids)
        .order('created_at', { ascending: false })
    : { data: [] as any[], error: null as null };

  if (contractsResult.error) console.error('[contracts-page] load failed', contractsResult.error);

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link href={`/dashboard/manage/rink/${id}`} style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
          ← {rink?.name || 'Rink'} dashboard
        </Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>Contracts</h1>
        <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
          Sent, pending, and signed contracts with organizations.
        </p>
      </div>

      <ContractsClient rinkId={id} initialContracts={contractsResult.data || []} />

      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link href={`/dashboard/manage/rink/${id}`} style={{ color: '#94A3B8', fontSize: '0.85rem', textDecoration: 'none' }}>← Back to rink dashboard</Link>
      </div>
    </div>
  );
}
