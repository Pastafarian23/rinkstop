// src/app/dashboard/manage/team/[id]/programs/[programId]/edit/page.tsx
//
// WS38 - Club Starter team-registration-management.
//
// Edit an existing program. Loads the team_events row + claim check, then
// hands off to the shared ProgramForm.

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import ProgramForm from '../../ProgramForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string; programId: string }>;
}

export default async function EditTeamProgramPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');
  const { id, programId } = await params;

  const [{ count: claimCount }, { data: workspace }, { data: program }, { data: rinks }] = await Promise.all([
    supabaseAdmin
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('claim_type', 'team')
      .eq('entity_id', id)
      .eq('status', 'approved'),
    supabaseAdmin.from('team_workspaces').select('id, name, currency').eq('id', id).maybeSingle(),
    supabaseAdmin.from('team_events').select('*').eq('id', programId).eq('team_id', id).maybeSingle(),
    supabaseAdmin.from('rinks').select('id, name').eq('is_active', true).order('name').limit(500),
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

  // Coerce numeric string columns from PG (numeric -> string) to a number
  // string for the form's input. status: leave the raw value.
  const p = program as Record<string, unknown>;
  const initial = {
    id: programId,
    event_kind: (p.event_kind as string) || 'practice',
    title: (p.title as string) || '',
    description: (p.description as string) || '',
    starts_at: (p.starts_at as string) || '',
    ends_at: (p.ends_at as string) || '',
    arrival_minutes: p.arrival_minutes !== null ? String(p.arrival_minutes) : '30',
    cost_per_player: p.cost_per_player !== null ? String(p.cost_per_player) : '',
    currency: (p.currency as string) || workspace.currency || 'USD',
    rsvp_required: p.rsvp_required !== false,
    rsvp_deadline: (p.rsvp_deadline as string) || '',
    max_attendees: p.max_attendees !== null ? String(p.max_attendees) : '',
    opposing_team: (p.opposing_team as string) || '',
    location_note: (p.location_note as string) || '',
    status: (p.status as string) || 'scheduled',
    rink_id: (p.rink_id as string) || '',
    is_off_ice: !!p.is_off_ice,
    timezone: (p.timezone as string) || '',
  };

  return (
    <ProgramForm
      isEdit
      initial={initial}
      rinkOptions={(rinks || []) as Array<{ id: string; name: string }>}
      defaultCurrency={workspace.currency || 'USD'}
    />
  );
}