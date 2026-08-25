// src/app/dashboard/manage/rink/[id]/ice-listings/page.tsx
//
// WS17 PR4 Phase 2A — Ice listings management.

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import IceListingsClient from './IceListingsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IceListingsPage({ params }: PageProps) {
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

  const { data: listings, error } = await supabaseAdmin
    .from('ice_listings')
    .select('id, rink_id, title, description, requested_price_cents, currency, start_time, end_time, timezone, age_group, skill_level, slot_type, visibility, status, created_at')
    .eq('rink_id', id)
    .order('start_time', { ascending: true });

  if (error) console.error('[ice-listings-page] load failed', error);

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href={`/dashboard/manage/rink/${id}`} style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
            ← {rink?.name || 'Rink'} dashboard
          </Link>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>Ice Listings</h1>
          <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Available ice slots visible on the public marketplace.
          </p>
        </div>
        <a
          href="/ice-marketplace"
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: 'rgba(56,189,248,0.1)', color: '#7DD3FC', border: '1px solid rgba(56,189,248,0.3)', padding: '0.5rem 1rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.85rem' }}
        >
          View marketplace →
        </a>
      </div>

      <IceListingsClient rinkId={id} rinkName={rink?.name || ''} initialListings={(listings as any[]) || []} />

      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link href={`/dashboard/manage/rink/${id}`} style={{ color: '#94A3B8', fontSize: '0.85rem', textDecoration: 'none' }}>← Back to rink dashboard</Link>
      </div>
    </div>
  );
}
