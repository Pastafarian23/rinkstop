import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import PaymentDetailClient from './PaymentDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

const ADMIN_ROLES = ['head_coach','assistant_coach','manager','president','vice_president','treasurer','secretary'];

export default async function PaymentDetailPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  const { slug, id } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, currency')
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

  // Fetch payment + records + member display info
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('id', id)
    .eq('team_id', team.id)
    .maybeSingle();
  if (!payment) notFound();

  const { data: records } = await supabaseAdmin
    .from('payment_records')
    .select('*')
    .eq('payment_id', id)
    .order('created_at', { ascending: true });

  // Get player display names
  const playerIds = [...new Set((records || []).map(r => r.player_id))];
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('user_id, display_name, username')
    .in('user_id', playerIds);

  const profileMap = new Map<string, { display_name: string | null; username: string | null }>();
  for (const p of profiles || []) {
    profileMap.set(p.user_id, { display_name: p.display_name, username: p.username });
  }

  const enrichedRecords = (records || []).map(r => ({
    ...r,
    player_name: profileMap.get(r.player_id)?.display_name || profileMap.get(r.player_id)?.username || `User ${r.player_id.slice(0, 10)}`,
    is_self: r.player_id === userId,
  }));

  return (
    <PaymentDetailClient
      teamId={team.id}
      teamSlug={normalizedSlug}
      teamName={team.name}
      payment={payment}
      records={enrichedRecords}
      isAdmin={isAdmin}
    />
  );
}