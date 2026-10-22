// src/app/dashboard/manage/team/[id]/programs/[programId]/rsvps/page.tsx
//
// WS38 - Organization Plus team-registration-management.
//
// RSVP list page for a single program. Loads RSVPs + the user profiles that
// match their user_ids (for display names). Hands off to the client wrapper
// for approval / waitlist / reject / bulk actions / CSV export.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import RsvpsClient, { type RsvpRow } from './RsvpsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string; programId: string }>;
}

export default async function ProgramRsvpsPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const { id, programId } = await params;

  // Owner + workspace + program + RSVPs in parallel.
  const [
    { count: claimCount },
    { data: workspace },
    { data: program },
    { data: rsvps },
  ] = await Promise.all([
    supabaseAdmin
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('claim_type', 'team')
      .eq('entity_id', id)
      .eq('status', 'approved'),
    supabaseAdmin.from('team_workspaces').select('id, name').eq('id', id).maybeSingle(),
    supabaseAdmin.from('team_events').select('id, team_id, max_attendees, title, starts_at').eq('id', programId).eq('team_id', id).maybeSingle(),
    supabaseAdmin
      .from('team_rsvps')
      .select('id, event_id, user_id, response, note, responded_at, updated_at, attendance_status, attendance_at, attendance_note, marked_by')
      .eq('event_id', programId)
      .order('responded_at', { ascending: false }),
  ]);

  if (!claimCount) {
    return (
      <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#FFB81C', padding: '1rem 1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          You don&rsquo;t have an approved claim for this team.
        </div>
        <Link href={`/dashboard/claims?entity=team&id=${id}`} style={{ color: '#14B8A6' }}>→ Go to claims</Link>
      </div>
    );
  }
  if (!workspace) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '1rem 1.25rem', borderRadius: 8 }}>
          Could not load team. It may have been removed.
        </div>
        <Link href="/dashboard/claims" style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6' }}>← Back to claims</Link>
      </div>
    );
  }
  if (!program) {
    notFound();
  }

  // Hydrate display names for the user_ids. Single query, left-joined in memory.
  const baseRsvps = (rsvps || []) as Array<Omit<RsvpRow, 'display_name' | 'username'>>;
  const userIds = Array.from(new Set(baseRsvps.map((r) => r.user_id).filter(Boolean)));
  let profileMap: Record<string, { display_name?: string | null; username?: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, username')
      .in('user_id', userIds);
    for (const p of profs || []) {
      const u = (p as { user_id: string }).user_id;
      profileMap[u] = p as { display_name?: string | null; username?: string | null };
    }
  }

  const hydrated: RsvpRow[] = baseRsvps.map((r) => ({
    ...r,
    display_name: profileMap[r.user_id]?.display_name ?? null,
    username: profileMap[r.user_id]?.username ?? null,
  }));

  const yesCount = hydrated.filter((r) => r.response === 'yes').length;
  const maybeCount = hydrated.filter((r) => r.response === 'maybe').length;
  const noCount = hydrated.filter((r) => r.response === 'no').length;
  const capacity = (program as { max_attendees?: number | null }).max_attendees;
  const isFull = capacity !== null && capacity !== undefined && yesCount >= capacity;

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href={`/dashboard/manage/team/${id}/programs`} style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
            ← {workspace.name} programs
          </Link>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>
            {(program as { title: string }).title} · RSVPs
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            {yesCount} yes · {maybeCount} waitlist · {noCount} declined
            {capacity !== null && capacity !== undefined ? ` · capacity ${capacity}${isFull ? ' (full)' : ''}` : ''}
          </p>
        </div>
        <Link
          href={`/dashboard/manage/team/${id}/programs/${programId}/edit`}
          style={{ color: '#38BDF8', fontSize: '0.85rem', textDecoration: 'none', padding: '0.5rem 0.875rem', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 8 }}
        >
          Edit program →
        </Link>
      </div>

      <RsvpsClient
        teamId={id}
        programId={programId}
        programTitle={(program as { title: string }).title}
        rsvps={hydrated}
      />
    </div>
  );
}