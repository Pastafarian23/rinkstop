import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { isIdentityVerified } from '@/lib/identity-verified';
import { getTierLabel } from '@/lib/pricing';
import { TierBadge } from '@/components/TierBadge';
import { emitProfileFirstVisitor } from '@/lib/notifications/emit';
import { PassportSections } from './passport/PassportSections';
import CoverImageEditor from '@/components/CoverImageEditor';
import CoverImageHistoryStrip from '@/components/CoverImageHistoryStrip';
import ProfileTabs from '@/components/ProfileTabs';
import ProfileSidebar from '@/components/ProfileSidebar';
import ProfileFeed from '@/components/ProfileFeed';
import ProfilePhotoHistory from '@/components/ProfilePhotoHistory';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface Profile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  cover_image_position: 'center' | 'top' | 'bottom' | null;
  location: string | null;
  tier: string;
  tier_expires_at: string | null;
  is_founding_member: boolean;
  created_at: string | null;
}

interface CoverHistoryEntry {
  id: string;
  url: string | null;
  position: string;
  set_at: string;
  replaced_at: string | null;
  removed_at: string | null;
  source: string;
}

interface AccountTypeRow {
  account_type: string;
  is_primary: boolean;
}

interface ManagedProfile {
  id: string;
  profile_type: 'player' | 'team' | 'league';
  profile_id: string;
  relationship: string;
  /** Hydrated display data. Populated by fetchProfile() based on profile_type. */
  profile: {
    display_name?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    slug?: string;
    headshot_url?: string;
    logo_url?: string;
  } | null;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchProfile(slug: string): Promise<{
  profile: Profile;
  managed: ManagedProfile[];
  accountTypes: AccountTypeRow[];
  photoHistory: Array<{ id: string; url: string | null; set_at: string; replaced_at: string | null; removed_at: string | null; source: string }>;
  coverHistory: CoverHistoryEntry[];
} | null> {
  // Look up by username (case-insensitive)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .ilike('username', slug)
    .maybeSingle();

  if (!profile) return null;

  const [mRes, aRes, phRes, chRes] = await Promise.all([
    // Fetch managed_profiles WITHOUT the broken `profile:profiles(*)` join.
    // That join returned the manager's own profiles row in place of the
    // linked player/team/league record, so every "Connected profile" card
    // showed the manager's own display name. We hydrate in three separate
    // queries below, mirroring the pattern that already works in
    // /api/profiles/managed/route.ts.
    supabaseAdmin
      .from('managed_profiles')
      .select('id, profile_type, profile_id, relationship')
      .eq('user_id', profile.user_id),
    supabaseAdmin
      .from('profile_account_types')
      .select('account_type, is_primary')
      .eq('user_id', profile.user_id),
    // Photo history (public — Day 7, Arnel 2026-06-23 05:13 CDT).
    // We only need photos that had a real URL (skip the "removed" rows
    // that have url=null). Sort newest first.
    supabaseAdmin
      .from('profile_photo_history')
      .select('id, url, set_at, replaced_at, removed_at, source')
      .eq('user_id', profile.user_id)
      .not('url', 'is', null)
      .order('set_at', { ascending: false })
      .limit(20),
    // Cover image history (public — Phase 1b, Arnel 2026-07-29 directive).
    // Skip removed rows; they have url=null at the storage layer so we
    // can't show them anyway. Sort newest first.
    supabaseAdmin
      .from('profile_cover_image_history')
      .select('id, url, position, set_at, replaced_at, removed_at, source')
      .eq('user_id', profile.user_id)
      .not('url', 'is', null)
      .order('set_at', { ascending: false })
      .limit(20),
  ]);

  // Hydrate managed profiles: fetch the linked player/team/league record
  // for each row, batched per profile_type to avoid an N+1.
  const managedRows = (mRes.data as any[]) ?? [];
  const playerIds = managedRows.filter((r) => r.profile_type === 'player').map((r) => r.profile_id);
  const teamIds = managedRows.filter((r) => r.profile_type === 'team').map((r) => r.profile_id);
  const leagueIds = managedRows.filter((r) => r.profile_type === 'league').map((r) => r.profile_id);

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

  const managed: ManagedProfile[] = managedRows.map((r) => {
    let hydrated: ManagedProfile['profile'] = null;
    if (r.profile_type === 'player') {
      const p = playerMap.get(r.profile_id);
      if (p) {
        hydrated = {
          first_name: p.first_name ?? null,
          last_name: p.last_name ?? null,
          slug: p.slug ?? null,
          headshot_url: p.headshot_url ?? null,
        };
      }
    } else if (r.profile_type === 'team') {
      const t = teamMap.get(r.profile_id);
      if (t) hydrated = { name: t.name ?? null, slug: t.slug ?? null, logo_url: t.avatar_url ?? null };
    } else if (r.profile_type === 'league') {
      const l = leagueMap.get(r.profile_id);
      if (l) hydrated = { name: l.name ?? null, slug: l.slug ?? null, logo_url: l.logo_url ?? null };
    }
    return { ...r, profile: hydrated };
  });

  return {
    profile,
    managed,
    accountTypes: (aRes.data as any) ?? [],
    photoHistory: (phRes.data as any) ?? [],
    coverHistory: ((chRes as any)?.data as CoverHistoryEntry[]) ?? [],
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchProfile(slug);
  if (!data) {
    return {
      title: 'Profile not found · RinkStop',
      description: 'This profile does not exist on RinkStop.',
    };
  }

  const { profile } = data;
  const displayName = profile.display_name ?? 'RinkStop user';
  const username = profile.username ?? slug;
  const title = `${displayName} (@${username}) · RinkStop`;
  const description = profile.bio ?? `${displayName}'s hockey profile on RinkStop`;
  const profileUrl = `https://rinkstop.com/profile/${username}`;

  return {
    title,
    description,
    alternates: { canonical: profileUrl },
    openGraph: {
      title,
      description,
      url: profileUrl,
      type: 'profile',
      images: profile.avatar_url ? [profile.avatar_url] : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : undefined,
    },
  };
}

export default async function ProfileBySlugPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await fetchProfile(slug);
  if (!data) notFound();

  const { profile, managed, accountTypes, photoHistory, coverHistory } = data;
  const displayName = profile.display_name ?? 'RinkStop user';
  const profileUrl = `https://rinkstop.com/profile/${profile.username}`;
  const tierLabel = getTierLabel(profile.tier);

  // Determine ownership: is the viewer the owner of this profile?
  // Used by passport sections to show edit CTAs.
  const { userId: viewerUserId } = await auth();
  const isOwner = !!viewerUserId && viewerUserId === profile.user_id;

  // WS14 PR1 — fire-and-forget profile_first_visitor: when a non-owner
  // authenticated viewer lands on the profile, emit a one-shot notification
  // to the profile owner. source_key is per-(viewer, owner), so the same
  // viewer re-visiting doesn't re-fire. Self-views (anonymous or owner)
  // are skipped. Web crawlers are skipped by Clerk (no session).
  if (!isOwner && viewerUserId) {
    void (async () => {
      try {
        const viewer = await currentUser();
        const viewerFirst = viewer?.firstName ?? '';
        const viewerLast = viewer?.lastName ?? '';
        const viewerDisplayName =
          `${viewerFirst}${viewerLast ? ' ' + viewerLast : ''}`.trim() ||
          viewer?.username ||
          null;
        await emitProfileFirstVisitor(
          profile.user_id,
          viewerUserId,
          viewerDisplayName,
        );
      } catch (err) {
        console.error('[profile page] emit profile_first_visitor failed:', err);
      }
    })();
  }

  // Piece C (2026-06-24): identity-verified gate uses the hardened helper,
  // which also requires profiles.didit_session_id and a matching approved
  // didit_sessions row. Bare flag is no longer trusted.
  //
  // This checks the VIEWED profile's verification, not the viewer.
  const profileIdentityVerified = await isIdentityVerified(profile.user_id);
  const verifiedAt = profileIdentityVerified
    ? ((profile as any).identity_verified_at as string | null)
    : null;
  const expiresAt = profileIdentityVerified
    ? ((profile as any).identity_expires_at as string | null)
    : null;

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        {/* ─── CARD CONTAINER ─────────────────────────────────────
            Single dark card that holds the entire profile. The cover
            banner sits at the top; the avatar overlaps the bottom
            edge of the cover and the content body starts below it. */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0A1A33 0%, #041E42 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          {/* ─── COVER BANNER ─────────────────────────────────────
              Brand gradient by default, custom image if uploaded.
              Owner-only CoverImageEditor overlay is rendered absolutely
              inside this banner (see below). `isolation: isolate`
              creates a stacking context so the overlay sits above the
              avatar sibling which uses negative marginTop to overlap
              the banner bottom. */}
          <div
            style={{
              position: 'relative',
              isolation: 'isolate',
              height: 'clamp(160px, 24vw, 240px)',
              borderBottom: '3px solid var(--red)',
              overflow: 'hidden',
              background: profile.cover_image_url
                ? '#000'
                : 'linear-gradient(135deg, #041E42 0%, #0A2A5E 35%, #C8102E 100%)',
            }}
          >
            {profile.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.cover_image_url}
                alt={`${displayName}'s cover image`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: profile.cover_image_position || 'center',
                }}
              />
            )}

            {/* Subtle dark overlay when a custom cover is shown, so the
                avatar + name below still pop against arbitrary images. */}
            {profile.cover_image_url && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.35) 100%)',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Default gradient decorations — only when no cover image is set. */}
            {!profile.cover_image_url && (
              <>
                {/* Ghosted RINKSTOP wordmark — the brand's "stripe" at the top */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    fontSize: 'clamp(3.5rem, 12vw, 6rem)',
                    fontWeight: 900,
                    letterSpacing: '0.18em',
                    color: 'rgba(255,255,255,0.07)',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    lineHeight: 1,
                  }}
                >
                  RINKSTOP
                </div>
                {/* Diagonal gold accent stripe (bottom-right corner) */}
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: '40%',
                    height: '4px',
                    background: 'linear-gradient(90deg, transparent 0%, var(--gold) 100%)',
                  }}
                />
                {/* Brand corner badge — top-left */}
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 16,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,184,28,0.5)',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.15em',
                    color: 'var(--gold)',
                    textTransform: 'uppercase',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  🏒 HOCKEY PROFILE
                </div>
              </>
            )}

            {/* Phase 1b — owner-only cover image editor.
                Rendered as an absolute overlay in the top-right of the
                banner. The banner has `isolation: isolate` to create a
                stacking context, so absolutely-positioned children
                paint above the avatar sibling (which has negative
                marginTop to overlap the banner bottom). The component
                returns null for non-owners, so no extra gating needed. */}
            {isOwner && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 5,
                }}
              >
                <CoverImageEditor
                  currentUrl={profile.cover_image_url ?? null}
                  isOwner={isOwner}
                />
              </div>
            )}
          </div>

          {/* ─── AVATAR (overlaps cover bottom) ──────────────────
              Outer ring (white halo, 5px) + red border makes the
              avatar boundary visible against both the cover banner
              and the dark navy page background, regardless of the
              image's edge colors. Two-layer approach: padding 5px
              white ring (visible at any zoom), then 4px red border
              on the image. */}
          <div
            style={{
              paddingInline: '1.25rem',
              marginTop: '-3.5rem',
              position: 'relative',
              zIndex: 2,
            }}
            className="md:px-8"
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <div
                style={{
                  display: 'inline-block',
                  padding: '5px',
                  borderRadius: '50%',
                  background: '#fff',
                  lineHeight: 0,
                }}
              >
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  style={{
                    display: 'block',
                    width: 'clamp(96px, 14vw, 140px)',
                    height: 'clamp(96px, 14vw, 140px)',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '4px solid var(--red)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-block',
                  padding: '5px',
                  borderRadius: '50%',
                  background: '#fff',
                  lineHeight: 0,
                }}
              >
                <div
                  style={{
                    width: 'clamp(96px, 14vw, 140px)',
                    height: 'clamp(96px, 14vw, 140px)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    background: 'linear-gradient(135deg, var(--red) 0%, #8b0a1e 100%)',
                    color: '#fff',
                    fontSize: '3rem',
                    border: '4px solid var(--red)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {/* ─── TAB NAV (Facebook-style top tabs) ──────────────── */}
          <div style={{ marginTop: '1rem' }}>
            <ProfileTabs
              active="overview"
              username={profile.username ?? slug}
              counts={{ posts: 0, media: 0 }}
            />
          </div>

          {/* ─── TWO-COLUMN BODY ───────────────────────────────── */}
          {/* Desktop: 1/3 sidebar + 2/3 feed. Mobile: single column, sidebar stacks on top. */}
          <div
            className="grid grid-cols-1 lg:grid-cols-3"
            style={{ gap: '1.25rem', padding: '1.25rem' }}
          >
            {/* ───── LEFT SIDEBAR (1/3) ───── */}
            <div>
              <ProfileSidebar
                profile={profile}
                identityVerifiedAt={verifiedAt}
                identityExpiresAt={expiresAt}
                accountTypes={accountTypes}
                profileUrl={profileUrl}
                isOwner={isOwner}
              />

              {/* Photo history grid (mini) — only shows entries with valid URLs */}
              {photoHistory.length > 0 {photoHistory.length > 0 && ({photoHistory.length > 0 && ( (
                <div
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '1rem',
                    marginTop: '1rem',
                  }}
                >
                  <ProfilePhotoHistory photos={photoHistory} maxItems={4} />
                </div>
              )}
            </div>

            {/* ───── RIGHT FEED (2/3) ───── */}
            <div className="lg:col-span-2 space-y-4">
              {/* About section — anchored for #about tab. */}
              <section id="about" style={{ scrollMarginTop: '5rem' }}>
                <div
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '1.25rem',
                  }}
                >
                  <h2
                    className="font-sport uppercase"
                    style={{
                      fontSize: '0.75rem',
                      letterSpacing: '0.12em',
                      color: 'rgba(255,255,255,0.5)',
                      margin: 0,
                      marginBottom: '0.875rem',
                    }}
                  >
                    About
                  </h2>
                  {profile.bio ? (
                    <p
                      className="text-white/85"
                      style={{
                        fontSize: '0.9375rem',
                        lineHeight: 1.65,
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {profile.bio}
                    </p>
                  ) : (
                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'rgba(255,255,255,0.4)',
                        margin: 0,
                        fontStyle: 'italic',
                      }}
                    >
                      {isOwner ? 'Add a bio to tell people about yourself.' : 'No bio yet.'}
                    </p>
                  )}
                </div>
              </section>

              {/* Connected profiles — 4 buckets grouped. Skips if no managed profiles. */}
              {managed.length > 0 && (
                <div
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '1.25rem',
                  }}
                >
                  <h2
                    className="font-sport uppercase"
                    style={{
                      fontSize: '0.75rem',
                      letterSpacing: '0.12em',
                      color: 'rgba(255,255,255,0.5)',
                      margin: 0,
                      marginBottom: '0.875rem',
                    }}
                  >
                    Connected profiles
                  </h2>
                  <ConnectedProfilesList managed={managed} />
                </div>
              )}

              {/* Posts / Media feed (placeholder until those features ship) */}
              <ProfileFeed isOwner={isOwner} username={profile.username ?? slug} userId={profile.user_id} />

              {/* Passport sections — only render if user has a player record. */}
              <PassportSections profileUserId={profile.user_id} isOwner={isOwner} />

              {/* Cover history strip — Phase 1b public gallery. */}
              {coverHistory.length >= 1 && (
                <div
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '1.25rem',
                  }}
                >
                  <CoverImageHistoryStrip entries={coverHistory} isOwner={isOwner} />
                </div>
              )}

              {/* Footer */}
              <div
                style={{
                  padding: '0.75rem 0',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'rgba(255,255,255,0.4)',
                      margin: 0,
                    }}
                  >
                    Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}
                  </p>
                  <TierBadge tier={profile.tier} size="sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── ConnectedProfilesList ───────────────────────────────────
// Renders the 4-bucket grouping (Records / Teams / Leagues / Family).
// Bucket assignment mirrors the legacy logic: rel='self' → records,
// team → teams, league → leagues, anything else → family.
function ConnectedProfilesList({ managed }: { managed: ManagedProfile[] }) {
  const labelFor = (m: ManagedProfile): string => {
    const p = m.profile;
    if (!p) return 'Unnamed';
    if (m.profile_type === 'player') {
      return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || 'Unnamed';
    }
    return p.name || p.display_name || 'Unnamed';
  };
  const imgFor = (m: ManagedProfile): string | null => {
    const p = m.profile;
    if (!p) return null;
    if (m.profile_type === 'player') return p.headshot_url ?? null;
    return p.logo_url ?? null;
  };
  const bucket = (rel: string, type: string) => {
    if (rel === 'self') return 'records';
    if (type === 'team') return 'teams';
    if (type === 'league') return 'leagues';
    return 'family';
  };
  const hrefFor = (m: ManagedProfile): string => {
    const p = m.profile;
    if (m.profile_type === 'player') return `/players/${m.profile_id}`;
    if (m.profile_type === 'team') return `/directory/teams/${p?.slug || m.profile_id}`;
    if (m.profile_type === 'league') return `/directory/leagues/${m.profile_id}`;
    return `/directory/${m.profile_type}s/${m.profile_id}`;
  };

  const groups: Record<string, ManagedProfile[]> = { records: [], teams: [], leagues: [], family: [] };
  for (const m of managed) groups[bucket(m.relationship, m.profile_type)].push(m);

  const bucketLabels: Record<string, string> = {
    records: 'Records I steward',
    teams: 'Teams I run',
    leagues: 'Leagues I admin',
    family: 'Family I manage',
  };

  const bucketHints: Record<string, string> = {
    records: 'player or team records this person owns',
    teams: 'head coach / manager / staff',
    leagues: 'league administrators',
    family: 'parent / guardian / spouse',
  };

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([key, rows]) => {
        if (rows.length === 0) return null;
        return (
          <div key={key}>
            <div className="flex items-baseline gap-2 mb-2">
              <h3
                className="font-sport uppercase"
                style={{
                  fontSize: '0.8125rem',
                  letterSpacing: '0.1em',
                  color: 'rgba(255,255,255,0.7)',
                  margin: 0,
                }}
              >
                {bucketLabels[key]}
              </h3>
              <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>{bucketHints[key]}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rows.map((m) => (
                <Link
                  key={m.id}
                  href={hrefFor(m)}
                  className="flex items-center gap-2.5 rounded-lg p-2.5 transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    textDecoration: 'none',
                  }}
                >
                  {imgFor(m) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgFor(m)!}
                      alt=""
                      style={{
                        width: '2.25rem',
                        height: '2.25rem',
                        borderRadius: 6,
                        objectFit: 'cover',
                        background: 'rgba(255,255,255,0.05)',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '2.25rem',
                        height: '2.25rem',
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        color: 'rgba(255,255,255,0.4)',
                        flexShrink: 0,
                      }}
                    >
                      {m.profile_type === 'player' ? '🏒' : m.profile_type === 'team' ? '🛡️' : '🏆'}
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="font-semibold truncate" style={{ margin: 0, fontSize: '0.875rem' }}>
                      {labelFor(m)}
                    </p>
                    <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'capitalize' }}>
                      {m.profile_type} · {m.relationship.replace(/_/g, ' ')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
