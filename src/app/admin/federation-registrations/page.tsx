import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import FederationRegistrationsQueue from './FederationRegistrationsQueue';

export const dynamic = 'force-dynamic';

// Single-admin enforcement matching src/app/admin/claims/page.tsx pattern.
// When additional admins are appointed, this gate moves to profiles.role
// (admin / super_admin) check via getAdminFromRequest() — the API routes
// already use that.
const ADMIN_EMAIL = 'arnellarracas@gmail.com';

interface AdminRegistrationRow {
  id: string;
  registration_number: string;
  submission_status: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_at: string | null;
  submitted_by: string | null;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  player_id: string | null;
  coach_id: string | null;
  referee_user_id: string | null;
  federation: { slug: string; name: string } | null;
}

// Supabase returns nested FK joins as arrays. Flatten to single object
// so the row matches AdminRegistrationRow shape.
function flattenFederation(rows: any[]): AdminRegistrationRow[] {
  return rows.map((r) => ({
    id: r.id,
    registration_number: r.registration_number,
    submission_status: r.submission_status,
    submitted_at: r.submitted_at,
    submitted_by: r.submitted_by,
    verified_at: r.verified_at,
    verified_by: r.verified_by,
    rejection_reason: r.rejection_reason,
    player_id: r.player_id,
    coach_id: r.coach_id,
    referee_user_id: r.referee_user_id,
    federation: Array.isArray(r.federation) && r.federation.length > 0 ? r.federation[0] : null,
  }));
}

export default async function FederationRegistrationsPage() {
  const session = await auth();
  if (!session?.userId) redirect('/login');
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) redirect('/login');

  if (userEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    redirect('/dashboard');
  }

  // Pending first (admin queue), then recent decisions for audit.
  const { data: pending } = await supabaseAdmin
    .from('federation_registrations')
    .select('id, registration_number, submission_status, submitted_at, submitted_by, verified_at, verified_by, rejection_reason, player_id, coach_id, referee_user_id, federation:federations(slug, name)')
    .eq('submission_status', 'pending')
    .order('submitted_at', { ascending: true })
    .limit(200);

  const { data: recent } = await supabaseAdmin
    .from('federation_registrations')
    .select('id, registration_number, submission_status, submitted_at, submitted_by, verified_at, verified_by, rejection_reason, player_id, coach_id, referee_user_id, federation:federations(slug, name)')
    .in('submission_status', ['approved', 'rejected'])
    .order('verified_at', { ascending: false })
    .limit(50);

  // Resolve subject labels (player names) for context.
  const pendingFlat = flattenFederation((pending ?? []) as any);
  const recentFlat = flattenFederation((recent ?? []) as any);
  const playerIds = Array.from(new Set([
    ...pendingFlat.filter((r) => r.player_id).map((r) => r.player_id!),
    ...recentFlat.filter((r) => r.player_id).map((r) => r.player_id!),
  ]));
  let subjectLabels: Record<string, string> = {};
  if (playerIds.length > 0) {
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name')
      .in('id', playerIds);
    subjectLabels = Object.fromEntries(
      (players ?? []).map((p: any) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(' ') || p.id])
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#041E42', color: '#fff', padding: '2rem 1.25rem 4rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/admin" style={{ color: 'rgba(255,255,255,0.5)' }}>Admin</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Federation registrations</span>
        </nav>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            letterSpacing: '0.04em',
            marginBottom: '0.5rem',
          }}
        >
          FEDERATION REGISTRATIONS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Approve or reject federation/license number submissions. Approval unlocks the verified badge
          on the public passport. Rejection unlocks the row for the owner to edit and resubmit.
        </p>

        <FederationRegistrationsQueue
          pending={pendingFlat as AdminRegistrationRow[]}
          recent={recentFlat as AdminRegistrationRow[]}
          subjectLabels={subjectLabels}
        />
      </div>
    </main>
  );
}
