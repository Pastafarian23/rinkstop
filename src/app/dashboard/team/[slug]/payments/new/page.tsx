import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import NewPaymentForm from './NewPaymentForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function NewPaymentPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, currency')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) notFound();

  // Must be admin
  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  const adminRoles = ['head_coach','assistant_coach','manager','president','vice_president','treasurer','secretary'];
  if (!myMembership || !adminRoles.includes(myMembership.role)) {
    return (
      <div style={{ maxWidth: 720, padding: '2rem' }}>
        <h1 style={{ color: '#C8102E' }}>Coaches only</h1>
        <p>Only team coaches, managers, and admins can create payments.</p>
        <Link href={`/dashboard/team/${normalizedSlug}/payments`}>← Back to payments</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, padding: '2rem 1.5rem' }}>
      <Link href={`/dashboard/team/${normalizedSlug}/payments`} style={{ fontSize: '0.85rem', color: '#041E42' }}>
        ← Back to payments
      </Link>
      <h1 style={{ margin: '0.5rem 0 0.5rem', color: '#041E42', fontSize: '1.875rem', fontWeight: 800 }}>
        New payment event
      </h1>
      <p style={{ margin: '0 0 1.5rem', color: '#6b7280' }}>
        For {team.name}.
      </p>
      <NewPaymentForm
        teamId={team.id}
        teamSlug={normalizedSlug}
        defaultCurrency={team.currency || 'PHP'}
      />
    </div>
  );
}