import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import ReportsClient from './ReportsClient';

export const dynamic = 'force-dynamic';

export default async function TeamReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.userId) redirect('/login');
  const userEmail = (await currentUser())?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) redirect('/login');

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, owner_user_id')
    .eq('slug', slug.toLowerCase())
    .eq('is_active', true)
    .maybeSingle();
  if (!team) {
    return <div style={{ padding: '2rem', color: '#fff' }}>Team not found.</div>;
  }

  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
    return <div style={{ padding: '2rem', color: '#fff' }}>Admin only.</div>;
  }

  return <ReportsClient teamSlug={team.slug} teamName={team.name} userId={userId} />;
}
