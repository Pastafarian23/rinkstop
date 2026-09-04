// src/app/events/submit/page.tsx
//
// Public form: submit a hockey event for review by a rink owner.
// Anyone can use this — signed in or not. Submissions queue in
// event_submissions for the named rink's owner to approve/reject.
//
// WS17 PR4 sub-PR (2026-09-04).

import type { Metadata } from 'next';
import Link from 'next/link';
import { withDefaultOg } from '@/lib/metadata-defaults';
import { supabaseAdmin } from '@/lib/supabase';
import EventSubmissionForm from './EventSubmissionForm';

export const metadata: Metadata = {
  title: 'Submit a Hockey Event | RinkStop',
  description:
    'Submit your hockey tournament, camp, tryout, or clinic for listing on RinkStop. The rink owner reviews and approves before it goes live.',
  alternates: { canonical: 'https://rinkstop.com/events/submit' },
  robots: { index: true, follow: true },
  openGraph: withDefaultOg({
    title: 'Submit a Hockey Event',
    description: 'Get your event listed on RinkStop. Reviewed by the rink owner before going live.',
    url: 'https://rinkstop.com/events/submit',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary',
    title: 'Submit a Hockey Event | RinkStop',
    description: 'Tournaments, camps, tryouts, clinics — get listed on RinkStop.',
  },
};

// Server component: load list of rink options for the dropdown
export default async function EventSubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ rink_id?: string; rink_slug?: string }>;
}) {
  const sp = await searchParams;

  // Load recent active rinks for the dropdown (cap at 200 for the most populous states)
  const { data: rinks } = await supabaseAdmin
    .from('rinks')
    .select('id, name, slug, city, province_state, country')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .limit(500);

  // Try to pre-select a rink if ?rink_id or ?rink_slug was provided
  let preSelectedRinkId: string | null = null;
  if (sp.rink_id) preSelectedRinkId = sp.rink_id;
  if (!preSelectedRinkId && sp.rink_slug) {
    const match = (rinks ?? []).find((r: any) => r.slug === sp.rink_slug);
    if (match) preSelectedRinkId = match.id;
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem' }}>
      <Link href="/events" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
        ← Back to events
      </Link>

      <h1 style={{ margin: '1rem 0 0.5rem', fontSize: '1.75rem', color: 'var(--fg)' }}>
        Submit a hockey event
      </h1>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
        Submit your tournament, camp, tryout, or clinic. The rink owner reviews and approves before it goes live. Free.
      </p>

      <EventSubmissionForm
        rinks={rinks ?? []}
        preSelectedRinkId={preSelectedRinkId}
      />
    </div>
  );
}
