import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import JoinForm from './JoinForm';
import { countryFlag } from '@/lib/team';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    const { code } = await params;
    // Send unauthenticated users to sign-up, then return here
    redirect(`/sign-up?redirect_url=${encodeURIComponent(`/join/${code}`)}`);
  }

  const { code } = await params;
  const normalizedCode = code.toUpperCase().trim();

  // Peek at the invite + team to show the user what they're joining
  // (doesn't reveal the team to non-invitees — just shows a nice preview to people who have a code)
  const { data: invite } = await supabaseAdmin
    .from('team_invites')
    .select('id, role, max_uses, times_used, expires_at, revoked_at, team_id')
    .eq('code', normalizedCode)
    .maybeSingle();

  let teamPreview: { name: string; country_code: string | null; home_city: string | null; home_country: string | null } | null = null;
  if (invite) {
    const { data: t } = await supabaseAdmin
      .from('team_workspaces')
      .select('name, country_code, home_city, home_country')
      .eq('id', invite.team_id)
      .eq('is_active', true)
      .maybeSingle();
    teamPreview = t;
  }

  // Check identity verification
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('identity_verified_at, identity_expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  const isVerified =
    !!profile?.identity_verified_at &&
    (!profile.identity_expires_at || new Date(profile.identity_expires_at) > new Date());

  // Pre-check invite state for messaging (without exposing too much)
  const inviteState = invite
    ? invite.revoked_at
      ? 'revoked'
      : invite.expires_at && new Date(invite.expires_at) < new Date()
      ? 'expired'
      : invite.times_used >= invite.max_uses
      ? 'exhausted'
      : 'active'
    : 'not_found';

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingTop: '2rem' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #041E42 0%, #0a2d5a 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: '2rem 1.75rem',
          textAlign: 'center',
          color: '#fff',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            fontSize: '3rem',
            marginBottom: '0.5rem',
          }}
          aria-hidden
        >
          🏒
        </div>
        <h1
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.75rem',
            letterSpacing: '0.05em',
            margin: '0 0 0.5rem',
          }}
        >
          Join a Team
        </h1>
        {teamPreview && inviteState === 'active' && (
          <p
            style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: '0.9rem',
              margin: '0 0 1.5rem',
            }}
          >
            You&rsquo;ve been invited to join{' '}
            <strong style={{ color: '#FFB81C' }}>
              {countryFlag(teamPreview.country_code)} {teamPreview.name}
            </strong>
            {teamPreview.home_city && (
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                {' '}in {teamPreview.home_city}
                {teamPreview.home_country ? `, ${teamPreview.home_country}` : ''}
              </span>
            )}
            .
          </p>
        )}
        {inviteState !== 'active' && (
          <p
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.85rem',
              margin: '0 0 1.5rem',
            }}
          >
            Enter your team&rsquo;s invite code to join.
          </p>
        )}

        {!isVerified ? (
          <div
            style={{
              background: 'rgba(255,184,28,0.10)',
              border: '1px solid rgba(255,184,28,0.3)',
              color: '#FFB81C',
              padding: '1rem',
              borderRadius: 8,
              fontSize: '0.85rem',
              textAlign: 'left',
            }}
          >
            <strong>Verify your identity first</strong> before joining a team.
            <div style={{ marginTop: '0.75rem' }}>
              <a
                href="/dashboard/identity"
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  background: '#FFB81C',
                  color: '#041E42',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                Verify identity →
              </a>
            </div>
          </div>
        ) : (
          <JoinForm initialCode={normalizedCode} initialInviteState={inviteState} />
        )}
      </div>
    </div>
  );
}
