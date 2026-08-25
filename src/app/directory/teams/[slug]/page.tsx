import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { countryFlag } from '@/lib/team';
import { isIdentityVerified } from '@/lib/identity-verified';
import { timezoneForCountry } from '@/lib/team-timezone';
import { teamPageDecision, robotsMeta } from '@/lib/seo';

interface TeamWithLocation {
  country_code: string | null;
  home_country: string | null;
  timezone?: string | null;
}

interface EventRowForTz {
  rink_id?: string | null;
}

// Look up the timezone for a team. Tries (in order):
//   1. team.timezone (authoritative, set on the team row)
//   2. team.country_code (e.g. 'PH')
//   3. team.home_country string (if it matches a known country name)
//   4. country of any rink referenced by the team's upcoming events
//   5. UTC
async function deriveTeamTimezone(
  team: TeamWithLocation,
  events: EventRowForTz[]
): Promise<string> {
  if (team.timezone) return team.timezone;
  if (team.country_code) return timezoneForCountry(team.country_code);
  if (team.home_country) {
    const countryNameToCode: Record<string, string> = {
      'Philippines': 'PH',
      'United States': 'US',
      'Canada': 'CA',
      'United Kingdom': 'GB',
      // Extend as needed
    };
    const code = countryNameToCode[team.home_country];
    if (code) return timezoneForCountry(code);
  }
  // Fallback: look up rink country from any event with a rink_id
  const rinkIds = Array.from(new Set(events.map((e) => e.rink_id).filter(Boolean) as string[]));
  if (rinkIds.length > 0) {
    const { data: rinks } = await supabaseAdmin
      .from('rinks')
      .select('id, country, timezone')
      .in('id', rinkIds)
      .limit(1);
    if (rinks && rinks.length > 0) {
      if (rinks[0].timezone) return rinks[0].timezone;
      if (rinks[0].country) {
        const countryToCode: Record<string, string> = {
          'Philippines': 'PH',
          'United States': 'US',
          'Canada': 'CA',
        };
        const code = countryToCode[rinks[0].country];
        if (code) return timezoneForCountry(code);
      }
    }
  }
  return 'UTC';
}
import PublicTeamProfile from './PublicTeamProfile';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface HierarchyRef { id: string; name: string; slug: string | null }

interface TeamRow {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;

  country_code: string | null;
  home_city: string | null;
  home_country: string | null;
  timezone: string | null;
  age_category: string;
  age_label: string | null;
  age_min: number | null;
  age_max: number | null;
  level: string | null;
  season_label: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  visibility: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  founded_on: string | null;
  federation_id: string | null;
  organization_id: string | null;
  league_id: string | null;
  federation: HierarchyRef | null;
  organization: HierarchyRef | null;
  league: HierarchyRef | null;
}

interface NewsRow {
  id: string;
  title: string;
  body: string;
  author_user_id: string;
  published_at: string;
}

interface ResultRow {
  id: string;
  game_date: string;
  opponent: string;
  home_away: 'home' | 'away' | 'neutral';
  our_score: number;
  their_score: number;
  outcome: 'W' | 'L' | 'T';
  notes: string | null;
}

interface ScheduleRow {
  id: string;
  scheduled_at: string;
  opponent: string | null;
  kind: 'game' | 'practice' | 'tournament' | 'meeting' | 'other';
  venue: string | null;
  home_away: 'home' | 'away' | 'neutral' | null;
  notes: string | null;
  is_cancelled: boolean;
  timezone?: string | null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('name, description, home_city, home_country, country_code, age_label, level, timezone, visibility')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!team) {
    return {
      title: 'Team not found · RinkStop',
      robots: { index: false, follow: false },
    };
  }

  const t = team as Pick<
    TeamRow,
    'name' | 'description' | 'home_city' | 'home_country' | 'country_code' | 'age_label' | 'level'
  >;
  const location = [t.home_city, t.home_country].filter(Boolean).join(', ');
  const title = `${t.name}${location ? ` — ${location}` : ''} · RinkStop`;
  const tLeague = (team as any).league?.name || '';
  const tFederation = (team as any).federation?.name || '';
  const tOrg = (team as any).organization?.name || '';
  const foundedClause = (team as any).founded_on ? ` Founded ${(team as any).founded_on.slice(0, 4)}.` : '';
  const ageClause = t.age_label ? ` Age group: ${t.age_label}.` : '';
  const levelClause = t.level ? ` Competes at the ${t.level.replace(/_/g, ' ')} level.` : '';
  const leagueClause = tLeague ? ` Member of the ${tLeague}.` : '';
  const federationClause = tFederation ? ` Sanctioned by ${tFederation}.` : '';
  const orgClause = tOrg ? ` Operated by ${tOrg}.` : '';
  const dirCtx = ' Roster, schedule, results, news, and venue on RinkStop.';
  const desc =
    t.description ||
    `${t.name}${location ? `, a hockey team from ${location}` : ' — a hockey team on RinkStop'}.${ageClause}${levelClause}${leagueClause}${federationClause}${orgClause}${foundedClause}${dirCtx}`;

  // Tier 1f (2026-07-07): thin-team noindex. The page is indexable as long
  // as the workspace is visibility=public. The full teamPageDecision (which
  // weighs field count and word count) is still used as a safety check for
  // truly empty records, but we don't noindex a public workspace that just
  // hasn't been filled in yet — those pages are still real entries the team
  // chose to expose publicly.
  const teamFields = [t.name, t.description, t.home_city, t.home_country, t.age_label, t.level];
  const fieldCount = teamFields.filter(f => f && String(f).trim().length > 0).length;
  const wordCount = (t.description || desc).split(/\s+/).filter(Boolean).length;
  const thinDecision = teamPageDecision(fieldCount, wordCount);
  // A workspace's visibility declaration trumps the field-count heuristic.
  // If the team says "make this public," we index it. They can fill in
  // fields later.
  const isPublic = (team as { visibility?: string })?.visibility === 'public';
  const decision = isPublic
    ? { indexable: true, reason: 'public workspace', uniquenessScore: Math.max(thinDecision.uniquenessScore, 50) }
    : thinDecision;

  return {
    title,
    description: desc,
    alternates: {
      canonical: `https://rinkstop.com/directory/teams/${normalizedSlug}`,
    },
    openGraph: {
      title: t.name,
      description: desc,
      url: `https://rinkstop.com/directory/teams/${normalizedSlug}`,
      siteName: 'RinkStop',
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: t.name,
      description: desc,
    },
    robots: robotsMeta(decision),
  };
}

export default async function PublicTeamPage({ params }: PageProps) {
  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  if (!normalizedSlug) notFound();

  // Workspace lookup (service role — pre-existing RLS recursion makes anon
  // SELECT unreliable for cross-table joins. Service role is safe here because
  // this is a server-rendered page that only exposes public-profile fields.)
  const { data: teamData } = await supabaseAdmin
    .from('team_workspaces')
    .select('*, federation:federations(id,name,slug), organization:organizations(id,name,slug), league:leagues(id,name,slug)')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle<TeamRow>();

  if (!teamData) notFound();
  const team = teamData as TeamRow;

  // Posts (anon key — these tables have public SELECT RLS)
  // Recent results — last 2 seasons (or all if team is new)
  const seasonStart = new Date();
  seasonStart.setMonth(seasonStart.getMonth() - 18);

  const [newsRes, resultsRes, upcomingEventsRes, adminsRes] = await Promise.all([
    supabase
      .from('team_news')
      .select('id, title, body, author_user_id, published_at')
      .eq('team_id', team.id)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(10)
      .returns<NewsRow[]>(),
    supabase
      .from('team_results')
      .select('id, game_date, opponent, home_away, our_score, their_score, outcome, notes')
      .eq('team_id', team.id)
      .order('game_date', { ascending: false })
      .limit(20)
      .returns<ResultRow[]>(),
    supabaseAdmin
      .from('team_events')
      .select('id, event_kind, starts_at, ends_at, opposing_team, location_note, status, rink_id, timezone')
      .eq('team_id', team.id)
      .neq('status', 'cancelled')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(10),
    // Admin display: get head_coach + assistants + manager for the claim badge
    supabaseAdmin
      .from('team_members')
      .select('user_id, role, joined_at, profiles:user_id(display_name, username)')
      .eq('team_id', team.id)
      .is('left_at', null)
      .in('role', ['head_coach', 'assistant_coach', 'manager', 'team_staff'])
      .order('joined_at'),
  ]);

  const news: NewsRow[] = newsRes.data || [];
  const results: ResultRow[] = resultsRes.data || [];
  // Normalize team_events rows into ScheduleRow shape so the rest of the page works unchanged
  const teamEventsRows = (upcomingEventsRes.data || []) as Array<{
    id: string;
    event_kind: 'practice' | 'game' | 'tournament' | 'meeting' | 'other';
    starts_at: string;
    opposing_team: string | null;
    location_note: string | null;
    status: string;
    rink_id?: string | null;
    timezone?: string | null;
  }>;
  const upcomingFromEvents: ScheduleRow[] = teamEventsRows.map((e): ScheduleRow => ({
    id: `evt_${e.id}`, // prefix to avoid ID collision with team_schedule rows
    scheduled_at: e.starts_at,
    opponent: e.opposing_team,
    kind: e.event_kind,
    venue: e.location_note,
    home_away: null,
    notes: null,
    is_cancelled: false,
    timezone: e.timezone ?? null,
  }));
  // team_events is the canonical source (team_schedule was dropped). Sort by
  // scheduled_at ascending, take top 10.
  const mergedUpcoming: ScheduleRow[] = [...upcomingFromEvents]
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .slice(0, 10);

  interface AdminJoin {
    user_id: string;
    role: string;
    profiles: { display_name: string | null; username: string | null } | null;
  }
  const admins: AdminJoin[] = ((adminsRes.data || []) as unknown as AdminJoin[]).map((a) => ({
    user_id: a.user_id,
    role: a.role,
    profiles: a.profiles,
  }));

  // Check claim status
  const { data: claimRow } = await supabaseAdmin
    .from('claims')
    .select(`
      id,
      status,
      user_id,
      profiles:user_id (
        display_name,
        username,
        identity_verified_at,
        identity_expires_at
      ),
      team_members:user_id!inner (
        role,
        team_id
      )
    `)
    .eq('entity_id', team.id)
    .eq('claim_type', 'team')
    .eq('status', 'approved')
    .eq('team_members.team_id', team.id)
    .is('team_members.left_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      status: string;
      user_id: string;
      profiles: {
        display_name: string | null;
        username: string | null;
        identity_verified_at: string | null;
        identity_expires_at: string | null;
      } | null;
      team_members: { role: string; team_id: string } | null;
    }>();

  // Viewer check: is the current Clerk user an admin/member of this team?
  // Used to surface "post your first…" CTAs on empty states without
  // breaking the anonymous public-profile flow.
  //
  // The 12 admin roles here mirror src/lib/team.ts isAdminRole() and the
  // SQL is_team_admin() — keep all three in sync.
  const ADMIN_ROLES = [
    'head_coach', 'assistant_coach', 'goalie_coach', 'skills_coach',
    'manager', 'team_staff',
    'president', 'vice_president', 'secretary', 'treasurer',
    'board_member', 'safety_officer',
  ] as const;

  let viewerIsAdmin = false;
  try {
    const { userId } = await auth();
    if (userId) {
      const { data: viewerMember } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', team.id)
        .eq('user_id', userId)
        .is('left_at', null)
        .maybeSingle<{ role: string }>();
      viewerIsAdmin = ADMIN_ROLES.includes(viewerMember?.role as any);
    }
  } catch {
    // Anonymous or auth error — leave viewerIsAdmin false, no CTAs.
  }

  // Piece A: verified-claim requires the claimant to be BOTH identity-verified
  // AND an admin on this team. Per Arnel (2026-06-24 14:38), only admins can
  // claim a team — parents and players cannot. Piece B will enforce this on
  // the claim form; piece A is the defensive safety net that guards against
  // legacy data or pre-piece-B edge cases.
  //
  // Piece C (2026-06-24): identity-verified uses the hardened helper which
  // also requires profiles.didit_session_id to be set AND a matching approved
  // didit_sessions row to exist. Bare flag is no longer trusted.
  const claimantIdentityVerified = claimRow?.user_id
    ? await isIdentityVerified(claimRow.user_id)
    : false;
  const claimantIsAdmin = !!(
    claimRow?.team_members?.role &&
    ADMIN_ROLES.includes(claimRow.team_members.role as any)
  );
  const isVerifiedClaim = !!(claimRow && claimantIdentityVerified && claimantIsAdmin);
  const claimantDisplayName =
    claimRow?.profiles?.display_name || claimRow?.profiles?.username || null;
  const claimantRole = claimantIsAdmin ? claimRow?.team_members?.role ?? null : null;

  // Build season record from results
  const seasonRecord = results.reduce(
    (acc, r) => {
      acc.wins += r.outcome === 'W' ? 1 : 0;
      acc.losses += r.outcome === 'L' ? 1 : 0;
      acc.ties += r.outcome === 'T' ? 1 : 0;
      acc.total += 1;
      return acc;
    },
    { wins: 0, losses: 0, ties: 0, total: 0 }
  );

  // PR3 (2026-07-08): cross-link discovery. Two parallel queries gated on
  // team.home_city being set. Same defensive pattern as PR1 on the rink
  // detail page. team_workspaces is sparse (1 active public team as of
  // 2026-07-08 — Cebu Ice Datus test, which has home_city=null so this
  // path no-ops anyway). Cross-links fire automatically as the directory
  // grows.
  const [cityTeamsRes, cityRinksRes] = await Promise.all([
    team.home_city
      ? supabase
          .from('team_workspaces')
          .select('id, slug, name, home_city, home_country')
          .eq('home_city', team.home_city)
          .eq('is_active', true)
          .eq('visibility', 'public')
          .neq('id', team.id)
          .limit(8)
      : Promise.resolve({ data: [] as Array<{ id: string; slug: string | null; name: string; home_city: string | null; home_country: string | null }> }),
    team.home_city
      ? supabase
          .from('rinks')
          .select('id, slug, name, city, province_state, country')
          .ilike('city', team.home_city)
          .eq('is_active', true)
          .limit(8)
      : Promise.resolve({ data: [] as Array<{ id: string; slug: string | null; name: string; city: string | null; province_state: string | null; country: string | null }> }),
  ]);
  const cityTeams = (cityTeamsRes.data || []) as Array<{ id: string; slug: string | null; name: string; home_city: string | null; home_country: string | null }>;
  const cityRinks = (cityRinksRes.data || []) as Array<{ id: string; slug: string | null; name: string; city: string | null; province_state: string | null; country: string | null }>;

  // PR #146 (2026-08-22) WS24 thin-content sweep: server-rendered body intro
  // so every team page clears the AdSense ~150-word body threshold. Mirrors
  // the meta-description enrichments above; every clause is anchored to a
  // real team field. Missing fields are omitted (no fabrication).
  const location = [team.home_city, team.home_country].filter(Boolean).join(', ');
  const tLeagueName = (team as any).league?.name || '';
  const tFedName = (team as any).federation?.name || '';
  const tOrgName = (team as any).organization?.name || '';
  const foundedYear = (team as any).founded_on ? String((team as any).founded_on).slice(0, 4) : '';
  const introParts: string[] = [];
  introParts.push(`${team.name}${location ? `, a hockey team from ${location}` : ' — a hockey team on RinkStop'}.`);
  if (team.level) {
    introParts.push(`${team.name} compete at the ${String(team.level).replace(/_/g, ' ')} level.`);
  }
  if (team.age_label) {
    introParts.push(`The team is listed under the ${team.age_label} age group.`);
  }
  if (tLeagueName) {
    introParts.push(`${team.name} play in the ${tLeagueName}${location ? ` (${location})` : ''}.`);
  }
  if (tFedName) {
    introParts.push(`The team is sanctioned by ${tFedName}.`);
  }
  if (tOrgName) {
    introParts.push(`${team.name} are operated by ${tOrgName}.`);
  }
  if (foundedYear) {
    introParts.push(`${team.name} were founded in ${foundedYear}.`);
  }
  introParts.push(`This RinkStop team page shows the full roster, schedule, results, upcoming games, recent news, and venue information. Each section — roster, schedule, results, news — links into the wider hockey directory so visitors can follow the team, league, and city into related teams, rinks, and competitions. RinkStop is the open hockey directory: every team, league, player, and rink on this site has a public profile page.`);

  return (
    <>
      <section
        aria-label={`About ${team.name}`}
        style={{ maxWidth: '1280px', margin: '0 auto 1.5rem', padding: '0 1.5rem' }}
      >
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem 1.5rem' }}>
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', letterSpacing: '0.04em', color: '#fff', margin: '0 0 0.75rem' }}>
            About {team.name}
          </h2>
          <div style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, fontSize: '0.9375rem' }}>
            {introParts.map((p, i) => (
              <p key={i} style={{ marginBottom: i < introParts.length - 1 ? '0.75rem' : 0 }}>{p}</p>
            ))}
          </div>
        </div>
      </section>
      <PublicTeamProfile
        team={team}
        news={news}
        results={results}
        upcoming={mergedUpcoming}
        admins={admins}
        claimed={isVerifiedClaim}
        claimedByUserId={claimRow?.user_id ?? null}
        seasonRecord={seasonRecord}
        viewerIsAdmin={viewerIsAdmin}
        teamSlug={team.slug}
        claimantDisplayName={claimantDisplayName}
        claimantRole={claimantRole}
        teamTimezone={await deriveTeamTimezone(team, teamEventsRows)}
        cityTeams={cityTeams}
        cityRinks={cityRinks}
      />
    </>
  );
}