import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import ConnectButton from '@/components/ConnectButton';
import SocialActions from '@/components/SocialActions';
import { TierBadge, VerifiedCheckmark, FoundingMemberBadge } from '@/components/TierBadge';
import AccountTypeBadges from '@/components/AccountTypeBadges';

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
  profile: any;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchProfile(slug: string): Promise<{
  profile: Profile;
  managed: ManagedProfile[];
  accountTypes: AccountTypeRow[];
} | null> {
  // Look up by username (case-insensitive)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .ilike('username', slug)
    .maybeSingle();

  if (!profile) return null;

  const [mRes, aRes] = await Promise.all([
    supabaseAdmin
      .from('managed_profiles')
      .select('id, profile_type, profile_id, relationship, profile:profiles(*)')
      .eq('user_id', profile.user_id),
    supabaseAdmin
      .from('profile_account_types')
      .select('account_type, is_primary')
      .eq('user_id', profile.user_id),
  ]);

  return {
    profile,
    managed: (mRes.data as any) ?? [],
    accountTypes: (aRes.data as any) ?? [],
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
  free:       { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)',  text: 'rgba(255,255,255,0.5)', label: 'Free' },
  starter:    { bg: 'rgba(255,184,28,0.1)',  border: 'rgba(255,184,28,0.3)',  text: '#FFB81C',                label: 'Starter' },
  pro:        { bg: 'rgba(20,184,166,0.1)',  border: 'rgba(20,184,166,0.3)',  text: '#14B8A6',                label: 'Pro' },
  premium:    { bg: 'rgba(200,16,46,0.1)',   border: 'rgba(200,16,46,0.3)',   text: '#C8102E',                label: 'Premium' },
  enterprise: { bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.3)',  text: '#818CF8',                label: 'Enterprise' },
};

export default async function ProfileBySlugPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await fetchProfile(slug);
  if (!data) notFound();

  const { profile, managed, accountTypes } = data;
  const displayName = profile.display_name ?? 'RinkStop user';
  const profileUrl = `https://rinkstop.com/profile/${profile.username}`;
  const tierStyle = TIER_COLORS[profile.tier] ?? TIER_COLORS.free;

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

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <VerifiedCheckmark />
              <FoundingMemberBadge />
            </div>
            <p className="text-white/60 mb-2">@{profile.username}</p>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className="text-xs px-2 py-1 rounded"
                style={{ background: tierStyle.bg, border: `1px solid ${tierStyle.border}`, color: tierStyle.text }}
              >
                {tierStyle.label}
              </span>
              {accountTypes.length > 0 && (
                <AccountTypeBadges
                  types={accountTypes.map((t) => t.account_type)}
                  primary={accountTypes.find((t) => t.is_primary)?.account_type ?? null}
                />
              )}
            </div>

            {profile.location && (
              <p className="text-sm text-white/50 mb-2">📍 {profile.location}</p>
            )}

            <div className="flex gap-2 mt-3">
              <ConnectButton otherUserId={profile.user_id} otherDisplayName={displayName.split(' ')[0] || 'this user'} />
              <SocialActions
                share={{
                  title: `${displayName} (@${profile.username}) on RinkStop`,
                  text: `${displayName} on RinkStop — the global hockey directory.`,
                  url: profileUrl,
                }}
                messageRecipientId={profile.user_id}
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

        {/* Managed profiles */}
        {managed.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm uppercase text-white/40 mb-3">Connected profiles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {managed.map((m) => (
                <Link
                  key={m.id}
                  href={`/directory/${m.profile_type}s/${m.profile_id}`}
                  className="block bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3"
                >
                  <p className="text-xs text-white/40 capitalize">{m.profile_type}</p>
                  <p className="font-semibold">{(m.profile as any)?.name ?? 'Unnamed'}</p>
                  <p className="text-xs text-white/50">{m.relationship}</p>
                </Link>
              ))}
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
