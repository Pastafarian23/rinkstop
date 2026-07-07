import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import DocumentsClient from './DocumentsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const ADMIN_ROLES = ['head_coach','assistant_coach','manager','president','vice_president','treasurer','secretary'];

export default async function TeamDocumentsPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) notFound();

  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (!myMembership) {
    return (
      <div style={{ maxWidth: 720, padding: '2rem' }}>
        <h1 style={{ color: '#C8102E' }}>Not a member</h1>
        <Link href={`/dashboard/team/${normalizedSlug}`}>← Back</Link>
      </div>
    );
  }

  const isAdmin = ADMIN_ROLES.includes(myMembership.role);

  // Fetch roster for recipient picker (A-i). Non-admins don't see this UI.
  // Limited to active members with a non-empty user_id. Admins can opt to
  // "broadcast" by leaving picker empty (backwards-compatible behavior).
  let roster: { user_id: string; role: string }[] = [];
  if (isAdmin) {
    const { data: rosterRows } = await supabaseAdmin
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', team.id)
      .is('left_at', null)
      .not('user_id', 'is', null);
    roster = (rosterRows || []).filter((r) => !!r.user_id);
  }

  // Fetch parent's managed profiles (kids) for the A-ii child picker. Only
  // matters when the caller is signing as parent/guardian and the doc is a
  // liability waiver / medical consent / code of conduct. Defensive: if the
  // caller has no kids, the picker is hidden in the UI.
  const { data: managedRows } = await supabaseAdmin
    .from('managed_profiles')
    .select('profile_id, relationship, players:profile_id (id, first_name, last_name)')
    .eq('manager_user_id', userId)
    .eq('profile_type', 'player');
  const managedKids = (managedRows || [])
    .map((m: { profile_id: string; relationship: string; players: { id: string; first_name: string; last_name: string } | { id: string; first_name: string; last_name: string }[] | null }) => {
      const p = Array.isArray(m.players) ? m.players[0] : m.players;
      if (!p) return null;
      return {
        player_id: m.profile_id as string,
        first_name: p.first_name,
        last_name: p.last_name,
        full_name: `${p.first_name} ${p.last_name}`.trim(),
        relationship: m.relationship as string,
      };
    })
    .filter((k): k is NonNullable<typeof k> => k !== null);

  // Fetch documents
  const { data: docs } = await supabaseAdmin
    .from('team_documents')
    .select('id, title, description, file_name, file_size_bytes, mime_type, required, due_date, payment_id, created_at')
    .eq('team_id', team.id)
    .order('created_at', { ascending: false });

  // Fetch signatures for these docs
  const docIds = (docs || []).map(d => d.id);
  const { data: sigs } = await supabaseAdmin
    .from('document_signatures')
    .select('id, document_id, player_id, signed_by_name, signed_by_role, acknowledged_at, signed_by_user_id, withdrawn_at')
    .in('document_id', docIds);

  // Fetch payment titles if any docs are linked to payments
  const paymentIds = [...new Set((docs || []).map(d => d.payment_id).filter(Boolean))];
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('id, title')
    .in('id', paymentIds);
  const paymentMap = new Map((payments || []).map(p => [p.id, p]));

  const enrichedDocs = (docs || []).map(d => ({
    ...d,
    payment: d.payment_id ? paymentMap.get(d.payment_id) : null,
    signatures: (sigs || []).filter(s => s.document_id === d.id),
    my_signature: (sigs || []).find(s => s.document_id === d.id && s.signed_by_user_id === userId) || null,
    // A-iv: filter change. The previous filter used `s.player_id === userId`,
    // which never matched (player_id is a UUID; userId is Clerk's `user_xxx`).
    // Effect: the "you signed this" banner was always hidden for parents.
    // With the correct filter on signed_by_user_id, the banner correctly
    // surfaces, and the Withdraw button can be wired to the same row.
    // Pre-existing quirk fixed in A-iv as a small bonus.
  }));

  return (
    <DocumentsClient
      teamId={team.id}
      teamSlug={normalizedSlug}
      teamName={team.name}
      userId={userId}
      isAdmin={isAdmin}
      roster={roster}
      managedKids={managedKids}
      documents={enrichedDocs}
    />
  );
}