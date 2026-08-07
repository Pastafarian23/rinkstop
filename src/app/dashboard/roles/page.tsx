import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { getUserTier } from '@/lib/connections';
import AccountTypePicker from '@/components/AccountTypePicker';
import LinkedRecordsManager from '@/components/LinkedRecordsManager';

export const dynamic = 'force-dynamic';

interface ManagedRow {
  id: string;
  manager_user_id: string;
  profile_type: 'player' | 'team' | 'league';
  profile_id: string;
  relationship: string;
  profile: {
    first_name?: string;
    last_name?: string;
    name?: string;
    slug?: string;
    headshot_url?: string;
    logo_url?: string;
  } | null;
}

/**
 * /dashboard/roles
 *
 * Single page that owns both "what hats do I wear?" (profile_account_types)
 * and "which real-world records do I steward?" (managed_profiles).
 *
 * Replaces the two inline <AccountTypePicker/> mounts that used to live
 * on /dashboard/page.tsx. Saves one extra navigation hop.
 */
export default async function RolesPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);

  if (!session.userId) redirect('/login');

  const tier = userId ? await getUserTier(userId) : 'free';

  // Fetch the user's managed profiles (server-side, then hydrate).
  // Same shape as /api/profiles/managed (which we use client-side to
  // refresh the list after add/remove). Keep them in sync by reusing
  // the same query path: read managed_profiles, then fan out to the
  // linked player/team/league tables.
  const { data: rows } = await supabaseAdmin
    .from('managed_profiles')
    .select('id, manager_user_id, profile_type, profile_id, relationship')
    .eq('manager_user_id', userId);

  const managed = (rows || []) as Array<Pick<ManagedRow, 'id' | 'manager_user_id' | 'profile_type' | 'profile_id' | 'relationship'>>;

  const playerIds = managed.filter((r) => r.profile_type === 'player').map((r) => r.profile_id);
  const teamIds = managed.filter((r) => r.profile_type === 'team').map((r) => r.profile_id);
  const leagueIds = managed.filter((r) => r.profile_type === 'league').map((r) => r.profile_id);

  const [playerRes, teamRes, leagueRes] = await Promise.all([
    playerIds.length > 0
      ? supabaseAdmin.from('players').select('id, first_name, last_name, slug, headshot_url').in('id', playerIds)
      : Promise.resolve({ data: [] as any[] }),
    teamIds.length > 0
      ? supabaseAdmin.from('team_workspaces').select('id, name, slug, avatar_url').in('id', teamIds)
      : Promise.resolve({ data: [] as any[] }),
    leagueIds.length > 0
      ? supabaseAdmin.from('leagues').select('id, name, slug, logo_url').in('id', leagueIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const playerMap = new Map<string, any>();
  for (const p of (playerRes.data as any[]) ?? []) playerMap.set(p.id, p);
  const teamMap = new Map<string, any>();
  for (const t of (teamRes.data as any[]) ?? []) teamMap.set(t.id, t);
  const leagueMap = new Map<string, any>();
  for (const l of (leagueRes.data as any[]) ?? []) leagueMap.set(l.id, l);

  const initialManaged: ManagedRow[] = managed.map((r) => {
    let profile: ManagedRow['profile'] = null;
    if (r.profile_type === 'player') {
      const p = playerMap.get(r.profile_id);
      if (p) profile = { first_name: p.first_name, last_name: p.last_name, slug: p.slug, headshot_url: p.headshot_url };
    } else if (r.profile_type === 'team') {
      const t = teamMap.get(r.profile_id);
      if (t) profile = { name: t.name, slug: t.slug, logo_url: t.logo_url };
    } else if (r.profile_type === 'league') {
      const l = leagueMap.get(r.profile_id);
      if (l) profile = { name: l.name, slug: l.slug, logo_url: l.logo_url };
    }
    return { ...r, profile };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 880 }}>
      <header>
        <h1
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.6rem',
            color: '#fff',
            letterSpacing: '0.05em',
            margin: '0 0 0.25rem',
          }}
        >
          YOUR HOCKEY IDENTITY
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0 }}>
          Pick the roles you wear in hockey, then link the records you steward. Both are visible on your public profile.
        </p>
      </header>

      {/* Roles */}
      <section
        id="account-types"
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.5rem',
        }}
      >
        <header style={{ marginBottom: '1rem' }}>
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.15rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            YOUR ROLES
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', margin: '0.25rem 0 0' }}>
            Multi-select. Pick whichever fit. The primary shows next to your name.
          </p>
        </header>
        <AccountTypePicker />
      </section>

      {/* Linked records */}
      <section
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.5rem',
        }}
      >
        <header style={{ marginBottom: '1rem' }}>
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.15rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            LINKED RECORDS
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', margin: '0.25rem 0 0' }}>
            Player records you own, teams you run, leagues you admin. These show as Connected Profiles on your public page.
          </p>
        </header>
        <LinkedRecordsManager initialManaged={initialManaged} tier={tier} />
      </section>

      <footer style={{ paddingTop: '0.5rem' }}>
        <Link href="/dashboard" style={{ color: '#14B8A6', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Back to dashboard
        </Link>
      </footer>
    </div>
  );
}