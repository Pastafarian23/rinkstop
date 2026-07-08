import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import CorrectionQueue from './CorrectionQueue';

export const dynamic = 'force-dynamic';

// Single-admin enforcement: Arnel is the only admin today (per his 2026-07-08
// message). If a second admin is appointed later, this gate moves to the
// profiles.role check (admin / super_admin).
const ADMIN_EMAIL = 'arnellarracas@gmail.com';

export default async function AdminCorrectionsPage() {
  const session = await auth();
  if (!session?.userId) redirect('/login');
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) redirect('/login');

  if (userEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    redirect('/dashboard');
  }

  const { data: pending } = await supabaseAdmin
    .from('corrections')
    .select('id, entity_type, entity_id, field_name, current_value, proposed_value, reason, submitter_user_id, status, submitted_at')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true })
    .limit(200);

  const { data: recent } = await supabaseAdmin
    .from('corrections')
    .select('id, entity_type, entity_id, field_name, current_value, proposed_value, reason, submitter_user_id, status, submitted_at, reviewed_at, reviewer_note, reviewer_user_id')
    .in('status', ['approved', 'rejected', 'review_required'])
    .order('reviewed_at', { ascending: false })
    .limit(50);

  // Hydrate submitter names for display
  const submitterIds = Array.from(
    new Set(
      [...(pending || []), ...(recent || [])].map((s) => s.submitter_user_id),
    ),
  );
  const submitterLabels: Record<string, string> = {};
  if (submitterIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, username, email')
      .in('user_id', submitterIds);
    for (const p of profiles || []) {
      submitterLabels[p.user_id] =
        p.display_name || p.username || (p.email ? p.email.split('@')[0] : p.user_id.slice(0, 12));
    }
  }

  // Hydrate player labels for entity references (player entity only in v1)
  const playerIds = Array.from(
    new Set(
      [...(pending || []), ...(recent || [])]
        .filter((s) => s.entity_type === 'player')
        .map((s) => s.entity_id),
    ),
  );
  const entityLabels: Record<string, string> = {};
  if (playerIds.length > 0) {
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, slug')
      .in('id', playerIds);
    for (const p of players || []) {
      const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.slug || p.id.slice(0, 8);
      entityLabels[`player:${p.id}`] = name;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 1100 }}>
      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.5rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: '2rem' }} aria-hidden>🛠️</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em',
            margin: '0 0 0.25rem',
          }}>
            CORRECTIONS QUEUE
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            Review user-submitted corrections. Approve applies the change (player fields only in v1). Reject closes it. Anything else becomes review_required.
          </p>
        </div>
        <Link
          href="/admin"
          style={{
            padding: '0.45rem 0.9rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.7)',
            borderRadius: 6,
            fontSize: '0.8rem',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          ← Admin home
        </Link>
      </div>

      <CorrectionQueue
        pending={pending || []}
        recent={recent || []}
        submitterLabels={submitterLabels}
        entityLabels={entityLabels}
      />
    </div>
  );
}