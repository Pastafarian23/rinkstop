// src/app/dashboard/manage/rink/[id]/bookings/page.tsx
//
// Rink-side dashboard: list admin-arranged bookings for this rink.
// Rink owner can Confirm/Decline bookings + see settlement status.
//
// Phase 2 of the Cebu Ice Datus ↔ SM Seaside Skating pilot (and any
// future admin-arranged booking).
//
// Access: Clerk session + approved claim on this rink (RLS handles via
// supabaseAdmin + explicit filter on bookings.rink_id == params.id).
//
// Server component → BookingsClient for Confirm/Decline interactions.

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import BookingsClient from './BookingsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingsPage({ params }: PageProps) {
  const session = await auth();
  if (!session.userId) redirect('/login');
  const { id } = await params;

  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);

  // Verify the caller is an approved claimant of this rink
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

  // Fetch the rink + the bookings list
  const { data: rink } = await supabaseAdmin
    .from('rinks')
    .select('id, name, slug, country')
    .eq('id', id)
    .maybeSingle();

  const { data: bookings, error } = await supabaseAdmin
    .from('admin_arranged_bookings')
    .select(`
      id, title, notes, start_time, end_time,
      price_cents, fee_cents, settlement_cents, currency,
      payment_status, paid_at, status, settlement_status,
      settlement_method, settlement_sent_at, settlement_reference,
      created_at, buyer_contact_name, buyer_contact_email,
      buyer_contact_phone, buyer_team_workspace_id
    `)
    .eq('rink_id', id)
    .order('start_time', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[rink/bookings] query failed', error);
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/dashboard/manage/rink/${id}`} style={{ color: '#14B8A6', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← {rink?.name || 'Rink'} dashboard
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#041E42', margin: '0.25rem 0 0.25rem' }}>
          Bookings
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
          Admin-arranged bookings for {rink?.name}. Confirm to accept, decline to release the slot.
        </p>
      </div>

      <BookingsClient
        rinkId={id}
        bookings={(bookings || []).map((b: any) => ({
          id: b.id,
          title: b.title,
          notes: b.notes,
          start_time: b.start_time,
          end_time: b.end_time,
          price_cents: b.price_cents,
          fee_cents: b.fee_cents,
          settlement_cents: b.settlement_cents,
          currency: b.currency,
          payment_status: b.payment_status,
          paid_at: b.paid_at,
          status: b.status,
          settlement_status: b.settlement_status,
          settlement_method: b.settlement_method,
          settlement_sent_at: b.settlement_sent_at,
          settlement_reference: b.settlement_reference,
          created_at: b.created_at,
          buyer_contact_name: b.buyer_contact_name,
          buyer_contact_email: b.buyer_contact_email,
          buyer_contact_phone: b.buyer_contact_phone,
          buyer_team_workspace_id: b.buyer_team_workspace_id,
        }))}
      />
    </div>
  );
}