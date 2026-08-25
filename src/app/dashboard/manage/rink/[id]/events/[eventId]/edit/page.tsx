// src/app/dashboard/manage/rink/[id]/events/[eventId]/edit/page.tsx
//
// WS17 PR3b - Edit event page (server wrapper).

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import EventsFormClient from '../../EventsFormClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string; eventId: string }>;
}

export default async function EditEventPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const { id, eventId } = await params;

  // Owner check
  const { count: claimCount } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('claim_type', 'rink')
    .eq('entity_id', id)
    .eq('status', 'approved');

  if (!claimCount) {
    redirect('/dashboard/claims');
  }

  // Load event
  const { data: event } = await supabaseAdmin
    .from('rink_events')
    .select('*')
    .eq('id', eventId)
    .eq('rink_id', id)
    .maybeSingle();

  if (!event) redirect(`/dashboard/manage/rink/${id}/events`);

  // Load divisions
  const { data: divisions } = await supabaseAdmin
    .from('event_divisions')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });

  // Build initialData shape expected by EventsFormClient
  const startsAt = new Date(event.starts_at);
  const endsAt   = new Date(event.ends_at);
  const pad = (n: number) => String(n).padStart(2, '0');
  const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const initialData: Record<string, unknown> = {
    ...event,
    starts_at_date: `${toDateStr(startsAt)}T${toTimeStr(startsAt)}`,
    ends_at_date:   `${toDateStr(endsAt)}T${toTimeStr(endsAt)}`,
    registration_opens_at: event.registration_opens_at,
    registration_closes_at: event.registration_closes_at,
    early_bird_until: event.early_bird_until,
  };

  return (
    <EventsFormClient
      mode="edit"
      rinkId={id}
      eventId={eventId}
      initialData={initialData as Parameters<typeof EventsFormClient>[0]['initialData']}
      existingDivisions={divisions ?? []}
    />
  );
}
