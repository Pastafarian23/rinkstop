// /dashboard/manage/rink/[id]/booking-inquiries
//
// Rink owner dashboard for public booking inquiries. Lists every
// inquiry submitted from the public marketplace for this rink,
// with status, contact info, and Accept/Decline actions.

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import BookingInquiriesClient from './BookingInquiriesClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingInquiriesPage({ params }: PageProps) {
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

  const { data: rink } = await supabaseAdmin
    .from('rinks')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();

  const { data: inquiries } = await supabaseAdmin
    .from('public_booking_inquiries')
    .select(`
      id, created_at, contact_name, contact_email, contact_phone, team_or_org,
      requested_start, requested_end, requested_price_cents, notes,
      status, source, source_url,
      listing:ice_listings(id, title, start_time, end_time, slot_type, age_group, skill_level)
    `)
    .eq('rink_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  // Supabase returns the joined `listing` as an array; normalize to first element or null.
  const normalized = (inquiries || []).map((inq: any) => ({
    ...inq,
    listing: Array.isArray(inq.listing) ? inq.listing[0] ?? null : inq.listing ?? null,
  }));

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <h1
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: '2rem',
            margin: 0,
            letterSpacing: '0.04em',
          }}
        >
          Booking Inquiries
        </h1>
        <span style={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.875rem' }}>
          {rink?.name || 'Rink'} · {normalized.length} total
        </span>
      </div>
      <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Public inquiries submitted via the ice marketplace. Accept to start a booking conversation, decline to close
        the inquiry, or spam to flag and hide it.
      </p>
      <BookingInquiriesClient rinkId={id} initialInquiries={normalized} />
    </div>
  );
}
