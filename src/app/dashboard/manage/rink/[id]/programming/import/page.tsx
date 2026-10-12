// src/app/dashboard/manage/rink/[id]/programming/import/page.tsx
//
// WS32 - CSV bulk-import UI.
//
// Server page that:
//   1. Verifies the caller owns the rink (approved claim).
//   2. Loads the rink name for the page header.
//   3. Renders the client ImportForm component (CSV upload + submit).
//
// The client form parses the CSV locally, shows a preview + per-row errors,
// and only POSTs validated rows to /api/owner/rinks/[id]/programming/import.

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import ImportForm from './ImportForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ImportProgrammingPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const { id } = await params;

  // Owner check (same pattern as the existing list/new pages).
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

  const { data: rink } = await supabaseAdmin
    .from('rinks')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();

  return (
    <div style={{ maxWidth: 960 }}>
      <Link href={`/dashboard/manage/rink/${id}/programming`} style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
        ← Back to Programming
      </Link>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '0.5rem' }}>Bulk import programming</h1>
      <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
        Upload a CSV to add a whole week of programming at once for {rink.name || 'this rink'}.
        Imported rows land in <strong style={{ color: '#FCD34D' }}>draft</strong> status by default — publish them from the list once you&rsquo;ve reviewed.
      </p>

      <ImportForm rinkId={id} rinkName={rink?.name || 'this rink'} />
    </div>
  );
}