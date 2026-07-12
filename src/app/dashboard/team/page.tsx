import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminRole } from '@/lib/team';

export const dynamic = 'force-dynamic';

interface HierarchyRef { id: string; name: string; slug: string | null }

interface TeamMembership {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  country_code: string | null;
  age_label: string | null;
  age_min: number | null;
  age_max: number | null;
  parent_org: string | null;
  organization_id: string | null;
  organization: HierarchyRef | null;
  role: string;
}

export default async function TeamIndexPage() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  // Pull the same "your teams" data the dashboard card uses, scoped only to
  // active workspaces. This is the source of truth for the bottom-nav Team tab.
  let teams: TeamMembership[] = [];
  let queryError: string | null = null;
  try {
    const { data, error } = await supabaseAdmin
      .from('team_members')
      .select(`
        role,
        team_workspaces:team_id (
          id, slug, name, short_name, country_code,
          age_label, age_min, age_max, parent_org, organization_id, is_active,
          organization:organizations(id, name, slug)
        )
      `)
      .eq('user_id', userId)
      .is('left_at', null)
      .order('joined_at', { ascending: false })
      .limit(50);

    if (error) {
      queryError = error.message;
    } else {
      teams = (data || [])
        .map((row: any) => ({ ...(row.team_workspaces || {}), role: row.role }))
        .filter((t: TeamMembership) => t.id && t.slug);
    }
  } catch (e: any) {
    queryError = e?.message || 'Failed to load teams';
  }

  // Group teams: active first, then by organization (preferred) so multi-team
  // orgs cluster. Fall back to parent_org text (legacy) when no org FK exists.
  const grouped = new Map<string, TeamMembership[]>();
  for (const t of teams) {
    const key = t.organization?.name || t.parent_org || 'Independent';
    const list = grouped.get(key) || [];
    list.push(t);
    grouped.set(key, list);
  }
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
    if (a === 'Independent') return 1;
    if (b === 'Independent') return -1;
    return a.localeCompare(b);
  });

  const user = await currentUser();
  const firstName = user?.firstName || '';

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 1rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          margin: '0 0 1.5rem',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '2rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            Your Teams
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.9rem',
              margin: '0.25rem 0 0',
            }}
          >
            {firstName ? `${firstName}'s` : 'Your'} private team workspaces
            {teams.length > 0 && ` · ${teams.length}`}
          </p>
        </div>
        <Link
          href="/dashboard/team/new"
          style={{
            padding: '0.65rem 1.25rem',
            background: '#C8102E',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          + Create new team
        </Link>
      </div>

      {queryError && (
        <div
          style={{
            background: 'rgba(200,16,46,0.08)',
            border: '1px solid rgba(200,16,46,0.3)',
            borderRadius: 12,
            padding: '1rem 1.25rem',
            color: '#FF6B7A',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
          }}
        >
          Couldn&rsquo;t load teams: {queryError}
        </div>
      )}

      {teams.length === 0 && !queryError ? (
        <div
          style={{
            background: '#0f0f0f',
            border: '1px solid #1e1e1e',
            borderRadius: 12,
            padding: '2.5rem 1.75rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏒</div>
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.25rem',
              color: '#fff',
              letterSpacing: '0.05em',
              margin: '0 0 0.5rem',
            }}
          >
            No teams yet
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.9rem',
              margin: '0 0 1.5rem',
              lineHeight: 1.5,
            }}
          >
            Create a private workspace for your team. You&rsquo;ll be the head coach
            and can invite players, parents, and other coaches.
          </p>
          <Link
            href="/dashboard/team/new"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#C8102E',
              color: '#fff',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 700,
            }}
          >
            Create your first team →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {sortedKeys.map((orgName) => {
            const list = grouped.get(orgName) || [];
            return (
              <div key={orgName}>
                {sortedKeys.length > 1 && (
                  <h3
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'rgba(255,255,255,0.35)',
                      margin: '0 0 0.75rem',
                    }}
                  >
                    {orgName}
                  </h3>
                )}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '0.875rem',
                  }}
                >
                  {list.map((team) => {
                    const ageBand =
                      team.age_label ||
                      (team.age_min != null && team.age_max != null
                        ? `${team.age_min}U–${team.age_max}U`
                        : null);
                    const canManage = isAdminRole(team.role);
                    return (
                      <div
                        key={team.id}
                        style={{
                          background: '#0f0f0f',
                          border: '1px solid #1e1e1e',
                          borderRadius: 12,
                          padding: '1.25rem 1.25rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          transition: 'border-color 0.15s',
                        }}
                      >
                      <Link
                        href={`/dashboard/team/${team.slug}`}
                        style={{
                          textDecoration: 'none',
                          display: 'block',
                          background: '#0f0f0f',
                          border: '1px solid #1e1e1e',
                          borderRadius: 12,
                          padding: '1.25rem 1.25rem 1rem',
                          transition: 'border-color 0.15s, transform 0.15s',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              background: 'linear-gradient(135deg, #C8102E 0%, #8b0a1e 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontFamily: "'Bebas Neue', Impact, sans-serif",
                              fontSize: '1.1rem',
                              flexShrink: 0,
                            }}
                          >
                            {(team.short_name || team.name).slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {team.name}
                            </div>
                            <div
                              style={{
                                color: 'rgba(255,255,255,0.45)',
                                fontSize: '0.75rem',
                                marginTop: 1,
                              }}
                            >
                              {ageBand && <span>{ageBand}</span>}
                              {ageBand && team.country_code && <span> · </span>}
                              {team.country_code && <span>{team.country_code}</span>}
                              {!ageBand && !team.country_code && <span>Team workspace</span>}
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'inline-block',
                            marginTop: 4,
                            padding: '0.15rem 0.55rem',
                            background: 'rgba(255,184,28,0.12)',
                            color: '#FFB81C',
                            border: '1px solid rgba(255,184,28,0.3)',
                            borderRadius: 999,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {team.role.replace(/_/g, ' ')}
                        </div>
                      </Link>
                      {canManage && (
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.4rem',
                            paddingTop: '0.5rem',
                            borderTop: '1px solid #1e1e1e',
                            marginTop: 4,
                          }}
                        >
                          <Link
                            href={`/dashboard/team/${team.slug}/payments`}
                            style={{
                              flex: 1,
                              textAlign: 'center',
                              padding: '0.4rem 0.5rem',
                              background: 'rgba(4,30,66,0.4)',
                              color: '#fff',
                              border: '1px solid rgba(4,30,66,0.6)',
                              borderRadius: 6,
                              textDecoration: 'none',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            💰 Payments
                          </Link>
                          <Link
                            href={`/dashboard/team/${team.slug}/documents`}
                            style={{
                              flex: 1,
                              textAlign: 'center',
                              padding: '0.4rem 0.5rem',
                              background: 'rgba(4,30,66,0.4)',
                              color: '#fff',
                              border: '1px solid rgba(4,30,66,0.6)',
                              borderRadius: 6,
                              textDecoration: 'none',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            📄 Documents
                          </Link>
                        </div>
                      )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
