// src/app/dashboard/manage/rink/[id]/event-submissions/page.tsx
//
// Owner: review queue for public event submissions.
// WS17 PR4 sub-PR (2026-09-04).

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import EventSubmissionsClient from './EventSubmissionsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: 'rgba(255,184,28,0.15)', fg: '#FCD34D' },
  approved: { bg: 'rgba(74,222,128,0.15)', fg: '#86EFAC' },
  rejected: { bg: 'rgba(200,16,46,0.15)', fg: '#FCA5A5' },
  spam: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
  duplicate: { bg: 'rgba(148,163,184,0.15)', fg: '#94A3B8' },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  tournament: 'Tournament', camp: 'Camp', clinic: 'Clinic', tryout: 'Tryout',
  showcase: 'Showcase', exhibition: 'Exhibition', lesson_series: 'Lesson Series',
  training: 'Training', skills_session: 'Skills Session', public_skate: 'Public Skate',
  learn_to_skate: 'Learn to Skate', open_hockey: 'Open Hockey', other: 'Other',
};

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch { return '—'; }
}

export default async function OwnerEventSubmissionsPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const { id } = await params;

  // Owner check (already pattern in events/page.tsx)
  const { count: claimCount } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('claim_type', 'rink')
    .eq('entity_id', id)
    .eq('status', 'approved');

  if ((claimCount ?? 0) === 0) {
    return (
      <div style={{ maxWidth: 720, margin: '2rem auto', padding: '1.5rem', background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', borderRadius: 8, color: '#FF6B7A' }}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Access denied</h2>
        <p style={{ margin: 0 }}>You must be an approved rink owner to access this page.</p>
      </div>
    );
  }

  // Load all submissions for this rink
  const { data: submissions } = await supabaseAdmin
    .from('event_submissions')
    .select('*')
    .eq('rink_id', id)
    .order('created_at', { ascending: false })
    .limit(200);

  const pendingCount = (submissions ?? []).filter((s: any) => s.status === 'pending').length;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', color: 'var(--fg)' }}>Event Submissions</h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {pendingCount === 0
              ? 'No pending submissions.'
              : `${pendingCount} pending submission${pendingCount === 1 ? '' : 's'}.`}
          </p>
        </div>
        <Link href={`/dashboard/manage/rink/${id}/events`} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to events
        </Link>
      </div>

      <EventSubmissionsClient
        rinkId={id}
        initialSubmissions={(submissions ?? []) as any[]}
        statusColors={STATUS_COLORS}
        eventTypeLabels={EVENT_TYPE_LABELS}
        formatDate={formatDate}
      />
    </div>
  );
}
