import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserOrgTier } from '@/lib/connections';
import { getTeamAuthority, rosterBlockMessage } from '@/lib/team-authority';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import RosterEditor, {
  type RosterMember,
  type RosterPlayer,
} from './RosterEditor';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Team roster editor.
 *
 * Lets a team admin manage the roster: add members (people with a RinkStop
 * account, with a team role) and players (player records linked for a
 * stint). Anything added here is coach-verified by definition, which is
 * what the public roster's "COACH VERIFIED" marker reflects.
 *
 * Authority is role-scoped per team and tier-gated — see
 * `src/lib/team-authority.ts`. The page and the API use the same helper, so
 * the UI can never offer an action the server would refuse.
 */
export default async function TeamRosterPage({ params }: PageProps) {
  const session = await auth();
  if (!session.userId) redirect('/login');
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) redirect('/login');

  const { id: teamId } = await params;

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, name, slug, organization_id')
    .eq('id', teamId)
    .maybeSingle();

  if (!team) {
    return (
      <div style={{ maxWidth: 720 }}>
        <div
          style={{
            background: 'rgba(200,16,46,0.1)',
            border: '1px solid rgba(200,16,46,0.4)',
            color: '#FF6B7A',
            padding: '1rem 1.25rem',
            borderRadius: 8,
          }}
        >
          Could not load team. It may have been removed.
        </div>
        <Link href="/dashboard/claims" style={{ display: 'inline-block', marginTop: '1rem', color: '#14B8A6' }}>
          ← Back to claims
        </Link>
      </div>
    );
  }

  const authority = await getTeamAuthority(userId, teamId);

  // Read the roster. Anyone with authority can read it; the public page
  // shows the same data, so there is nothing secret here.
  const [membersRes, playersRes] = await Promise.all([
    supabaseAdmin
      .from('team_members')
      .select(
        'id, user_id, role, jersey_number, position, shoots, birth_date, ' +
          'joined_at, left_at, is_minor, parent_user_id, notes, ' +
          'profiles:user_id(display_name, username, avatar_url)',
      )
      .eq('team_id', teamId)
      .is('left_at', null)
      .order('role')
      .order('joined_at')
      .returns<RosterMember[]>(),
    supabaseAdmin
      .from('hockey_player_team_history')
      .select(
        'id, player_id, jersey_number, position, role, verification_source, ' +
          'season_id, start_date, end_date, ' +
          'players!inner(id, first_name, last_name, slug, headshot_url, nationality)',
      )
      .eq('team_id', teamId)
      .order('jersey_number', { ascending: true, nullsFirst: false })
      .limit(200)
      .returns<RosterPlayer[]>(),
  ]);

  const members = (membersRes.data || []) as RosterMember[];
  const players = (playersRes.data || []) as RosterPlayer[];

  const orgTier = await getUserOrgTier(userId);
  const needsOrgPlan = authority.canManage === false && authority.reason === 'org-plan-required';

  return (
    <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div style={{ fontSize: '1.75rem' }}>🏒</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.5rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0 0 0.25rem',
            }}
          >
            ROSTER
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
            {team.name as string} ·{' '}
            <Link
              href={`/directory/teams/${(team as { slug?: string }).slug || teamId}`}
              style={{ color: '#14B8A6' }}
            >
              view public page →
            </Link>
          </p>
        </div>
      </div>

      {!authority.canView && (
        <div
          style={{
            background: 'rgba(255,184,28,0.08)',
            border: '1px solid rgba(255,184,28,0.3)',
            color: '#FFB81C',
            padding: '1rem 1.25rem',
            borderRadius: 8,
            fontSize: '0.875rem',
          }}
        >
          {rosterBlockMessage(authority.reason)}
        </div>
      )}

      {needsOrgPlan && (
        <UpgradePrompt
          forGroup="organization"
          entityLabel="team"
          requiredTier="Organization Plus"
          userCurrentTier={orgTier === 'org_free' ? undefined : orgTier}
        />
      )}

      {authority.canView && (
        <RosterEditor
          teamId={teamId}
          members={members}
          players={players}
          authority={authority}
          blockMessage={rosterBlockMessage(authority.reason)}
        />
      )}

      <div>
        <Link href={`/dashboard/manage/team/${teamId}`} style={{ color: '#14B8A6', fontSize: '0.8125rem' }}>
          ← Back to team settings
        </Link>
      </div>
    </div>
  );
}
