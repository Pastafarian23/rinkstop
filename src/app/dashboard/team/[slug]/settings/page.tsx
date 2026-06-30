import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminRole } from '@/lib/team';
import TeamSettingsForm from './TeamSettingsForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TeamSettingsPage({ params }: PageProps) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('*')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!team) notFound();

  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();

  if (!membership) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div
          style={{
            background: 'rgba(200,16,46,0.10)',
            border: '1px solid rgba(200,16,46,0.4)',
            color: '#FF6B7A',
            padding: '1.5rem 1.75rem',
            borderRadius: 12,
          }}
        >
          <h2 style={{ margin: '0 0 0.5rem', color: '#FF6B7A' }}>Not a member</h2>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            You aren&rsquo;t on this team&rsquo;s roster.
          </p>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              color: '#14B8A6',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdminRole(membership.role)) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div
          style={{
            background: 'rgba(255,184,28,0.10)',
            border: '1px solid rgba(255,184,28,0.4)',
            color: '#FFB81C',
            padding: '1.5rem 1.75rem',
            borderRadius: 12,
          }}
        >
          <h2 style={{ margin: '0 0 0.5rem', color: '#FFB81C' }}>Admin only</h2>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Only head coaches, assistant coaches, goalie coaches, skills coaches, managers, and
            team staff can edit team settings.
          </p>
          <Link
            href={`/dashboard/team/${team.slug}`}
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              color: '#14B8A6',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            ← Back to team
          </Link>
        </div>
      </div>
    );
  }

  // Pass the full row (whitelisted fields) to the client form.
  const initial = {
    slug: team.slug ?? '',
    name: team.name ?? '',
    short_name: team.short_name ?? '',
    parent_org: team.parent_org ?? '',
    home_city: team.home_city ?? '',
    home_country: team.home_country ?? '',
    country_code: team.country_code ?? '',
    currency: team.currency ?? 'PHP',
    age_category: team.age_category ?? 'youth',
    age_label: team.age_label ?? '',
    age_min: team.age_min ?? null,
    age_max: team.age_max ?? null,
    level: team.level ?? '',
    season_label: team.season_label ?? '',
    founded_on: team.founded_on ?? null,
    description: team.description ?? '',
    contact_email: team.contact_email ?? '',
    contact_phone: team.contact_phone ?? '',
    visibility: team.visibility ?? 'private',
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href={`/dashboard/team/${team.slug}`}
          style={{
            display: 'inline-block',
            color: 'rgba(255,255,255,0.55)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            marginBottom: '0.75rem',
          }}
        >
          ← Back to {team.name}
        </Link>
        <h1
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '2rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.25rem',
          }}
        >
          Team Settings
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0 }}>
          Update your team&rsquo;s identity, contact info, and visibility. Changes apply
          immediately across the platform.
        </p>
      </div>

      <TeamSettingsForm slug={team.slug} initial={initial} />
    </div>
  );
}