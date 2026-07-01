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

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  free:         { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)',  text: 'rgba(255,255,255,0.5)', label: 'Free' },
  roster:       { bg: 'rgba(255,184,28,0.1)',  border: 'rgba(255,184,28,0.3)',  text: '#FFB81C',                label: 'Roster Starter' },
  roster_plus:  { bg: 'rgba(255,184,28,0.12)', border: 'rgba(255,184,28,0.4)',  text: '#FFB81C',                label: 'Roster Pro' },
  pro:          { bg: 'rgba(20,184,166,0.1)',  border: 'rgba(20,184,166,0.3)',  text: '#14B8A6',                label: 'Roster Premium' },
  premium:      { bg: 'rgba(20,184,166,0.1)',  border: 'rgba(20,184,166,0.3)',  text: '#14B8A6',                label: 'Roster Premium' },
  business_starter: { bg: 'rgba(255,184,28,0.1)', border: 'rgba(255,184,28,0.3)', text: '#FFB81C', label: 'Business Starter' },
  business_pro: { bg: 'rgba(20,184,166,0.1)',  border: 'rgba(20,184,166,0.3)',  text: '#14B8A6',                label: 'Business Pro' },
  business_premium: { bg: 'rgba(200,16,46,0.12)', border: 'rgba(200,16,46,0.4)',   text: '#C8102E', label: 'Business Premium' },
  enterprise:   { bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.3)',  text: '#818CF8',                label: 'Enterprise' },
};

export default async function ProfileBySlugPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await fetchProfile(slug);
  if (!data) notFound();

  const { profile, managed, accountTypes, photoHistory } = data;
  const displayName = profile.display_name ?? 'RinkStop user';
  const profileUrl = `https://rinkstop.com/profile/${profile.username}`;
  const tierStyle = TIER_COLORS[profile.tier] ?? TIER_COLORS.free;

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
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="flex items-start gap-6 mb-8">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-24 h-24 rounded-full object-cover border-2 border-white/10"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-3xl">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              {(() => {
                // Identity verification is the ONLY check. Tier is shown as
                // a text pill below this row. The previous teal check on
                // every Pro+ profile is removed.
                //
                // Piece C (2026-06-24): verifiedAt/expiresAt are gated by
                // the hardened helper above. If the helper returned false
                // (no real Didit session), verifiedAt is null here and the
                // shield doesn't render.
                if (!verifiedAt || !expiresAt) return null;
                return (
                  <IdentityVerified
                    verifiedAt={verifiedAt}
                    expiresAt={expiresAt}
                  />
                );
              })()}
              <FoundingMemberBadge />
            </div>
            <p className="text-white/50 text-sm mb-3 -mt-0.5">
              <span className="text-white/30">@</span>{profile.username}
            </p>

            {/* Tier pill (kept compact, single line) */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className="text-xs px-2 py-1 rounded"
                style={{ background: tierStyle.bg, border: `1px solid ${tierStyle.border}`, color: tierStyle.text }}
              >
                {tierStyle.label}
              </span>
            </div>

            {/* Roles row — promoted to its own labelled line (Piece 1.1).
                Larger badges, clearer primary. When the user has no roles set,
                show a CTA to the dashboard picker so empty profiles don't
                look "unfinished" (Piece 1.4). */}
            {accountTypes.length > 0 ? (
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1.5">Roles</p>
                <AccountTypeBadges
                  types={accountTypes.map((t) => t.account_type)}
                  primary={accountTypes.find((t) => t.is_primary)?.account_type ?? null}
                  size="md"
                />
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1.5">Roles</p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-sm text-[#FFB81C] hover:text-[#FFB81C]/80 border border-[#FFB81C]/30 hover:border-[#FFB81C]/60 rounded-full px-3 py-1 transition-colors"
                >
                  Add your roles <span aria-hidden>→</span>
                </Link>
              </div>
            )}

            {profile.location && (
              <p className="text-sm text-white/50 mb-2">📍 {profile.location}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              <ConnectButton otherUserId={profile.user_id} otherDisplayName={displayName.split(' ')[0] || 'this user'} />
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
        </header>

        {/* Bio */}
        {profile.bio && (
          <section className="mb-8">
            <p className="text-white/80 whitespace-pre-wrap">{profile.bio}</p>
          </section>
        )}

        {/* Managed profiles (Piece 1.2 — sectioned by relationship).
            Buckets: records I steward (self), teams I run, leagues I admin,
            family I manage. Hidden entirely if the user has none. */}
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
          const groups: Record<string, ManagedProfile[]> = { records: [], teams: [], leagues: [], family: [] };
          for (const m of managed) groups[bucket(m.relationship, m.profile_type)].push(m);

          const section = (key: string, title: string, hint: string, rows: ManagedProfile[]) => {
            if (rows.length === 0) return null;
            return (
              <div key={key} className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <h3 className="text-sm uppercase text-white/50">{title}</h3>
                  <span className="text-[11px] text-white/30">{hint}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rows.map((m) => (
                    <Link
                      key={m.id}
                      href={`/directory/${m.profile_type}s/${m.profile_id}`}
                      className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 transition-colors"
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
            <section className="mb-8">
              <h2 className="text-sm uppercase text-white/40 mb-3">Connected profiles</h2>
              {section('records', 'Records I steward', 'player or team records this person owns', groups.records)}
              {section('teams', 'Teams I run', 'head coach / manager / staff', groups.teams)}
              {section('leagues', 'Leagues I admin', 'league administrators', groups.leagues)}
              {section('family', 'Family I manage', 'parent / guardian / spouse', groups.family)}
            </section>
          );
        })()}

        {/* Photo history (Day 7, Arnel 2026-06-23 05:13 CDT — public).
            Shows the user's previous profile photos in reverse-chronological
            order. The current photo is the first tile (highlighted). The
            section is hidden when there's only ever been one photo or zero
            photos — no point showing an empty strip. */}
        {photoHistory.length >= 2 && (
          <section className="mb-8">
            <h2 className="text-sm uppercase text-white/40 mb-3">Photo history</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {photoHistory.map((p, i) => {
                const isCurrent = i === 0 && !p.removed_at;
                return (
                  <div
                    key={p.id}
                    className="flex-shrink-0"
                    style={{ width: 96 }}
                  >
                    {p.url ? (
                      <img
                        src={p.url}
                        alt={isCurrent ? 'Current profile photo' : 'Previous profile photo'}
                        className={`w-24 h-24 rounded-lg object-cover border-2 ${
                          isCurrent ? 'border-[#FFB81C]' : 'border-white/10'
                        }`}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-white/5 border border-white/10" />
                    )}
                    <p className="text-xs text-white/40 mt-1">
                      {new Date(p.set_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                      {isCurrent && <span className="ml-1 text-[#FFB81C]">· now</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Footer / metadata */}
        <footer className="text-xs text-white/40 mt-12">
          Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}
        </footer>
      </div>
    </main>
  );
}
