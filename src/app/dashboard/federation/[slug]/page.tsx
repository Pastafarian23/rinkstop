// src/app/dashboard/federation/[slug]/page.tsx
//
// WS17 PR4 Phase 2D — Federation dashboard.
// Lists leagues affiliated with this federation, with approve/reject for pending.

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function FederationDashboardPage({ params }: PageProps) {
  const session = await auth();
  if (!session.userId) redirect('/login');
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('user_id, tier')
    .eq('user_id', session.userId)
    .maybeSingle();

  if (!profile?.tier) redirect('/dashboard');

  const { slug } = await params;

  // Load federation by slug
  const { data: federation, error: fedErr } = await supabaseAdmin
    .from('federations')
    .select('id, name, slug, country, logo_url, website')
    .eq('slug', slug)
    .maybeSingle();

  if (fedErr || !federation) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#FFB81C', padding: '1rem 1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          Federation not found.
        </div>
        <Link href="/dashboard" style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6', textDecoration: 'none' }}>← Dashboard</Link>
      </div>
    );
  }

  // Auth: verify caller is federation_admin for this federation
  const { data: conn, error: connErr } = await supabaseAdmin
    .from('rink_org_connections')
    .select('id, org_name, role')
    .eq('org_name', federation.name)
    .eq('role', 'federation_admin')
    .eq('created_by', session.userId)
    .maybeSingle();

  const isAdmin = !!conn;

  // Load all leagues for this federation
  const { data: leagues, error: leaguesErr } = await supabaseAdmin
    .from('league_members')
    .select('id, league_name, league_slug, country, website, logo_url, status, created_at')
    .eq('federation_id', federation.id)
    .order('status', { ascending: true })
    .order('created_at', { ascending: false });

  if (leaguesErr) {
    console.error('[federation-dashboard] leagues load failed', leaguesErr);
  }

  const leagueList = leagues ?? [];
  const pending = leagueList.filter(l => l.status === 'pending');
  const active = leagueList.filter(l => l.status === 'active');
  const suspended = leagueList.filter(l => l.status === 'suspended');

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dashboard" style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginTop: '0.5rem' }}>
          {federation.name} {federation.country ? `· ${federation.country}` : ''}
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          {isAdmin ? 'Federation admin dashboard — approve and manage affiliated leagues.' : 'League directory — browse member organizations.'}
        </p>
      </div>

      {!isAdmin && (
        <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', color: '#7DD3FC', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
          You don&apos;t have federation admin access. View-only mode.
        </div>
      )}

      <FederationDashboardClient
        federationId={federation.id}
        leagues={leagueList}
        pendingCount={pending.length}
        activeCount={active.length}
        suspendedCount={suspended.length}
        isAdmin={isAdmin}
      />

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link href="/dashboard" style={{ color: '#94A3B8', fontSize: '0.85rem', textDecoration: 'none' }}>← Back to dashboard</Link>
      </div>
    </div>
  );
}
