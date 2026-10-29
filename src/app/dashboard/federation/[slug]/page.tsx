/**
 * /dashboard/federation/[slug] — the federation owner's control panel.
 *
 * This is the surface that makes the invite worth accepting. A national
 * governing body that claims its listing gets:
 *
 *   1. Its profile (name, logo, website, contact, description) — editable
 *      and live immediately (name changes go to Arnel for approval).
 *   2. Its member leagues — add existing leagues, or propose a new one.
 *   3. Its member clubs — add existing clubs.
 *   4. A live view of every rink, team and league in its country, so they
 *      can see what RinkStop already knows about their sport.
 *
 * League and club additions are queued for Arnel's approval before they
 * affect the public directory — a federation admin (or a leaked invite) must
 * not be able to attach arbitrary rows to a national body.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { isFederationOwner, countryNameFromCode } from '@/lib/federation-ownership';
import FederationDashboardClient from './FederationDashboardClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function FederationDashboardPage({ params }: PageProps) {
  const session = await auth();
  if (!session.userId) redirect('/login');

  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) redirect('/login');

  const { slug } = await params;

  const { data: federation, error: fedErr } = await supabaseAdmin
    .from('federations')
    .select(
      'id, name, slug, country_code, logo_url, website_url, description, contact_email, contact_phone, owner_user_id, pending_name, pending_logo_url, pending_description, pending_website_url, pending_contact_email, pending_contact_phone, pending_submitted_at, is_active, kind, category',
    )
    .eq('slug', slug)
    .maybeSingle();

  if (fedErr || !federation) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.4)', color: '#FF6B7A', padding: '1rem 1.25rem', borderRadius: 8 }}>
          Federation not found.
        </div>
        <Link href="/dashboard" style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6' }}>
          ← Dashboard
        </Link>
      </div>
    );
  }

  const isOwner = await isFederationOwner(userId, federation.id);

  if (!isOwner) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ background: 'rgba(255,184,28,0.08)', border: '1px solid rgba(255,184,28,0.3)', color: '#FFB81C', padding: '1rem 1.25rem', borderRadius: 8, fontSize: '0.9rem' }}>
          You are not the approved administrator for {federation.name}. If you believe you should be,
          reply to the email your claim invitation came from.
        </div>
        <Link href="/dashboard" style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6' }}>
          ← Dashboard
        </Link>
      </div>
    );
  }

  // --- Member leagues ---
  const { data: memberLeagues } = await supabaseAdmin
    .from('leagues')
    .select('id, name, slug, country, level, website_url, is_active')
    .eq('federation_id', federation.id)
    .order('name', { ascending: true });

  // --- Member clubs ---
  const { data: memberClubs } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, name, slug, home_city, home_country, level, visibility, is_active')
    .eq('federation_id', federation.id)
    .order('name', { ascending: true });

  // --- Pending member requests (submitted by this admin, awaiting Arnel) ---
  const { data: pendingRequests } = await supabaseAdmin
    .from('federation_member_requests')
    .select('id, member_type, league_id, team_id, proposed_name, proposed_slug, proposed_country, proposed_level, proposed_website_url, proposed_description, status, created_at')
    .eq('federation_id', federation.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // --- Everything in their country, so they can see the gap ---
  const countryCode = federation.country_code;
  const countryName = await countryNameFromCode(countryCode);

  const [rinkRows, leagueRows, teamRows] = countryName
    ? await Promise.all([
        supabaseAdmin
          .from('rinks')
          .select('id, name, slug, city, province_state, capacity, status, is_active')
          .eq('country', countryName)
          .order('name', { ascending: true })
          .limit(300),
        supabaseAdmin
          .from('leagues')
          .select('id, name, slug, country, level, federation_id, is_active')
          .eq('country', countryName)
          .order('name', { ascending: true })
          .limit(200),
        supabaseAdmin
          .from('team_workspaces')
          .select('id, name, slug, home_city, level, visibility, federation_id')
          .eq('home_country', countryName)
          .eq('visibility', 'public')
          .order('name', { ascending: true })
          .limit(400),
      ])
    : [
        { data: [] as Record<string, unknown>[] },
        { data: [] as Record<string, unknown>[] },
        { data: [] as Record<string, unknown>[] },
      ];

  const linkedLeagueIds = new Set((memberLeagues || []).map((l) => l.id));
  const linkedTeamIds = new Set((memberClubs || []).map((c) => c.id));

  const unlinkedLeagues = (leagueRows.data || []).filter((l) => !linkedLeagueIds.has(l.id));
  const unlinkedTeams = (teamRows.data || []).filter((t) => !linkedTeamIds.has(t.id));

  return (
    <FederationDashboardClient
      federation={federation as unknown as Record<string, unknown>}
      memberLeagues={(memberLeagues || []) as unknown as Record<string, unknown>[]}
      memberClubs={(memberClubs || []) as unknown as Record<string, unknown>[]}
      pendingRequests={(pendingRequests || []) as unknown as Record<string, unknown>[]}
      availableLeagues={unlinkedLeagues as unknown as Record<string, unknown>[]}
      availableClubs={unlinkedTeams as unknown as Record<string, unknown>[]}
      countryRinks={(rinkRows.data || []) as unknown as Record<string, unknown>[]}
      countryName={countryName}
    />
  );
}

