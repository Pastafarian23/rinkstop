// src/app/dashboard/manage/rink/[id]/events/new/page.tsx
//
// WS17 PR3b - New event page (server wrapper).

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import EventsFormClient from '../EventsFormClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewEventPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const { id } = await params;

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

  return <EventsFormClient mode="create" rinkId={id} />;
}
