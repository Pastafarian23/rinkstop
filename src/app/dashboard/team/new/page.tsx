import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { isIdentityVerified } from '@/lib/identity-verified';
import NewTeamForm from './NewTeamForm';

export const dynamic = 'force-dynamic';

export default async function NewTeamPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  // Identity verification gate. Piece C: uses hardened helper that
  // also requires profiles.didit_session_id and a matching approved
  // didit_sessions row. Bare flag is no longer trusted.
  const [{ data: profile }, isVerified] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('user_id', userId)
      .maybeSingle(),
    isIdentityVerified(userId),
  ]);

  // Fetch all active rinks (limit to 200 for the dropdown — should be enough for v1)
  const { data: rinks } = await supabaseAdmin
    .from('rinks')
    .select('id, name, slug, city, country, province_state')
    .eq('is_active', true)
    .order('name')
    .limit(200);

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '2rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.25rem',
          }}
        >
          Create a Team
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0 }}>
          Set up a private workspace for your team. You&rsquo;ll be the head coach.
        </p>
      </div>

      {!isVerified ? (
        <div
          style={{
            background: 'rgba(255,184,28,0.08)',
            border: '1px solid rgba(255,184,28,0.3)',
            borderRadius: 12,
            padding: '1.5rem 1.75rem',
            color: '#FFB81C',
          }}
        >
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              margin: '0 0 0.5rem',
              color: '#FFB81C',
            }}
          >
            Verify your identity first
          </h2>
          <p
            style={{
              color: 'rgba(255,184,28,0.85)',
              fontSize: '0.875rem',
              margin: '0 0 1rem',
            }}
          >
            Creating a team workspace requires identity verification. This protects the platform
            from fake teams and ensures coaches are accountable.
          </p>
          <a
            href="/dashboard/identity"
            style={{
              display: 'inline-block',
              padding: '0.6rem 1.25rem',
              background: '#FFB81C',
              color: '#041E42',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 700,
            }}
          >
            Verify identity →
          </a>
        </div>
      ) : (
        <NewTeamForm rinks={rinks || []} />
      )}
    </div>
  );
}
