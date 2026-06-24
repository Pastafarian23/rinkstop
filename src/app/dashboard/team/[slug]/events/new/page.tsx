import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { hasTeamAdminAccess } from '@/lib/tier-gate';
import EventForm from '@/components/team/EventForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function NewEventPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const { slug } = await params;
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
      <div style={{ maxWidth: 720, padding: '2rem 1.5rem' }}>
        <h1 style={{ color: '#C8102E' }}>Not a member</h1>
        <Link href={`/dashboard/team/${normalizedSlug}`} style={{ color: '#FFB81C' }}>
          ← Back to team
        </Link>
      </div>
    );
  }

  const gate = await hasTeamAdminAccess(userId);
  if (!gate.allowed) {
    return (
      <div style={{ maxWidth: 640, padding: '2rem 1.5rem' }}>
        <Link href={`/dashboard/team/${normalizedSlug}/events`} style={{ fontSize: 13, color: '#FFB81C', textDecoration: 'none' }}>
          ← Back to events
        </Link>
        <div style={{
          marginTop: 16, padding: '2rem', textAlign: 'center',
          background: '#0f0f0f', border: '1px solid rgba(255,184,28,0.4)', borderRadius: 12,
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🛡️</div>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em', margin: '0 0 8px' }}>
            UPGRADE TO CREATE EVENTS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, margin: '0 0 16px' }}>
            Event creation, attendance tracking, and team dues are part of RinkStop&rsquo;s paid tiers.
          </p>
          <Link
            href="/pricing"
            style={{
              display: 'inline-block', padding: '0.6rem 1.25rem',
              background: '#FFB81C', color: '#0D1117', borderRadius: 6,
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
            }}
          >
            See pricing
          </Link>
        </div>
      </div>
    );
  }

  // Load rinks and practice plans for the form
  const [{ data: rinks }, { data: plans }] = await Promise.all([
    supabaseAdmin.from('rinks').select('id, name').order('name').limit(500),
    supabaseAdmin.from('practice_plans').select('id, title, slug').eq('is_published', true).order('title').limit(200),
  ]);

  return (
    <div style={{ maxWidth: 760, padding: '2rem 1.5rem' }}>
      <Link href={`/dashboard/team/${normalizedSlug}/events`} style={{ fontSize: 13, color: '#FFB81C', textDecoration: 'none' }}>
        ← Back to events
      </Link>
      <div style={{ marginTop: 8, marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '2rem', color: '#fff', letterSpacing: '0.05em', margin: 0 }}>
          NEW EVENT
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
          Schedule a practice, game, tournament, meeting, or team event for {team.name}
        </p>
      </div>
      <div style={{
        background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: '1.5rem',
      }}>
        <EventForm
          teamSlug={normalizedSlug}
          rinks={rinks || []}
          practicePlans={plans || []}
          defaultCurrency={team.currency || 'USD'}
        />
      </div>
    </div>
  );
}