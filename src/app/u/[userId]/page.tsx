'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ConnectButton from '@/components/ConnectButton';
import SocialActions from '@/components/SocialActions';
import { TierBadge, VerifiedCheckmark, FoundingMemberBadge } from '@/components/TierBadge';
import AccountTypeBadges from '@/components/AccountTypeBadges';

interface Profile {
  user_id: string;
  display_name: string | null;
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

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  free:      { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)',  text: 'rgba(255,255,255,0.5)', label: 'Free' },
  supporter: { bg: 'rgba(255,184,28,0.1)',  border: 'rgba(255,184,28,0.3)',  text: '#FFB81C',                label: 'Supporter' },
  verified:  { bg: 'rgba(20,184,166,0.1)',  border: 'rgba(20,184,166,0.3)',  text: '#14B8A6',                label: 'Verified' },
  pro:       { bg: 'rgba(200,16,46,0.1)',   border: 'rgba(200,16,46,0.3)',   text: '#C8102E',                label: 'Pro' },
};

export default function UserProfilePage() {
  const params = useParams();
  const userId = params?.userId as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [managed, setManaged] = useState<ManagedProfile[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const [pRes, mRes, aRes] = await Promise.all([
          fetch(`/api/profiles/${userId}`).catch(() => null),
          fetch(`/api/profiles/managed?userId=${userId}`).catch(() => null),
          fetch(`/api/account-type?userId=${userId}`).catch(() => null),
        ]);
        if (cancelled) return;
        if (pRes && pRes.ok) {
          const data = await pRes.json();
          setProfile(data.profile || null);
        } else {
          setNotFound(true);
        }
        if (mRes && mRes.ok) {
          const data = await mRes.json();
          setManaged(data.managedProfiles || []);
        }
        if (aRes && aRes.ok) {
          const data = await aRes.json();
          setAccountTypes(data.types || []);
        }
      } catch {
        setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading…</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Profile not found</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>This user doesn't exist or has been removed.</p>
        <Link href="/" style={{ color: '#FFB81C', textDecoration: 'none' }}>← Back to RinkStop</Link>
      </div>
    );
  }

  const tier = TIER_COLORS[profile.tier] || TIER_COLORS.free;
  const displayName = profile.display_name || 'RinkStop Member';
  const isVerified = profile.tier === 'verified' || profile.tier === 'pro';
  const isFounding = profile.is_founding_member;
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14 }}>← Back to RinkStop</Link>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginTop: '2rem', padding: '1.5rem', background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12 }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '2px solid #041E42' }} />
          ) : (
            <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#041E42', color: '#FFB81C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700 }}>
              {displayName[0]?.toUpperCase() || '?'}
            </div>
          )}

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              {displayName}
              {isVerified && <VerifiedCheckmark size={20} />}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <TierBadge tier={profile.tier} size="sm" />
              {isFounding && <FoundingMemberBadge size="sm" />}
              {profile.location && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  📍 {profile.location}
                </span>
              )}
              {memberSince && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  · Member since {memberSince}
                </span>
              )}
            </div>
            {accountTypes.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <AccountTypeBadges
                  types={accountTypes.map((a) => a.account_type)}
                  primary={accountTypes.find((a) => a.is_primary)?.account_type || accountTypes[0]?.account_type || null}
                  size="sm"
                />
              </div>
            )}
            {profile.bio && (
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.5, margin: 0, marginBottom: 12 }}>{profile.bio}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <ConnectButton otherUserId={profile.user_id} otherDisplayName={displayName.split(' ')[0] || 'this user'} />
              <SocialActions
                followeeType="user"
                followeeId={profile.user_id}
                followeeName={displayName}
                messageRecipientId={profile.user_id}
                messageRecipientName={displayName}
                size="sm"
              />
            </div>
          </div>
        </div>

        {managed.length > 0 && (
          <section style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>Profiles they manage</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {managed.map((m) => (
                <div key={m.id} style={{ padding: '1rem', background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>
                    {m.profile_type} • {m.relationship}
                  </div>
                  {m.profile ? (
                    m.profile_type === 'player' ? (
                      <Link href={`/directory/players/${m.profile.slug || m.profile.id}`} style={{ color: '#FFB81C', textDecoration: 'none', fontWeight: 600 }}>
                        {m.profile.first_name} {m.profile.last_name}
                      </Link>
                    ) : m.profile_type === 'team' ? (
                      <Link href={`/directory/teams/${m.profile.slug || m.profile.id}`} style={{ color: '#FFB81C', textDecoration: 'none', fontWeight: 600 }}>
                        {m.profile.name}
                      </Link>
                    ) : (
                      <Link href={`/directory/leagues/${m.profile.slug || m.profile.id}`} style={{ color: '#FFB81C', textDecoration: 'none', fontWeight: 600 }}>
                        {m.profile.name}
                      </Link>
                    )
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Profile not found</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
