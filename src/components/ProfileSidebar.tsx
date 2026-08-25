import Link from 'next/link';
import { IdentityVerified } from '@/components/IdentityVerified';
import { FoundingMemberBadge, TierBadge } from '@/components/TierBadge';
import AccountTypeBadges from '@/components/AccountTypeBadges';
import ConnectButton from '@/components/ConnectButton';
import SocialActions from '@/components/SocialActions';

interface AccountTypeRow {
  account_type: string;
  is_primary: boolean;
}

interface ProfileSidebarProps {
  profile: {
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
    tier: string;
    is_founding_member: boolean;
    created_at: string | null;
  };
  identityVerifiedAt: string | null;
  identityExpiresAt: string | null;
  accountTypes: AccountTypeRow[];
  profileUrl: string;
  isOwner: boolean;
}

/**
 * Left sidebar for the profile page. Sits in the 1/3 column on desktop,
 * stacks above the right column on mobile.
 *
 * Contains:
 *  - Avatar
 *  - Identity row (name, badges, @handle, location, tier)
 *  - Action row (Connect / Message / Share) — horizontal, no wrap
 *  - Intro card (bio + meta lines)
 *  - Roles section (compact badges with one-line descriptions)
 *  - "Edit profile" affordance for owner
 */
export default function ProfileSidebar({
  profile,
  identityVerifiedAt,
  identityExpiresAt,
  accountTypes,
  profileUrl,
  isOwner,
}: ProfileSidebarProps) {
  const displayName = profile.display_name ?? 'RinkStop user';
  const firstName = displayName.split(' ')[0] || 'this user';
  const joinedYear = profile.created_at ? new Date(profile.created_at).getFullYear() : null;

  return (
    <aside className="lg:sticky lg:top-4 space-y-4">
      {/* ─── Identity card ──────────────────────────────────────── */}
      <div
        style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: '1.25rem',
        }}
      >
        {/* Name + badges */}
        <div className="flex items-start gap-2 flex-wrap mb-1">
          <h1
            className="font-sport text-white"
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              letterSpacing: '0.04em',
              lineHeight: 1,
              margin: 0,
            }}
          >
            {displayName}
          </h1>
          {identityVerifiedAt && identityExpiresAt && (
            <IdentityVerified verifiedAt={identityVerifiedAt} expiresAt={identityExpiresAt} />
          )}
          {profile.is_founding_member && <FoundingMemberBadge />}
        </div>

        {/* @handle · location · tier */}
        <div className="flex items-center gap-2 flex-wrap text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>@</span>
            {profile.username}
          </span>
          {profile.location && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
              <span>📍 {profile.location}</span>
            </>
          )}
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
          <TierBadge tier={profile.tier} size="sm" />
        </div>

        {/* Owner-only inline edit shortcut — sits above the action row so
            the owner sees an obvious path to edit themselves instead of
            having to scroll to the bottom of the sidebar. The bottom
            bottom-of-aside duplicate was removed; this is the canonical
            edit affordance. */}
        {isOwner && (
          <Link
            href="/dashboard/profile"
            className="mt-3 inline-flex items-center gap-1.5 text-[#FFB81C] hover:text-[#FFB81C]/80"
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span aria-hidden>✎</span>
            <span>Edit your profile</span>
          </Link>
        )}

        {/* Action row */}
        <div
          className="mt-4"
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'nowrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <ConnectButton otherUserId={profile.user_id} otherDisplayName={firstName} compact />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SocialActions
              size="sm"
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
      </div>

      {/* ─── Intro card ─────────────────────────────────────────── */}
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
          Intro
        </h2>

        {profile.bio ? (
          <p
            className="text-white/85"
            style={{
              fontSize: '0.9375rem',
              lineHeight: 1.55,
              margin: 0,
              marginBottom: '1rem',
              whiteSpace: 'pre-wrap',
            }}
          >
            {profile.bio}
          </p>
        ) : isOwner ? (
          <Link
            href="/dashboard/profile"
            className="text-[#FFB81C] hover:text-[#FFB81C]/80 inline-block"
            style={{
              fontSize: '0.875rem',
              margin: 0,
              marginBottom: '1rem',
              textDecoration: 'none',
            }}
          >
            Add a bio →
          </Link>
        ) : null}

        {/* Meta lines, like Facebook's "Lives in", "Joined"] */}
        <ul className="space-y-1.5" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {profile.location && (
            <li className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <span aria-hidden style={{ width: '1.25rem', textAlign: 'center' }}>📍</span>
              <span>{profile.location}</span>
            </li>
          )}
          {joinedYear && (
            <li className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <span aria-hidden style={{ width: '1.25rem', textAlign: 'center' }}>📅</span>
              <span>Joined {joinedYear}</span>
            </li>
          )}
        </ul>
      </div>

      {/* ─── Roles section ──────────────────────────────────────── */}
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
          Roles
        </h2>

        {accountTypes.length > 0 ? (
          <div>
            <AccountTypeBadges
              types={accountTypes.map((t) => t.account_type)}
              primary={accountTypes.find((t) => t.is_primary)?.account_type ?? null}
              size="sm"
            />
            <p
              className="mt-3"
              style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.4)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {accountTypes.length === 1 ? 'This profile' : 'These profiles'} appear on RinkStop as{' '}
              {accountTypes.map((t, i) => {
                const labels = accountTypes.map((tt) => tt.account_type);
                if (i === labels.length - 1 && labels.length > 1) return 'and ' + t.account_type;
                return t.account_type + (i < labels.length - 1 ? ', ' : '');
              }).join('')}.
            </p>
          </div>
        ) : isOwner ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-[#FFB81C] hover:text-[#FFB81C]/80 border border-[#FFB81C]/30 hover:border-[#FFB81C]/60 rounded-full px-3 py-1 transition-colors"
            style={{ textDecoration: 'none', fontSize: '0.8125rem' }}
          >
            Add your roles <span aria-hidden>→</span>
          </Link>
        ) : (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            No roles set yet.
          </p>
        )}
      </div>

      {/* ─── Owner-only edit CTA moved up — see the link above the action row ── */}
    </aside>
  );
}
