/**
 * ConsumerCards
 *
 * Phase 1a (Consumer-First Growth) — prep doc §3.3.
 * Approved by Arnel 2026-07-05 18:23 CDT.
 *
 * A row of consumer-facing summary cards on /dashboard. Visible to all
 * personal-workspace users (parents, players, scouts, fans). Per the
 * confirmed Q2 answer: cards are visible to all users, empty-state CTAs
 * are account-type-aware.
 *
 * Cards in this 1a scope:
 *   - Today's Schedule    (read team_schedule for the user's teams, today only)
 *   - Upcoming Tournaments (read fixtures, next 30 days, status='scheduled')
 *   - Upcoming Payments   (read team_payments, status in pending/overdue)
 *   - Current Organizations (read team_members count)
 *   - Verification Status (read profile_identity_status)
 *   - Pending Documents   (1b-1 placeholder)
 *   - Recent Achievements (1b-2 placeholder)
 *
 * Why server component: all data is read from Supabase and can be fetched
 * in parallel with the rest of the dashboard render. No client state.
 *
 * Why pass types as props: this component does not own the account_type
 * logic — the dashboard page already has `types` from profile_account_types.
 * This keeps the component pure (no Supabase query for account types).
 */

import Link from 'next/link';

interface ConsumerCardsProps {
  userId: string;
  /** 'parent' | 'player' | 'scout' | 'fan' | ... — drives empty-state CTAs */
  primaryType: string | null;
  /** All account types for the user */
  types: string[];
  /** Tier for Verification Status display */
  tier: string;
  /** Identity verified per isIdentityVerified helper (3-condition check) */
  identityVerified: boolean;
}

interface TodayEvent {
  id: string;
  title: string;
  starts_at: string;
  team_name: string;
}

interface UpcomingTournament {
  id: string;
  scheduled_at: string;
  home_team: string;
  away_team: string;
  league: string | null;
}

interface UpcomingPayment {
  id: string;
  amount: number;
  status: string;
  team_name: string;
  due_at: string | null;
}

interface TeamMembership {
  id: string;
  slug: string;
  name: string;
  role: string;
}

interface PendingDocumentSummary {
  childId: string;
  childName: string;
  activeCount: number;
  expiredCount: number;
}

export interface ConsumerCardData {
  todayEvents: TodayEvent[];
  upcomingTournaments: UpcomingTournament[];
  upcomingPayments: UpcomingPayment[];
  teamMemberships: TeamMembership[];
  identityVerified: boolean;
  tier: string;
  /** Phase 1b-1. Per-child active/expired document counts. Empty array
   *  if the user has no linked children. */
  pendingDocuments: PendingDocumentSummary[];
  /** Phase 1b-2. Most recent achievements across all linked children. */
  recentAchievements: RecentAchievement[];
  /** Phase 1b-4. Top consumer notifications for the user. */
  consumerNotifications: ConsumerNotificationSummary[];
}

export interface RecentAchievement {
  id: string;
  childId: string;
  childName: string;
  title: string;
  category: string;
  achieved_at: string;
}

export interface ConsumerNotificationSummary {
  id: string;
  title: string;
  kind: string;
  read_at: string | null;
  created_at: string;
}

/**
 * Fetch all card data in one place. Kept as a separate exported function
 * so the dashboard page can `await` it in its existing try/catch wrapper.
 * Returns safe defaults on any error — never throws.
 */
export async function loadConsumerCardData(userId: string, tier: string, identityVerified: boolean): Promise<ConsumerCardData> {
  const empty: ConsumerCardData = {
    todayEvents: [],
    upcomingTournaments: [],
    upcomingPayments: [],
    teamMemberships: [],
    identityVerified,
    tier,
    pendingDocuments: [],
    recentAchievements: [],
    consumerNotifications: [],
  };

  try {
    const { supabaseAdmin } = await import('@/lib/supabase');
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const [membershipsRes, scheduleRes, fixturesRes, paymentsRes, childIdsRes] = await Promise.all([
      supabaseAdmin
        .from('team_members')
        .select('role, team_workspaces:team_id ( id, slug, name )')
        .eq('user_id', userId)
        .is('left_at', null)
        .order('joined_at', { ascending: false })
        .limit(8),
      (async () => {
        // Need team_ids first to scope team_schedule
        const teamIds = ((membershipsRes.data || []) as any[])
          .map((m: any) => m.team_workspaces?.id)
          .filter(Boolean);
        if (teamIds.length === 0) return { data: [] };
        return supabaseAdmin
          .from('team_schedule')
          .select('id, title, starts_at, kind, team_id')
          .in('team_id', teamIds)
          .gte('starts_at', startOfToday)
          .lt('starts_at', endOfToday)
          .order('starts_at', { ascending: true })
          .limit(5);
      })(),
      supabaseAdmin
        .from('fixtures')
        .select('id, scheduled_at, home_team_id, away_team_id, league_id')
        .eq('status', 'scheduled')
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', thirtyDaysOut)
        .order('scheduled_at', { ascending: true })
        .limit(5),
      (async () => {
        const teamIds = ((membershipsRes.data || []) as any[])
          .map((m: any) => m.team_workspaces?.id)
          .filter(Boolean);
        if (teamIds.length === 0) return { data: [] };
        return supabaseAdmin
          .from('team_payments')
          .select('id, amount, status, due_at, team_id')
          .in('team_id', teamIds)
          .in('status', ['pending', 'overdue'])
          .order('due_at', { ascending: true })
          .limit(5);
      })(),
      supabaseAdmin
        .from('managed_profiles')
        .select('profile_id, players:profile_id ( first_name, last_name )')
        .eq('manager_user_id', userId)
        .eq('profile_type', 'player'),
    ]);

    const memberships: TeamMembership[] = ((membershipsRes.data || []) as any[])
      .map((m: any) => {
        const t = m.team_workspaces;
        if (!t?.id || !t?.slug) return null;
        return { id: t.id, slug: t.slug, name: t.name, role: m.role };
      })
      .filter(Boolean) as TeamMembership[];

    const teamNameById: Record<string, string> = {};
    for (const m of memberships) teamNameById[m.id] = m.name;

    const todayEvents: TodayEvent[] = ((scheduleRes.data || []) as any[]).map((e: any) => ({
      id: e.id,
      title: e.title,
      starts_at: e.starts_at,
      team_name: teamNameById[e.team_id] || 'Team',
    }));

    const upcomingPayments: UpcomingPayment[] = ((paymentsRes.data || []) as any[]).map((p: any) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      team_name: teamNameById[p.team_id] || 'Team',
      due_at: p.due_at,
    }));

    const upcomingTournaments: UpcomingTournament[] = ((fixturesRes.data || []) as any[]).map((f: any) => ({
      id: f.id,
      scheduled_at: f.scheduled_at,
      home_team: 'TBD',
      away_team: 'TBD',
      league: null,
    }));

    // Phase 1b-1: per-child active/expired document counts for the
    // "PENDING DOCUMENTS" card. One query against player_documents, then
    // join to the player names we already loaded via managed_profiles.
    const childNameById: Record<string, string> = {};
    const childIds: string[] = [];
    for (const r of (childIdsRes.data || []) as any[]) {
      const p = r.players;
      const name = p
        ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Child'
        : 'Child';
      childNameById[r.profile_id] = name;
      childIds.push(r.profile_id);
    }
    const pendingDocuments: PendingDocumentSummary[] = [];
    const recentAchievements: RecentAchievement[] = [];
    const consumerNotifications: ConsumerNotificationSummary[] = [];
    if (childIds.length > 0) {
      const { data: docs } = await supabaseAdmin
        .from('player_documents')
        .select('player_id, status, expires_at')
        .in('player_id', childIds);
      const today = new Date().toISOString().slice(0, 10);
      const bucket: Record<string, { active: number; expired: number }> = {};
      for (const d of (docs || []) as any[]) {
        const b = bucket[d.player_id] ?? (bucket[d.player_id] = { active: 0, expired: 0 });
        let status = d.status;
        if (status === 'active' && d.expires_at && d.expires_at < today) {
          status = 'expired';
        }
        if (status === 'active') b.active++;
        else if (status === 'expired') b.expired++;
      }
      for (const childId of childIds) {
        const b = bucket[childId] ?? { active: 0, expired: 0 };
        pendingDocuments.push({
          childId,
          childName: childNameById[childId] || 'Child',
          activeCount: b.active,
          expiredCount: b.expired,
        });
      }

      // Phase 1b-2: most recent achievements across all linked children.
      // Top 4 by achieved_at desc, joined to the child names we already loaded.
      const { data: achs } = await supabaseAdmin
        .from('player_achievements')
        .select('id, player_id, title, category, achieved_at')
        .in('player_id', childIds)
        .order('achieved_at', { ascending: false })
        .limit(4);
      for (const a of (achs || []) as any[]) {
        recentAchievements.push({
          id: a.id,
          childId: a.player_id,
          childName: childNameById[a.player_id] || 'Child',
          title: a.title,
          category: a.category,
          achieved_at: a.achieved_at,
        });
      }

      // Phase 1b-4: top 4 consumer notifications for this user.
      const { data: notifs } = await supabaseAdmin
        .from('consumer_notifications')
        .select('id, title, kind, read_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(4);
      for (const n of (notifs || []) as any[]) {
        consumerNotifications.push({
          id: n.id,
          title: n.title,
          kind: n.kind,
          read_at: n.read_at,
          created_at: n.created_at,
        });
      }
    }

    return {
      todayEvents,
      upcomingTournaments,
      upcomingPayments,
      teamMemberships: memberships,
      identityVerified,
      tier,
      pendingDocuments,
      recentAchievements,
      consumerNotifications,
    };
  } catch (e) {
    console.error('[ConsumerCards] load failed:', e);
    return empty;
  }
}

export default function ConsumerCards({
  primaryType,
  data,
}: Omit<ConsumerCardsProps, 'userId' | 'tier' | 'identityVerified' | 'types'> & {
  data: ConsumerCardData;
}) {
  const cardStyle: React.CSSProperties = {
    background: '#0f0f0f',
    border: '1px solid #1e1e1e',
    borderRadius: 12,
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    minHeight: 140,
  };

  return (
    <div
      data-testid="consumer-cards"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '0.75rem',
      }}
    >
      {/* Today's Schedule */}
      <div data-testid="consumer-card-today" style={cardStyle}>
        <CardHeader emoji="📅" title="TODAY'S SCHEDULE" />
        {data.todayEvents.length === 0 ? (
          <EmptyMessage
            headline="No games today"
            body={emptyStateBody('schedule', primaryType)}
            cta={{ label: primaryType === 'parent' ? 'Add a child to your Family Hub' : 'Join a team', href: primaryType === 'parent' ? '/dashboard/family' : '/directory/teams' }}
          />
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.todayEvents.map((e) => (
              <li key={e.id} style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                <span style={{ color: '#14B8A6', marginRight: 6 }}>•</span>
                {new Date(e.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {e.title}
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{e.team_name}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upcoming Tournaments */}
      <div data-testid="consumer-card-tournaments" style={cardStyle}>
        <CardHeader emoji="🏆" title="UPCOMING TOURNAMENTS" />
        {data.upcomingTournaments.length === 0 ? (
          <EmptyMessage
            headline="No tournaments scheduled"
            body="Browse upcoming hockey tournaments near you."
            cta={{ label: 'Browse tournaments', href: '/directory' }}
          />
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.upcomingTournaments.map((t) => (
              <li key={t.id} style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                <span style={{ color: '#14B8A6', marginRight: 6 }}>•</span>
                {new Date(t.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upcoming Payments */}
      <div data-testid="consumer-card-payments" style={cardStyle}>
        <CardHeader emoji="💳" title="UPCOMING PAYMENTS" />
        {data.upcomingPayments.length === 0 ? (
          <EmptyMessage
            headline="No payments due"
            body="Your family is current. Outstanding team fees will appear here."
          />
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.upcomingPayments.map((p) => (
              <li key={p.id} style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                <span style={{ color: p.status === 'overdue' ? '#FF6B7A' : '#FFB81C', marginRight: 6 }}>•</span>
                ${(p.amount / 100).toFixed(2)} · {p.team_name}
                {p.due_at && (
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                    Due {new Date(p.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Current Organizations */}
      <div data-testid="consumer-card-orgs" style={cardStyle}>
        <CardHeader emoji="🏒" title="CURRENT ORGANIZATIONS" />
        {data.teamMemberships.length === 0 ? (
          <EmptyMessage
            headline="No teams yet"
            body="Browse teams to follow and join the conversation."
            cta={{ label: 'Browse teams', href: '/directory/teams' }}
          />
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.teamMemberships.slice(0, 4).map((m) => (
              <li key={m.id} style={{ fontSize: '0.85rem' }}>
                <Link href={`/dashboard/team/${m.slug}`} style={{ color: '#fff', textDecoration: 'none' }}>
                  {m.name}
                </Link>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'capitalize' }}>
                  {m.role.replace(/_/g, ' ')}
                </div>
              </li>
            ))}
            {data.teamMemberships.length > 4 ? (
              <li style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
                +{data.teamMemberships.length - 4} more
              </li>
            ) : null}
          </ul>
        )}
      </div>

      {/* Verification Status */}
      <div data-testid="consumer-card-verification" style={cardStyle}>
        <CardHeader emoji="✅" title="VERIFICATION STATUS" />
        {data.identityVerified ? (
          <div>
            <p style={{ color: '#14B8A6', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
              Verified
            </p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', margin: '0.25rem 0 0', lineHeight: 1.4 }}>
              Your Hockey Identity is live. The check on RinkStop is yours.
            </p>
          </div>
        ) : (
          <EmptyMessage
            headline="Not verified"
            body="Verify your identity (60 seconds) to earn the check on RinkStop."
            cta={{ label: 'Verify now', href: '/dashboard/identity' }}
          />
        )}
      </div>

      {/* Pending Documents (1b-1 — live). Per-child active/expired counts.
          Empty state directs non-parents to the directory, parents without
          children to Family Hub, parents with no docs to upload. */}
      <div data-testid="consumer-card-documents" style={cardStyle}>
        <CardHeader emoji="📄" title="PENDING DOCUMENTS" />
        {data.pendingDocuments.length === 0 ? (
          primaryType === 'parent' ? (
            <EmptyMessage
              headline="No linked children yet"
              body="Link your first child to start uploading documents."
              cta={{ label: 'Open Family Hub', href: '/dashboard/family' }}
            />
          ) : (
            <EmptyMessage
              headline="Documents are parent-only"
              body="Parents upload birth certificates, waivers, and medical forms for each linked child."
              cta={{ label: 'Browse the directory', href: '/directory' }}
            />
          )
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.pendingDocuments.slice(0, 4).map((d) => (
              <li key={d.childId} style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                <Link href={`/dashboard/family#${d.childId}`} style={{ color: '#fff', textDecoration: 'none' }}>
                  {d.childName}
                </Link>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                  {d.activeCount} active{d.expiredCount > 0 ? ` · ${d.expiredCount} expired` : ''}
                </div>
              </li>
            ))}
            {data.pendingDocuments.length > 4 ? (
              <li style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
                +{data.pendingDocuments.length - 4} more
              </li>
            ) : null}
            <li style={{ marginTop: 4 }}>
              <Link
                href="/dashboard/family"
                style={{ color: '#14B8A6', fontSize: '0.75rem', textDecoration: 'none', fontWeight: 600 }}
              >
                Manage in Family Hub →
              </Link>
            </li>
          </ul>
        )}
      </div>

      {/* Recent Achievements (1b-2 — live). Top 4 most recent. */}
      <div data-testid="consumer-card-achievements" style={cardStyle}>
        <CardHeader emoji="🏅" title="RECENT ACHIEVEMENTS" />
        {data.recentAchievements.length === 0 ? (
          primaryType === 'parent' ? (
            <EmptyMessage
              headline="No achievements yet"
              body="Add the first one on the Family Hub."
              cta={{ label: 'Open Family Hub', href: '/dashboard/family' }}
            />
          ) : (
            <EmptyMessage
              headline="Achievements are parent-curated"
              body="Parents add tournament wins, milestones, and team events on the Family Hub."
              cta={{ label: 'Browse the directory', href: '/directory' }}
            />
          )
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.recentAchievements.map((a) => (
              <li key={a.id} style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                <Link href={`/dashboard/family#${a.childId}`} style={{ color: '#fff', textDecoration: 'none' }}>
                  {a.title}
                </Link>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                  {a.childName} · {new Date(a.achieved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </li>
            ))}
            <li style={{ marginTop: 4 }}>
              <Link
                href="/dashboard/family"
                style={{ color: '#14B8A6', fontSize: '0.75rem', textDecoration: 'none', fontWeight: 600 }}
              >
                Manage in Family Hub →
              </Link>
            </li>
          </ul>
        )}
      </div>

      {/* Notifications (1b-4 — live). Per-user inbox. Re-derived on dashboard load
          by /dashboard page. Top 4 most recent. */}
      <div data-testid="consumer-card-notifications" style={cardStyle}>
        <CardHeader emoji="🔔" title="NOTIFICATIONS" />
        {data.consumerNotifications.length === 0 ? (
          primaryType === 'parent' ? (
            <EmptyMessage
              headline="No notifications"
              body="You'll see doc-expiry alerts, identity renewals, and achievement updates here."
              cta={{ label: 'Open Family Hub', href: '/dashboard/family' }}
            />
          ) : (
            <EmptyMessage
              headline="Notifications are for parents"
              body="Parents see doc-expiry alerts and identity renewals here."
              cta={{ label: 'Browse the directory', href: '/directory' }}
            />
          )
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.consumerNotifications.map((n) => (
              <li
                key={n.id}
                style={{
                  color: n.read_at ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.95)',
                  fontSize: '0.85rem',
                  fontWeight: n.read_at ? 400 : 600,
                }}
              >
                <Link
                  href="/dashboard/notifications"
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {n.title}
                </Link>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
                  {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </li>
            ))}
            <li style={{ marginTop: 4 }}>
              <Link
                href="/dashboard/notifications"
                style={{ color: '#14B8A6', fontSize: '0.75rem', textDecoration: 'none', fontWeight: 600 }}
              >
                See all notifications →
              </Link>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}

function CardHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span aria-hidden style={{ fontSize: '1.1rem' }}>{emoji}</span>
      <h3 style={{
        fontFamily: "'Bebas Neue', Impact, sans-serif",
        fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.05em',
        margin: 0,
      }}>
        {title}
      </h3>
    </div>
  );
}

function EmptyMessage({
  headline,
  body,
  cta,
}: {
  headline: string;
  body: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div style={{ marginTop: 'auto' }}>
      <p style={{
        fontFamily: "'Bebas Neue', Impact, sans-serif",
        fontSize: '0.85rem', color: '#fff', letterSpacing: '0.05em',
        margin: 0, marginBottom: 4,
      }}>
        {headline}
      </p>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0, lineHeight: 1.4 }}>
        {body}
      </p>
      {cta ? (
        <Link
          href={cta.href}
          style={{
            display: 'inline-block', marginTop: 8,
            color: '#14B8A6', fontSize: '0.75rem', fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          {cta.label} →
        </Link>
      ) : null}
    </div>
  );
}

function emptyStateBody(surface: string, primaryType: string | null): string {
  if (primaryType === 'parent') {
    return 'Add a child to your Family Hub to see their schedule here.';
  }
  if (primaryType === 'scout') {
    return 'Follow teams to see their schedules on your dashboard.';
  }
  if (primaryType === 'fan') {
    return 'Follow teams and players to see their schedules here.';
  }
  return 'Join a team to see practice, games, and tournaments here.';
}
