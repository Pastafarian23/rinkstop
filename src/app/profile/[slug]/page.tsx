import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import ConnectButton from '@/components/ConnectButton';
import SocialActions from '@/components/SocialActions';
import { TierBadge, FoundingMemberBadge } from '@/components/TierBadge';
import { IdentityVerified } from '@/components/IdentityVerified';
import AccountTypeBadges from '@/components/AccountTypeBadges';
import { isIdentityVerified } from '@/lib/identity-verified';
import { getTierLabel } from '@/lib/pricing';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface Profile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  tier: string;
  tier_expires_at: string | null;
  is_founding_member: boolean;
  created_at: string | null;
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
} | null> {
  // Look up by username (case-insensitive)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .ilike('username', slug)
    .maybeSingle();

  if (!profile) return null;

  const [mRes, aRes, phRes] = await Promise.all([
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
      ? supabaseAdmin.from('teams').select('id, name, slug, logo_url').in('id', teamIds)
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
      if (t) hydrated = { name: t.name ?? null, slug: t.slug ?? null, logo_url: t.logo_url ?? null };
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

  const { profile, managed, accountTypes, photoHistory } = data;
  const displayName = profile.display_name ?? 'RinkStop user';
  const profileUrl = `https://rinkstop.com/profile/${profile.username}`;
  const tierLabel = getTierLabel(profile.tier);

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
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        {/* Scoped style block: overrides ConnectButton/SocialActions inline
            styles so the three action-row buttons share a consistent
            border-radius, padding, font-size, and transition. The original
            component logic (6 connection states, share popover, etc.) is
            untouched — we only restyle. */}
        <style>{`
          .rs-profile-actions > * {
            display: inline-flex !important;
            align-items: center !important;
            gap: 0.5rem !important;
            font-size: 0.875rem !important;
            font-weight: 600 !important;
            padding: 0.5rem 1rem !important;
            border-radius: 8px !important;
            transition: all 0.15s !important;
            line-height: 1.2 !important;
            text-decoration: none !important;
            cursor: pointer !important;
            min-height: 36px !important;
          }
          .rs-profile-actions > *:hover {
            transform: translateY(-1px);
          }
          .rs-profile-actions a[href*="/dashboard/messages"] {
            background: rgba(255,184,28,0.12) !important;
            color: #FFB81C !important;
            border: 1px solid rgba(255,184,28,0.4) !important;
          }
          .rs-profile-actions a[href*="/dashboard/messages"]:hover {
            background: rgba(255,184,28,0.2) !important;
            border-color: rgba(255,184,28,0.7) !important;
          }
          .rs-profile-actions a[href*="/login"],
          .rs-profile-actions a[href*="/sign-in"] {
            background: var(--red) !important;
            color: #fff !important;
            border: 1px solid var(--red-dark) !important;
          }
          .rs-profile-actions a[href*="/login"]:hover,
          .rs-profile-actions a[href*="/sign-in"]:hover {
            background: var(--red-dark) !important;
          }
          .rs-profile-actions [data-testid="share-button"] {
            background: rgba(255,255,255,0.05) !important;
            color: #fff !important;
            border: 1px solid rgba(255,255,255,0.15) !important;
          }
          .rs-profile-actions [data-testid="share-button"]:hover {
            background: rgba(255,255,255,0.1) !important;
            border-color: rgba(255,255,255,0.3) !important;
          }
          .rs-profile-actions a[href*="/dashboard/profile"] {
            background: var(--red) !important;
            color: #fff !important;
            border: 1px solid var(--red-dark) !important;
          }
          .rs-profile-actions a[href*="/dashboard/profile"]:hover {
            background: var(--red-dark) !important;
          }
        `}</style>

        {/* Single card container — matches the rest of the dark-theme site */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0A1A33 0%, #041E42 100%)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          {/* ─── HEADER ─────────────────────────────────────────── */}
          <div className="p-6 md:p-8">
            <div className="flex items-start gap-5 md:gap-6">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 flex-shrink-0"
                  style={{ borderColor: 'var(--red)' }}
                />
              ) : (
                <div
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-3xl md:text-4xl flex-shrink-0 font-sport"
                  style={{
                    background: 'linear-gradient(135deg, var(--red) 0%, #8b0a1e 100%)',
                    color: '#fff',
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                {/* Name + verification badges */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1
                    className="font-sport text-white"
                    style={{
                      fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
                      letterSpacing: '0.04em',
                      lineHeight: 0.95,
                      margin: 0,
                    }}
                  >
                    {displayName}
                  </h1>
                  {verifiedAt && expiresAt && (
                    <IdentityVerified verifiedAt={verifiedAt} expiresAt={expiresAt} />
                  )}
                  <FoundingMemberBadge />
                </div>

                {/* Metadata strip: @handle · location · tier */}
                <div className="flex items-center gap-2 flex-wrap text-sm text-white/60">
                  <span>
                    <span className="text-white/30">@</span>
                    {profile.username}
                  </span>
                  {profile.location && (
                    <>
                      <span className="text-white/25">·</span>
                      <span>📍 {profile.location}</span>
                    </>
                  )}
                  <span className="text-white/25">·</span>
                  <TierBadge tier={profile.tier} size="xs" />
                </div>
              </div>
            </div>

            {/* Action row — three buttons, consistent style via scoped CSS */}
            <div className="rs-profile-actions flex flex-wrap gap-2 mt-5">
              <ConnectButton
                otherUserId={profile.user_id}
                otherDisplayName={displayName.split(' ')[0] || 'this user'}
              />
              <SocialActions
                share={{
                  title: `${displayName} (@${profile.username}) on RinkStop`,
                  text: `${displayName} on RinkStop — the global hockey directory.`,
                  url: profileUrl,
                }}
                messageRecipientId={profile.user_id}
                shareVariant="brand"
              />
            </div>
          </div>

          {/* ─── DIVIDER ────────────────────────────────────────── */}
          {profile.bio && (
            <div
              className="px-6 md:px-8 py-5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p
                className="text-white/80 whitespace-pre-wrap"
                style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}
              >
                {profile.bio}
              </p>
            </div>
          )}

          {/* ─── ROLES ──────────────────────────────────────────── */}
          <div className="p-6 md:p-8">
            <h2
              className="font-sport uppercase text-white/50 mb-3"
              style={{ fontSize: '0.875rem', letterSpacing: '0.1em' }}
            >
              Roles
            </h2>
            {accountTypes.length > 0 ? (
              <AccountTypeBadges
                types={accountTypes.map((t) => t.account_type)}
                primary={accountTypes.find((t) => t.is_primary)?.account_type ?? null}
                size="md"
              />
            ) : (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm text-[#FFB81C] hover:text-[#FFB81C]/80 border border-[#FFB81C]/30 hover:border-[#FFB81C]/60 rounded-full px-3 py-1 transition-colors"
              >
                Add your roles <span aria-hidden>→</span>
              </Link>
            )}
          </div>

          {/* ─── CONNECTED PROFILES ─────────────────────────────── */}
          {managed.length > 0 && (() => {
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

            const section = (key: string, title: string, hint: string, rows: ManagedProfile[]) => {
              if (rows.length === 0) return null;
              return (
                <div key={key} className="mb-6 last:mb-0">
                  <div className="flex items-baseline gap-2 mb-2">
                    <h3
                      className="font-sport uppercase text-white/70"
                      style={{ fontSize: '0.8125rem', letterSpacing: '0.1em' }}
                    >
                      {title}
                    </h3>
                    <span className="text-[11px] text-white/30">{hint}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {rows.map((m) => (
                      <Link
                        key={m.id}
                        href={hrefFor(m)}
                        className="flex items-center gap-3 rounded-lg p-3 transition-colors"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {imgFor(m) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgFor(m)!} alt="" className="w-10 h-10 rounded object-cover bg-white/5 flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-white/40 flex-shrink-0">
                            {m.profile_type === 'player' ? '🏒' : m.profile_type === 'team' ? '🛡️' : '🏆'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{labelFor(m)}</p>
                          <p className="text-xs text-white/50 capitalize">{m.profile_type} · {m.relationship.replace(/_/g, ' ')}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            };

            return (
              <div
                className="p-6 md:p-8"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                <h2
                  className="font-sport uppercase text-white/50 mb-4"
                  style={{ fontSize: '0.875rem', letterSpacing: '0.1em' }}
                >
                  Connected profiles
                </h2>
                {section('records', 'Records I steward', 'player or team records this person owns', groups.records)}
                {section('teams', 'Teams I run', 'head coach / manager / staff', groups.teams)}
                {section('leagues', 'Leagues I admin', 'league administrators', groups.leagues)}
                {section('family', 'Family I manage', 'parent / guardian / spouse', groups.family)}
              </div>
            );
          })()}

          {/* ─── PHOTO HISTORY ──────────────────────────────────── */}
          {photoHistory.length >= 2 && (
            <div
              className="p-6 md:p-8"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h2
                className="font-sport uppercase text-white/50 mb-4"
                style={{ fontSize: '0.875rem', letterSpacing: '0.1em' }}
              >
                Photo history
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {photoHistory.map((p, i) => {
                  const isCurrent = i === 0 && !p.removed_at;
                  return (
                    <div
                      key={p.id}
                      className="flex-shrink-0 relative"
                      style={{ width: 80 }}
                    >
                      {p.url ? (
                        <img
                          src={p.url}
                          alt={isCurrent ? 'Current profile photo' : 'Previous profile photo'}
                          className="w-20 h-20 rounded-lg object-cover"
                          style={{
                            border: isCurrent ? '2px solid var(--red)' : '1px solid rgba(255,255,255,0.1)',
                          }}
                        />
                      ) : (
                        <div
                          className="w-20 h-20 rounded-lg"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        />
                      )}
                      {isCurrent && (
                        <div
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                          style={{
                            background: 'var(--gold)',
                            color: '#041E42',
                            fontWeight: 700,
                          }}
                          aria-label="Current photo"
                        >
                          ✓
                        </div>
                      )}
                      <p
                        className="mt-1.5 text-center text-white/40"
                        style={{ fontSize: '10px', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                      >
                        {new Date(p.set_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── FOOTER ─────────────────────────────────────────── */}
          <div
            className="px-6 md:px-8 py-5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs text-white/40">
              Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}
              {tierLabel && tierLabel !== 'Free' && (
                <span className="ml-2 text-white/30">· {tierLabel} member</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
