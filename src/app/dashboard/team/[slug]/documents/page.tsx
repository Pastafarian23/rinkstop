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
    .select('document_id, player_id, signed_by_name, signed_by_role, acknowledged_at')
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
    my_signature: (sigs || []).find(s => s.document_id === d.id && s.player_id === userId) || null,
  }));

  return (
    <DocumentsClient
      teamId={team.id}
      teamSlug={normalizedSlug}
      teamName={team.name}
      userId={userId}
      isAdmin={isAdmin}
      documents={enrichedDocs}
    />
  );
}