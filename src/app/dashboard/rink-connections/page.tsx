// src/app/dashboard/rink-connections/page.tsx
//
// WS17 PR4 Phase 2A — User-facing rink connections dashboard.
//
// Shows the current user's org connections (coaches, teams, leagues)
// and their threads + booking requests with rinks.

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import RinkConnectionsClient from './RinkConnectionsClient';

export const dynamic = 'force-dynamic';

export default async function RinkConnectionsPage() {
  const session = await auth();
  if (!session.userId) redirect('/login');

  // Load user's connections (they are the org party — created_by = session.userId)
  const { data: connections, error: connErr } = await supabaseAdmin
    .from('rink_org_connections')
    .select(`
      id, org_name, org_type, role, status, created_at, updated_at,
      rink:rinks(id, name, slug, city, state_province, country)
    `)
    .eq('created_by', session.userId)
    .order('created_at', { ascending: false });

  // Load user's booking requests
  const { data: requests, error: reqErr } = await supabaseAdmin
    .from('booking_requests')
    .select(`
      id, listing_id, rink_id, status, requested_price_cents, counter_price_cents,
      requested_start, requested_end, notes, created_at, updated_at,
      listing:ice_listings(id, title),
      rink:rinks(id, name, slug)
    `)
    .eq('requesting_user_id', session.userId)
    .order('created_at', { ascending: false });

  // Load user's threads (via connections they own)
  const connIds = (connections || []).map(c => c.id);
  const threadsResult = connIds.length
    ? await supabaseAdmin
        .from('rink_threads')
        .select(`
          id, connection_id, thread_type, subject, status, updated_at,
          connection:rink_org_connections(id, org_name, rink:rinks(id, name))
        `)
        .in('connection_id', connIds)
        .order('updated_at', { ascending: false })
    : { data: [] as any[], error: null as null };

  if (connErr) console.error('[rink-connections] connections load failed', connErr);
  if (reqErr) console.error('[rink-connections] requests load failed', reqErr);
  if (threadsResult.error) console.error('[rink-connections] threads load failed', threadsResult.error);

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>My Rink Connections</h1>
        <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
          Your relationships with rinks — messages, bookings, and contracts.
        </p>
      </div>

      <RinkConnectionsClient
        initialConnections={(connections as any[]) || []}
        initialRequests={(requests as any[]) || []}
        initialThreads={threadsResult.data || []}
      />
    </div>
  );
}
