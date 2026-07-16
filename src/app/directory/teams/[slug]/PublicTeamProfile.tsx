'use client';

import Link from 'next/link';
import ShareButton from '@/components/ShareButton';
import { buildTeamShare } from '@/lib/share';

// ── Types ────────────────────────────────────────────────────────────────────────

interface HierarchyRef { id: string; name: string; slug: string | null }

interface Team {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;

  country_code: string | null;
  home_city: string | null;
  home_country: string | null;
  age_category: string;
  age_label: string | null;
  age_min: number | null;
  age_max: number | null;
  level: string | null;
  season_label: string | null;
  description: string | null;
  contact_email: string | null;
  federation_id?: string | null;
  organization_id?: string | null;
  league_id?: string | null;
  federation?: HierarchyRef | null;
  organization?: HierarchyRef | null;
  league?: HierarchyRef | null;
  contact_phone: string | null;
  created_at: string;
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

interface AdminJoin {
  user_id: string;
  role: string;
  profiles: { display_name: string | null; username: string | null } | null;
}

interface SeasonRecord {
  wins: number;
  losses: number;
  ties: number;
  total: number;
}

interface Props {
  team: Team;
  news: NewsRow[];
  results: ResultRow[];
  upcoming: ScheduleRow[];
  admins: AdminJoin[];
  claimed: boolean;
  claimedByUserId: string | null;
  seasonRecord: SeasonRecord;
  viewerIsAdmin: boolean;
  teamSlug: string;
  claimantDisplayName?: string | null;
  claimantRole?: string | null;
  teamTimezone?: string;
  /**
   * PR3 (2026-07-08): other public team_workspaces in the same home_city.
   * Empty array (the default) hides the section entirely. Fires when
   * team_workspaces grows beyond its current 1-row state.
   */
  cityTeams?: Array<{
    id: string;
    slug: string | null;
    name: string;
    home_city: string | null;
    home_country: string | null;
  }>;
  /**
   * PR3 (2026-07-08): active rinks in the same city as the team's home_city.
   * Empty array (the default) hides the section entirely.
   */
  cityRinks?: Array<{
    id: string;
    slug: string | null;
    name: string;
    city: string | null;
    province_state: string | null;
    country: string | null;
  }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<string, string> = {
  learn_to_play: 'Learn to Play',
  house: 'House League',
  travel: 'Travel',
  rep: 'Rep / Selects',
};

const KIND_LABELS: Record<string, string> = {
  game: 'Game',
  practice: 'Practice',
  tournament: 'Tournament',
  meeting: 'Meeting',
  other: 'Event',
};

const ROLE_LABELS: Record<string, string> = {
  head_coach: 'Head Coach',
  assistant_coach: 'Assistant Coach',
  goalie_coach: 'Goalie Coach',
  skills_coach: 'Skills Coach',
  manager: 'Manager',
  team_staff: 'Team Staff',
  president: 'President',
  vice_president: 'Vice President',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  board_member: 'Board Member',
  safety_officer: 'Safety Officer',
};

function formatRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatDatetime(iso: string, timeZone?: string): { date: string; time: string } {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  };
  return {
    date: d.toLocaleDateString('en-US', opts),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, ...(timeZone ? { timeZone } : {}) }),
  };
}

function countryFlag(code: string | null): string {
  if (!code) return '🏳️';
  try {
    return (code as any)
      .toUpperCase()
      .split('')
      .map((c: string) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
      .join('');
  } catch {
    return '🏳️';
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RecordBadge({ record }: { record: SeasonRecord }) {
  if (record.total === 0) return null;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 6,
        padding: '0.25rem 0.75rem',
        fontSize: '0.875rem',
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ color: '#14B8A6' }}>{record.wins}W</span>
      <span style={{ color: '#C8102E' }}>{record.losses}L</span>
      <span style={{ color: '#FFB81C' }}>{record.ties}T</span>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, fontSize: '0.8rem' }}>
        ({record.total} games)
      </span>
    </div>
  );
}

function ClaimBadge({
  claimed,
  admins,
  teamId,
  teamName,
  claimantDisplayName,
  claimantRole,
}: {
  claimed: boolean;
  admins: AdminJoin[];
  teamId: string;
  teamName: string;
  claimantDisplayName?: string | null;
  claimantRole?: string | null;
}) {
  if (claimed) {
    // Per Arnel (2026-06-24 14:32): "the badge should show whoever it is claimed by,
    // since they would have a profile with their role on team, or in organization."
    // claimantDisplayName is only non-null when the claim is verified (admin role +
    // identity verified). Fall back to head_coach name only if claimantDisplayName
    // is missing (defensive — should not happen post-piece-A).
    const name = claimantDisplayName ?? admins[0]?.profiles?.display_name;
    const roleLabel = claimantRole ? formatRoleLabel(claimantRole) : null;
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'rgba(20,184,166,0.10)',
          border: '1px solid rgba(20,184,166,0.4)',
          borderRadius: 6,
          padding: '0.25rem 0.75rem',
          fontSize: '0.78rem',
          fontWeight: 700,
          color: '#14B8A6',
        }}
      >
        ✓ Verified
        {name && (
          <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>
            by {name}{roleLabel ? ` (${roleLabel})` : ''}
          </span>
        )}
      </div>
    );
  }
  // Unclaimed: link to the claims form pre-filled with this team. The
  // dashboard route handles auth (redirects to /login if needed) and the
  // form (ClaimsForm.tsx) auto-selects the entity type from the URL param.
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'rgba(255,184,28,0.08)',
        border: '1px solid rgba(255,184,28,0.3)',
        borderRadius: 6,
        padding: '0.25rem 0.75rem',
        fontSize: '0.78rem',
        fontWeight: 600,
        color: '#FFB81C',
      }}
    >
      🏅 Unclaimed —{' '}
      <Link
        href={`/dashboard/claims?entity=team&id=${teamId}&name=${encodeURIComponent(teamName)}`}
        style={{ color: '#FFB81C', textDecoration: 'underline' }}
      >
        Claim this team
      </Link>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PublicTeamProfile({
  team,
  news,
  results,
  upcoming,
  admins,
  claimed,
  seasonRecord,
  viewerIsAdmin,
  teamSlug,
  claimantDisplayName,
  claimantRole,
  teamTimezone,
  cityTeams = [],
  cityRinks = [],
}: Props) {
  const flag = countryFlag(team.country_code);
  const levelLabel = team.level ? (LEVEL_LABELS[team.level] ?? team.level) : null;
  const ageGroup = team.age_label
    ? team.age_label
    : team.age_min != null && team.age_max != null
    ? `U${team.age_min}–${team.age_max}`
    : team.age_category === 'youth'
    ? 'Youth'
    : team.age_category === 'adult'
    ? 'Adult'
    : null;
  const location = [team.home_city, team.home_country].filter(Boolean).join(', ');
  const locationStr = location ? `${flag} ${location}` : null;
  const recentResults = results.slice(0, 5);
  const upcomingGames = upcoming.slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <nav style={{ fontSize: '0.75rem', color: '#555555', marginBottom: '1.25rem' }}>
        <Link href="/" style={{ color: '#555555', textDecoration: 'none' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555555', textDecoration: 'none' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/teams" style={{ color: '#555555', textDecoration: 'none' }}>Teams</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>{team.name}</span>
      </nav>

      {/* Admin banner: shown only to viewers who manage this team. */}
      {viewerIsAdmin && (
        <div
          style={{
            background: 'rgba(255,184,28,0.08)',
            border: '1px solid rgba(255,184,28,0.3)',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)' }}>
            <strong style={{ color: '#FFB81C' }}>You manage this team.</strong>
            <span style={{ color: 'rgba(255,255,255,0.6)', marginLeft: '0.5rem' }}>
              This is your public profile — what visitors see when they look you up.
            </span>
          </div>
          <a
            href={`/dashboard/team/${teamSlug}`}
            style={{
              padding: '0.45rem 0.9rem',
              background: '#FFB81C',
              color: '#041E42',
              textDecoration: 'none',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            Manage team →
          </a>
        </div>
      )}

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2rem' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #041E42 0%, #0a2d5a 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '1.75rem 2rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative stripe */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'linear-gradient(90deg, #C8102E, #FFB81C)',
            }}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h1
              className="font-sport"
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                color: '#fff',
                letterSpacing: '0.03em',
                margin: 0,
                lineHeight: 1,
              }}
            >
              {flag} {team.name}
            </h1>
            <ClaimBadge
              claimed={claimed}
              admins={admins}
              teamId={team.id}
              teamName={team.name}
              claimantDisplayName={claimantDisplayName}
              claimantRole={claimantRole}
            />
            <ShareButton
              payload={buildTeamShare({
                id: team.id,
                slug: team.slug,
                name: team.name,
                city: team.home_city,
                country: team.home_country,
              })}
              variant="dark"
            />
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', alignItems: 'center', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
            {locationStr && (
              <span>
                <span style={{ opacity: 0.6 }}>📍</span> {locationStr}
              </span>
            )}
            {levelLabel && (
              <span>
                <span style={{ opacity: 0.6 }}>🏒</span> {levelLabel}
              </span>
            )}
            {ageGroup && (
              <span>
                <span style={{ opacity: 0.6 }}>👥</span> {ageGroup}
              </span>
            )}
            {team.season_label && (
              <span>
                <span style={{ opacity: 0.6 }}>📅</span> {team.season_label}
              </span>
            )}
            {team.organization?.name && (
              <span>
                <span style={{ opacity: 0.6 }}>🏢</span>{' '}
                {team.organization.slug ? (
                  <Link href={`/organizations/${team.organization.slug}`} style={{ color: '#FFB81C', textDecoration: 'none' }}>
                    {team.organization.name}
                  </Link>
                ) : (
                  team.organization.name
                )}
              </span>
            )}

            {team.league?.name && (
              <span>
                <span style={{ opacity: 0.6 }}>🏆</span>{' '}
                {team.league.slug ? (
                  <Link href={`/leagues/${team.league.slug}`} style={{ color: '#FFB81C', textDecoration: 'none' }}>
                    {team.league.name}
                  </Link>
                ) : (
                  team.league.name
                )}
              </span>
            )}
            {team.federation?.name && (
              <span>
                <span style={{ opacity: 0.6 }}>🌐</span>{' '}
                {team.federation.slug ? (
                  <Link href={`/federations/${team.federation.slug}`} style={{ color: '#FFB81C', textDecoration: 'none' }}>
                    {team.federation.name}
                  </Link>
                ) : (
                  team.federation.name
                )}
              </span>
            )}
          </div>

          {/* Description */}
          {team.description && (
            <p
              style={{
                marginTop: '1rem',
                fontSize: '0.9375rem',
                color: 'rgba(255,255,255,0.8)',
                lineHeight: 1.6,
                maxWidth: 700,
              }}
            >
              {team.description}
            </p>
          )}
        </div>
      </section>

      {/* ── Two-column layout ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Left column ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Recent results */}
          <section>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}
            >
              <h2 className="font-sport" style={{ fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', margin: 0 }}>
                RECENT RESULTS
              </h2>
              <RecordBadge record={seasonRecord} />
            </div>

            {recentResults.length === 0 ? (
              <EmptyState
                icon="📊"
                message="No results posted yet."
                hint={
                  viewerIsAdmin
                    ? 'Record your game results so fans and families can follow your season.'
                    : 'When the team posts results from their games, they’ll appear here with W/L/T badges.'
                }
                cta={
                  viewerIsAdmin
                    ? { label: 'Post a result', href: `/dashboard/team/${teamSlug}` }
                    : undefined
                }
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentResults.map((r) => (
                  <ResultCard key={r.id} result={r} />
                ))}
              </div>
            )}
          </section>

          {/* Upcoming schedule */}
          <section>
            <h2 className="font-sport" style={{ fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
              UPCOMING
            </h2>

            {upcomingGames.length === 0 ? (
              <EmptyState
                icon="📅"
                message="No upcoming games scheduled."
                hint={
                  viewerIsAdmin
                    ? 'Add games, practices, and tournaments so families know when to show up.'
                    : 'When the team schedules their next game, it’ll appear here with date, venue, and home/away.'
                }
                cta={
                  viewerIsAdmin
                    ? { label: 'Add to schedule', href: `/dashboard/team/${teamSlug}` }
                    : undefined
                }
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {upcomingGames.map((g) => (
                  <ScheduleCard key={g.id} game={g} timeZone={teamTimezone} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Right column ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Latest news */}
          <section>
            <h2 className="font-sport" style={{ fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
              NEWS
            </h2>

            {news.length === 0 ? (
              <EmptyState
                icon="📰"
                message="No news posted yet."
                hint={
                  viewerIsAdmin
                    ? 'Share tryout dates, roster announcements, recaps, and team stories. Manually drafted — your voice, not a feed.'
                    : 'Game recaps, announcements, and stories from the team. Posted by coaches and admins.'
                }
                cta={
                  viewerIsAdmin
                    ? { label: 'Post news', href: `/dashboard/team/${teamSlug}` }
                    : undefined
                }
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {news.slice(0, 5).map((n) => (
                  <NewsCard key={n.id} item={n} />
                ))}
              </div>
            )}
          </section>

          {/* Contact + team info */}
          <section>
            <h2 className="font-sport" style={{ fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
              TEAM INFO
            </h2>

            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                padding: '1rem 1.25rem',
              }}
            >
              <InfoRow label="Founded" value={team.created_at ? formatDate(team.created_at) : '—'} />
              {team.level && <InfoRow label="Level" value={levelLabel ?? team.level} />}
              {ageGroup && <InfoRow label="Age group" value={ageGroup} />}
              {team.season_label && <InfoRow label="Season" value={team.season_label} />}
              {team.organization?.name && (
                <InfoRow label="Organization" value={team.organization.slug ? `/organizations/${team.organization.slug}` : null} linkLabel={team.organization.name} />
              )}

              {team.league?.name && (
                <InfoRow label="League" value={team.league.slug ? `/leagues/${team.league.slug}` : null} linkLabel={team.league.name} />
              )}
              {team.federation?.name && (
                <InfoRow label="Federation" value={team.federation.slug ? `/federations/${team.federation.slug}` : null} linkLabel={team.federation.name} />
              )}
              {team.home_city && <InfoRow label="Home city" value={`${flag} ${team.home_city}`} />}
              {team.home_country && team.home_country !== team.home_city && (
                <InfoRow label="Country" value={`${countryFlag(team.country_code)} ${team.home_country}`} />
              )}
              {team.contact_email && (
                <InfoRow
                  label="Contact"
                  value={
                    <a
                      href={`mailto:${team.contact_email}`}
                      style={{ color: '#14B8A6', textDecoration: 'none', fontSize: '0.875rem' }}
                    >
                      {team.contact_email}
                    </a>
                  }
                />
              )}
              {team.contact_phone && (
                <InfoRow
                  label="Phone"
                  value={
                    <a
                      href={`tel:${team.contact_phone.replace(/\s+/g, '')}`}
                      style={{ color: '#14B8A6', textDecoration: 'none', fontSize: '0.875rem' }}
                    >
                      {team.contact_phone}
                    </a>
                  }
                />
              )}

              {admins.length > 0 && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Staff
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {admins.slice(0, 5).map((a) => (
                      <div key={a.user_id} style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)' }}>
                        <span style={{ color: '#FFB81C', fontWeight: 600 }}>
                          {ROLE_LABELS[a.role] ?? a.role}
                        </span>
                        {a.profiles?.display_name && (
                          <span style={{ color: 'rgba(255,255,255,0.55)', marginLeft: '0.4rem' }}>
                            — {a.profiles.display_name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* PR3 (2026-07-08): OTHER TEAMS IN {city} — internal linking hub.
          Other public team_workspaces in the team's home_city. Skipped
          when home_city is not set OR no peers exist. Note: this section
          is sparse today (team_workspaces has 1 active public team — Cebu
          Ice Datus test, which has home_city=null so this path no-ops).
          Cross-links fire automatically as the directory grows. */}
      {cityTeams.length > 0 && team.home_city && (
        <section style={{ background: 'rgba(13,17,23,0.6)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '1.5rem' }}>
          <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '4px' }}>
            Other teams in {team.home_city}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>
            {cityTeams.length === 1
              ? `One other public team in ${team.home_city} is in the RinkStop directory.`
              : `${cityTeams.length} other public teams in ${team.home_city} are in the RinkStop directory.`}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {cityTeams.map((t) => (
              <Link
                key={t.id}
                href={t.slug ? `/directory/teams/${t.slug}` : '/directory/teams'}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textDecoration: 'none',
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '4px', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🏒</div>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600, lineHeight: 1.3 }}>{t.name}</span>
              </Link>
            ))}
          </div>
          <p style={{ marginTop: '12px', fontSize: '13px' }}>
            <Link href={`/directory/teams?city=${encodeURIComponent(team.home_city)}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
              See all teams in {team.home_city} →
            </Link>
          </p>
        </section>
      )}

      {/* PR3 (2026-07-08): RINKS IN {city} — internal linking hub.
          Active rinks in the team's home_city. Skipped when home_city is
          not set OR no rinks exist. */}
      {cityRinks.length > 0 && team.home_city && (
        <section style={{ background: 'rgba(13,17,23,0.6)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '1.5rem' }}>
          <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '18px', marginBottom: '4px' }}>
            Rinks in {team.home_city}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>
            {cityRinks.length === 1
              ? `One rink in ${team.home_city} is in the RinkStop directory.`
              : `${cityRinks.length} rinks in ${team.home_city} are in the RinkStop directory.`}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {cityRinks.map((r) => (
              <Link
                key={r.id}
                href={r.slug ? `/directory/rinks/${r.slug}` : '/directory/rinks'}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textDecoration: 'none',
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '4px', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>⛸️</div>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600, lineHeight: 1.3 }}>{r.name}</span>
              </Link>
            ))}
          </div>
          <p style={{ marginTop: '12px', fontSize: '13px' }}>
            <Link href={`/directory/rinks?city=${encodeURIComponent(team.home_city)}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
              See all rinks in {team.home_city} →
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}

// ── Card components ────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  message,
  hint,
  cta,
}: {
  icon: string;
  message: string;
  hint?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        padding: '1.5rem',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '0.875rem',
      }}
    >
      <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{icon}</div>
      <div>{message}</div>
      {hint && (
        <div style={{ fontSize: '0.78rem', marginTop: '0.5rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
      {cta && (
        <a
          href={cta.href}
          style={{
            display: 'inline-block',
            marginTop: '0.75rem',
            padding: '0.45rem 0.9rem',
            background: 'var(--navy, #041E42)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 6,
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          {cta.label}
        </a>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: ResultRow }) {
  const outcomeColor = result.outcome === 'W' ? '#14B8A6' : result.outcome === 'L' ? '#C8102E' : '#FFB81C';
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 6,
          background: `${outcomeColor}22`,
          border: `1px solid ${outcomeColor}55`,
          color: outcomeColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '0.9rem',
          flexShrink: 0,
        }}
      >
        {result.outcome}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          vs {result.opponent}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
          {result.home_away === 'home' ? '🏠' : result.home_away === 'away' ? '✈️' : '📍'}{' '}
          {formatDateShort(result.game_date)} · {result.our_score}–{result.their_score}
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({ game, timeZone }: { game: ScheduleRow; timeZone?: string }) {
  // Prefer the row's own timezone (the local team intent captured at create time),
  // fall back to the team-level timezone.
  const { date, time } = formatDatetime(game.scheduled_at, game.timezone || timeZone);
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          textAlign: 'center',
          minWidth: 40,
        }}
      >
        <div style={{ fontSize: '1.1rem', marginBottom: '0.1rem' }}>
          {game.kind === 'game' ? '🏒' : game.kind === 'practice' ? '🎯' : game.kind === 'tournament' ? '🏆' : game.kind === 'meeting' ? '📋' : '📌'}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {KIND_LABELS[game.kind] ?? game.kind}
          {game.opponent && ` vs ${game.opponent}`}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
          {date} at {time}
          {game.venue && ` · ${game.venue}`}
        </div>
        {game.home_away && (
          <span
            style={{
              display: 'inline-block',
              marginTop: '0.2rem',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: game.home_away === 'home' ? '#14B8A6' : '#FFB81C',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {game.home_away}
          </span>
        )}
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsRow }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 8,
        padding: '0.875rem 1rem',
      }}
    >
      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.3rem' }}>
        {formatDate(item.published_at)}
      </div>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem', lineHeight: 1.3 }}>
        {item.title}
      </div>
      <div
        style={{
          fontSize: '0.8375rem',
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.55,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {item.body}
      </div>
    </div>
  );
}

function InfoRow({ label, value, linkHref, linkLabel }: { label: string; value: React.ReactNode; linkHref?: string | null; linkLabel?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '1rem',
        padding: '0.35rem 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        fontSize: '0.875rem',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'rgba(255,255,255,0.85)', textAlign: 'right' }}>
        {linkHref ? <Link href={linkHref} style={{ color: '#FFB81C', textDecoration: 'none' }}>{linkLabel ?? value}</Link> : value}
      </span>
    </div>
  );
}