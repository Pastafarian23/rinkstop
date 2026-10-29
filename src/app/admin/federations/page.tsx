/**
 * /admin/federations — federation admin console.
 *
 * Three jobs:
 *   1. Mint a claim invite for a federation (the ONLY way a federation can
 *      claim — there is no public federation claim button).
 *   2. Review member league/club requests from federation admins.
 *   3. Review pending federation display-name changes.
 *
 * Everything here is admin-gated by the same email/role check the rest of
 * /admin uses.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import AdminFederationsClient from './AdminFederationsClient';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'arnellarracas@gmail.com';

export default async function AdminFederationsPage() {
  const session = await auth();
  if (!session?.userId) redirect('/login');
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) redirect('/login');

  if (userEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    redirect('/dashboard');
  }

  const { data: federations } = await supabaseAdmin
    .from('federations')
    .select('id, name, slug, country_code, website_url, logo_url, owner_user_id, claimable, is_active, kind, pending_name, pending_logo_url, pending_description, pending_website_url, pending_contact_email, pending_contact_phone, pending_submitted_at')
    .order('name', { ascending: true });

  const { data: invites } = await supabaseAdmin
    .from('federation_claim_invites')
    .select('id, federation_id, email, contact_name, note, max_uses, times_used, expires_at, revoked_at, accepted_by, accepted_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: memberRequests } = await supabaseAdmin
    .from('federation_member_requests')
    .select('id, federation_id, member_type, league_id, team_id, proposed_name, proposed_slug, proposed_country, proposed_level, proposed_website_url, proposed_description, status, review_note, reviewed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  // Hydrate names for display.
  const fedById: Record<string, Record<string, unknown>> = {};
  for (const f of federations || []) fedById[f.id] = f as unknown as Record<string, unknown>;

  const leagueIds = Array.from(
    new Set((memberRequests || []).map((r) => r.league_id).filter(Boolean) as string[]),
  );
  const teamIds = Array.from(
    new Set((memberRequests || []).map((r) => r.team_id).filter(Boolean) as string[]),
  );

  const leagueNames: Record<string, string> = {};
  if (leagueIds.length > 0) {
    const { data: leagues } = await supabaseAdmin
      .from('leagues')
      .select('id, name, country')
      .in('id', leagueIds);
    for (const l of leagues || []) leagueNames[l.id] = l.name;
  }
  const teamNames: Record<string, string> = {};
  if (teamIds.length > 0) {
    const { data: teams } = await supabaseAdmin
      .from('team_workspaces')
      .select('id, name, home_city')
      .in('id', teamIds);
    for (const t of teams || []) teamNames[t.id] = t.name;
  }

  const memberRequestsHydrated = (memberRequests || []).map((r) => ({
    ...r,
    federation_name: String(fedById[r.federation_id]?.name ?? '(unknown)'),
    target_name:
      (r.league_id ? leagueNames[r.league_id] : undefined) ??
      (r.team_id ? teamNames[r.team_id] : undefined) ??
      r.proposed_name ??
      '(new)',
  }));

  const invitesHydrated = (invites || []).map((i) => ({
    ...i,
    federation_name: String(fedById[i.federation_id]?.name ?? '(unknown)'),
  }));

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
        <div style={{ fontSize: '2rem' }} aria-hidden>🏛️</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.5rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0 0 0.25rem',
            }}
          >
            FEDERATIONS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            Issue claim invites, review member requests, and approve federation name changes.
            There is no public federation claim button — an invite is the only path in.
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

      <AdminFederationsClient
        federations={(federations || []) as unknown as Record<string, unknown>[]}
        invites={invitesHydrated as unknown as Record<string, unknown>[]}
        memberRequests={memberRequestsHydrated as unknown as Record<string, unknown>[]}
      />
    </div>
  );
}
