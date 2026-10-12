// src/app/dashboard/manage/rink/[id]/programming/quick/page.tsx
//
// WS32 - Quick-add programming page.
//
// Server page that gates access and surfaces the client QuickAddForm.
// Quick-add is the operator-friendly entry point: 5 fields, sensible
// defaults for everything else, and a "Save and add another" loop so an
// operator can knock out Mon/Wed/Fri 7-8pm public skate in under a minute
// without reloading.

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import QuickAddForm from './QuickAddForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuickAddProgrammingPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const { id } = await params;

  // Owner check (matches the rest of the programming pages).
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
    <div style={{ maxWidth: 720 }}>
      <Link href={`/dashboard/manage/rink/${id}/programming`} style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
        ← Back to Programming
      </Link>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '0.5rem' }}>Quick-add programming</h1>
      <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
        Add the common weekly slots for {rink.name || 'this rink'} fast. Only 5 fields. For full detail (skill level, age range, capacity, gear rules, etc.), use the{' '}
        <Link href={`/dashboard/manage/rink/${id}/programming/new`} style={{ color: '#38BDF8' }}>full form</Link> or{' '}
        <Link href={`/dashboard/manage/rink/${id}/programming/import`} style={{ color: '#38BDF8' }}>CSV upload</Link>.
      </p>

      <QuickAddForm rinkId={id} rinkName={rink?.name || 'this rink'} />
    </div>
  );
}