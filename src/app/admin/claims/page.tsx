import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import ClaimsQueue from './ClaimsQueue';

export const dynamic = 'force-dynamic';

// Single-admin enforcement: Arnel is the only admin today (per his 2026-07-08
// message). When additional admins are appointed, this gate moves to
// profiles.role check (admin / super_admin).
const ADMIN_EMAIL = 'arnellarracas@gmail.com';

export default async function AdminClaimsPage() {
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
    .from('claims')
    .select('id, user_id, claim_type, entity_id, entity_name, reason, proof, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(200);

  const { data: recent } = await supabaseAdmin
    .from('claims')
    .select('id, user_id, claim_type, entity_id, entity_name, reason, status, created_at, reviewed_at, reviewer_note, reviewer_user_id')
    .in('status', ['approved', 'rejected'])
    .order('reviewed_at', { ascending: false })
    .limit(50);

  // Hydrate submitter names
  const submitterIds = Array.from(
    new Set(
      [...(pending || []), ...(recent || [])].map((c) => c.user_id),
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

  // Hydrate entity labels per type
  const entityLabels: Record<string, string> = {};
  const rinkIds = Array.from(new Set([...(pending || []), ...(recent || [])].filter((c) => c.claim_type === 'rink').map((c) => c.entity_id)));
  const teamIds = Array.from(new Set([...(pending || []), ...(recent || [])].filter((c) => c.claim_type === 'team').map((c) => c.entity_id)));
  const playerIds = Array.from(new Set([...(pending || []), ...(recent || [])].filter((c) => c.claim_type === 'player').map((c) => c.entity_id)));

  if (rinkIds.length > 0) {
    const { data: rinks } = await supabaseAdmin
      .from('rinks').select('id, name, city').in('id', rinkIds);
    for (const r of rinks || []) {
      entityLabels[`rink:${r.id}`] = r.city ? `${r.name} (${r.city})` : r.name;
    }
  }
  if (teamIds.length > 0) {
    const { data: teams } = await supabaseAdmin
      .from('team_workspaces').select('id, name, home_city').in('id', teamIds);
    for (const t of teams || []) {
      entityLabels[`team:${t.id}`] = t.home_city ? `${t.name} (${t.home_city})` : t.name;
    }
  }
  if (playerIds.length > 0) {
    const { data: players } = await supabaseAdmin
      .from('players').select('id, first_name, last_name, slug').in('id', playerIds);
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
        <div style={{ fontSize: '2rem' }} aria-hidden>📋</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em',
            margin: '0 0 0.25rem',
          }}>
            CLAIMS QUEUE
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            Approve a claim to grant the submitter ownership. Player approvals also link the player row to the submitter (self-managed). Reject closes the claim with optional note.
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

      <ClaimsQueue
        pending={pending || []}
        recent={recent || []}
        submitterLabels={submitterLabels}
        entityLabels={entityLabels}
      />
    </div>
  );
}