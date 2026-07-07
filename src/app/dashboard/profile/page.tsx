import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { TierBadge, FoundingMemberBadge } from '@/components/TierBadge';
import { isIdentityVerified } from '@/lib/identity-verified';
import ProfileEditForm from './ProfileEditForm';
import FollowingList from './FollowingList';
import ChangePhotoButton from './ChangePhotoButton';
import PlayerDocumentSection from '@/components/player-documents/PlayerDocumentSection';
import PlayerTimelineSection from '@/components/player-achievements/PlayerTimelineSection';
import PlayerMediaSection from '@/components/player-media/PlayerMediaSection';
import { buildTimeline } from '@/lib/timeline-builder';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.userId) redirect('/login');

  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);

  const user = await currentUser();
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const email = user?.emailAddresses?.[0]?.emailAddress || '';
  const avatarUrl = user?.imageUrl || '';

  // Pull the profile fields editable here (bio + location + tier + founding)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('bio, location, tier, is_founding_member, display_name, username')
    .eq('user_id', userId)
    .maybeSingle();

  // Phase 1a: reframe /dashboard/profile as a Hockey Passport. Read
  // identity-verified status (1 condition: profile_identity_status row) and
  // parent relationships (managed_profiles for this user).
  let identityVerified = false;
  try {
    identityVerified = await isIdentityVerified(userId);
  } catch {
    identityVerified = false;
  }

  let parentRelationships: any[] = [];
  try {
    const { data: relationships } = await supabaseAdmin
      .from('managed_profiles')
      .select('id, relationship, profile_id, players:profile_id ( first_name, last_name, slug )')
      .eq('manager_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8);
    parentRelationships = (relationships || []).map((r: any) => {
      const p = r.players;
      const name = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown Player';
      return {
        id: r.id,
        relationship: r.relationship || 'parent',
        player_name: name || 'Unknown Player',
        player_slug: p?.slug ?? null,
      };
    });
  } catch {
    parentRelationships = [];
  }

  // Player Documents (Phase 1b-1). One batch query for all linked children,
  // mirroring the dashboard/family page wire. Computed-on-read
  // status='expired' lives here too.
  let documentsByPlayer: Record<string, any[]> = {};
  let consentRevokedByPlayer: Record<string, boolean> = {};
  try {
    const playerIds = parentRelationships
      .map((r) => r.profile_id)
      .filter((id): id is string => !!id);
    if (playerIds.length > 0) {
      const { data: docs } = await supabaseAdmin
        .from('player_documents')
        .select(
          'id, player_id, category, title, description, file_name, file_size_bytes, mime_type, expires_at, status, created_at, updated_at'
        )
        .in('player_id', playerIds)
        .order('created_at', { ascending: false });
      const today = new Date().toISOString().slice(0, 10);
      for (const d of docs || []) {
        let status = d.status;
        if (status === 'active' && d.expires_at && d.expires_at < today) {
          status = 'expired';
        }
        const arr = documentsByPlayer[d.player_id] ?? (documentsByPlayer[d.player_id] = []);
        arr.push({ ...d, status });
      }

      const { data: links } = await supabaseAdmin
        .from('managed_profiles')
        .select('profile_id, minor_consent_revoked_at')
        .eq('manager_user_id', userId)
        .in('profile_id', playerIds);
      for (const l of links || []) {
        consentRevokedByPlayer[l.profile_id] = !!l.minor_consent_revoked_at;
      }
    }
  } catch {
    documentsByPlayer = {};
    consentRevokedByPlayer = {};
  }

  // Player Achievements + Career Timeline (Phase 1b-2). One batch query for
  // achievements per linked child, then build the timeline from the same
  // 5 sources as the family page (team_members, profiles, player_documents,
  // player_achievements). Mirrors dashboard/family.
  let achievementsByPlayer: Record<string, any[]> = {};
  const timelineByPlayer: Record<string, any[]> = {};
  try {
    const playerIds = parentRelationships
      .map((r) => r.profile_id)
      .filter((id): id is string => !!id);
    if (playerIds.length > 0) {
      const { data: achs } = await supabaseAdmin
        .from('player_achievements')
        .select('id, player_id, title, description, category, achieved_at, created_at, updated_at')
        .in('player_id', playerIds)
        .order('achieved_at', { ascending: false });
      for (const a of achs || []) {
        (achievementsByPlayer[a.player_id] = achievementsByPlayer[a.player_id] || []).push(a);
      }
      for (const pid of playerIds) {
        timelineByPlayer[pid] = await buildTimeline(pid, userId);
      }
    }
  } catch {
    achievementsByPlayer = {};
  }

  // Phase 1b-3: player_media per linked child.
  let mediaByPlayer: Record<string, any[]> = {};
  try {
    const playerIds = parentRelationships
      .map((r) => r.profile_id)
      .filter((id): id is string => !!id);
    if (playerIds.length > 0) {
      const { data: media } = await supabaseAdmin
        .from('player_media')
        .select('id, player_id, media_type, caption, storage_paths, width_px, height_px, duration_sec, file_size_bytes, is_primary, status, created_at, updated_at')
        .in('player_id', playerIds)
        .order('created_at', { ascending: false });
      for (const m of media || []) {
        (mediaByPlayer[m.player_id] = mediaByPlayer[m.player_id] || []).push(m);
      }
    }
  } catch {
    mediaByPlayer = {};
  }

  // Clerk-managed fields (kept for the Edit modal, but sectioned under
  // "Player Photo" rather than the legacy "Account Information" label).
  const clerkFields = [
    { label: 'First Name', value: firstName || '—' },
    { label: 'Last Name', value: lastName || '—' },
    { label: 'Email', value: email },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 760 }}>

      {/* Hockey Passport header */}
      <div
        data-testid="hockey-passport-header"
        style={{
          background: 'linear-gradient(135deg, #0f0f0f 0%, #141414 100%)',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid #C8102E' }}
          />
        ) : (
          <div
            data-testid="hockey-passport-avatar-fallback"
            style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'linear-gradient(135deg, #C8102E 0%, #8b0a1e 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '2.5rem',
            }}
          >
            {firstName?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem', color: '#fff', letterSpacing: '0.05em',
            margin: '0 0 0.25rem',
          }}>
            YOUR HOCKEY PASSPORT
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
            Your permanent hockey record. One profile that travels with you across teams, leagues, and seasons.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <TierBadge tier={profile?.tier || 'free'} size="xs" />
            {profile?.is_founding_member && <FoundingMemberBadge size="sm" />}
            {identityVerified ? (
              <span
                data-testid="hockey-passport-verified-badge"
                style={{
                  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                  padding: '0.2rem 0.55rem', borderRadius: 999,
                  background: 'rgba(20,184,166,0.12)', color: '#14B8A6',
                  border: '1px solid rgba(20,184,166,0.4)',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
              >
                <span aria-hidden>✓</span>
                Verified
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Section 1: Verified Identity */}
      <PassportSection
        emoji="✅"
        title="VERIFIED IDENTITY"
        description="The check on RinkStop. Proves you are who you say you are."
        testId="passport-section-verified-identity"
      >
        {identityVerified ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 0' }}>
            <div style={{ color: '#14B8A6', fontSize: '1.5rem' }} aria-hidden>✓</div>
            <div>
              <p style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
                Your Hockey Identity is live.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', margin: '0.25rem 0 0', lineHeight: 1.4 }}>
                Other RinkStop users see the check next to your name on teams, posts, and claims.
              </p>
            </div>
          </div>
        ) : (
          <div
            data-testid="passport-empty-verified-identity"
            style={{
              padding: '1.25rem 1rem',
              background: '#0a0a0a',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 10,
              textAlign: 'center',
            }}
          >
            <p style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '0.95rem', color: '#fff', letterSpacing: '0.05em',
              margin: '0 0 0.25rem',
            }}>
              NOT YET VERIFIED
            </p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', margin: '0 0 0.75rem', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
              Verify your identity in about 60 seconds to earn the check on RinkStop.
            </p>
            <Link
              href="/dashboard/identity"
              style={{
                display: 'inline-block', padding: '0.55rem 1rem',
                background: '#14B8A6', color: '#0a0a0a',
                borderRadius: 6, fontSize: '0.85rem', fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Verify now →
            </Link>
          </div>
        )}
      </PassportSection>

      {/* Section 2: Player Photo */}
      <PassportSection
        emoji="📸"
        title="PLAYER PHOTO"
        description="Your photo on RinkStop. Synced with Clerk."
        testId="passport-section-player-photo"
      >
        <div style={{ marginBottom: '1rem' }}>
          <ChangePhotoButton />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {clerkFields.map(({ label, value }) => (
            <div
              key={label}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.4rem 0', borderBottom: '1px solid #141414',
              }}
            >
              <span style={{ color: '#666', fontSize: '0.85rem' }}>{label}</span>
              <span style={{ color: '#ccc', fontSize: '0.85rem' }}>{value}</span>
            </div>
          ))}
        </div>
      </PassportSection>

      {/* Section 3: Parent Relationships */}
      <PassportSection
        emoji="👨‍👩‍👧"
        title="PARENT RELATIONSHIPS"
        description="Players you are linked to. Visible to you and your teams."
        testId="passport-section-parent-relationships"
      >
        {parentRelationships.length === 0 ? (
          <div
            data-testid="passport-empty-parent-relationships"
            style={{
              padding: '1.25rem 1rem',
              background: '#0a0a0a',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 10,
              textAlign: 'center',
            }}
          >
            <p style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '0.95rem', color: '#fff', letterSpacing: '0.05em',
              margin: '0 0 0.25rem',
            }}>
              NO PLAYERS LINKED
            </p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', margin: '0 0 0.75rem', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
              Link your first child to start your Family Hub. Their Hockey Passport lives here too.
            </p>
            <Link
              href="/dashboard/family"
              style={{
                display: 'inline-block', padding: '0.55rem 1rem',
                background: '#14B8A6', color: '#0a0a0a',
                borderRadius: 6, fontSize: '0.85rem', fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Open Family Hub →
            </Link>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {parentRelationships.map((r) => (
              <li
                key={r.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '0.6rem 0.85rem',
                  background: '#0a0a0a', border: '1px solid #141414', borderRadius: 8,
                }}
              >
                <div style={{ fontSize: '1.1rem' }} aria-hidden>⭐</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                    {r.player_name}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                    {r.relationship}
                  </div>
                </div>
                {r.player_slug ? (
                  <Link
                    href={`/directory/players/${r.player_slug}`}
                    style={{ color: '#14B8A6', fontSize: '0.75rem', textDecoration: 'none' }}
                  >
                    view →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </PassportSection>

      {/* Section 4: Documents (1b-1 — live). Per linked child. Read-write from
          here (upload + archive) — mirrors dashboard/family. The Family Hub
          CTA at the top is a convenience shortcut for the heavier surface. */}
      <PassportSection
        emoji="📄"
        title="DOCUMENTS"
        description="Birth certificates, waivers, and medical forms for each linked child."
        testId="passport-section-documents"
      >
        <div style={{ marginBottom: '0.85rem' }}>
          <Link
            href="/dashboard/family"
            style={{
              color: '#14B8A6',
              fontSize: '0.78rem',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Open Family Hub for the full management view →
          </Link>
        </div>

        {parentRelationships.length === 0 ? (
          <div
            data-testid="passport-empty-documents"
            style={{
              padding: '1rem',
              background: '#0a0a0a',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 10,
              textAlign: 'center',
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.85rem',
            }}
          >
            Link a player first to start uploading documents.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {parentRelationships.map((r) => {
              const docs = documentsByPlayer[r.profile_id] || [];
              const consentRevoked = !!consentRevokedByPlayer[r.profile_id];
              return (
                <div
                  key={r.id}
                  data-testid="passport-documents-child"
                  style={{
                    padding: '0.85rem',
                    background: '#0a0a0a',
                    border: '1px solid #141414',
                    borderRadius: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: '0.6rem' }}>
                    <h3
                      style={{
                        fontFamily: "'Bebas Neue', Impact, sans-serif",
                        fontSize: '0.9rem',
                        color: '#fff',
                        letterSpacing: '0.05em',
                        margin: 0,
                      }}
                    >
                      {r.player_name.toUpperCase()}&rsquo;S DOCUMENTS
                    </h3>
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '0.7rem',
                      }}
                    >
                      {docs.filter((d: any) => d.status !== 'archived').length} active
                    </span>
                  </div>
                  <PlayerDocumentSection
                    playerId={r.profile_id}
                    documents={docs}
                    consentRevoked={consentRevoked}
                  />
                </div>
              );
            })}
          </div>
        )}
      </PassportSection>

      {/* Section 5: Achievements (1b-2 — live). Per linked child, render
          the achievements list + add form. */}
      {parentRelationships.length === 0 ? (
        <PassportSection
          emoji="🏅"
          title="ACHIEVEMENTS"
          description="Link a player to start tracking achievements."
          testId="passport-section-achievements"
        >
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
            Once you link a child, add achievements and watch the career timeline fill in.
          </p>
        </PassportSection>
      ) : (
        parentRelationships.map((r) => (
          <PassportSection
            key={r.id}
            emoji="🏅"
            title={`${r.player_name.toUpperCase()}'S ACHIEVEMENTS & TIMELINE`}
            description="Awards, milestones, and career events."
            testId="passport-section-achievements"
          >
            <PlayerTimelineSection
              playerId={r.profile_id}
              achievements={achievementsByPlayer[r.profile_id] || []}
              timelineEvents={timelineByPlayer[r.profile_id] || []}
            />
          </PassportSection>
        ))
      )}

      {/* Section 7: Media (1b-3 — live). Per linked child, render the
          gallery + upload. */}
      {parentRelationships.length === 0 ? (
        <PassportSection
          emoji="🖼️"
          title="MEDIA"
          description="Link a player to start uploading photos and videos."
          testId="passport-section-media"
        >
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
            Once you link a child, add photos and short videos. Set one as primary to use as the avatar.
          </p>
        </PassportSection>
      ) : (
        parentRelationships.map((r) => (
          <PassportSection
            key={`media-${r.id}`}
            emoji="🖼️"
            title={`${r.player_name.toUpperCase()}'S MEDIA`}
            description="Photos and short videos. Set one as primary to use as the avatar."
            testId="passport-section-media"
          >
            <PlayerMediaSection
              playerId={r.profile_id}
              media={mediaByPlayer[r.profile_id] || []}
            />
          </PassportSection>
        ))
      )}

      {/* Editable profile fields (bio, location) — kept from previous surface */}
      <ProfileEditForm
        initialBio={profile?.bio || ''}
        initialLocation={profile?.location || ''}
        initialUsername={profile?.username ?? null}
      />

      {/* Following list — what the user has chosen to follow */}
      <FollowingList userId={userId} />

      {/* Manage via Clerk */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
      }}>
        <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '1rem', color: '#888', letterSpacing: '0.06em', margin: '0 0 0.75rem' }}>
          MANAGE YOUR ACCOUNT
        </h3>
        <p style={{ color: '#666', fontSize: '0.875rem', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
          To update your name or email, click your avatar in the top-right corner to open the account menu, or use the button below.
        </p>
        <Link
          href="/user-profile"
          style={{
            display: 'inline-block',
            background: '#041E42',
            color: '#fff',
            padding: '0.75rem 1.5rem',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          Manage Account →
        </Link>
      </div>

    </div>
  );
}

function PassportSection({
  emoji,
  title,
  description,
  testId,
  placeholder,
  children,
}: {
  emoji: string;
  title: string;
  description: string;
  testId?: string;
  placeholder?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      data-testid={testId}
      data-placeholder={placeholder ? 'true' : undefined}
      style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: 12,
        padding: '1.5rem',
        opacity: placeholder ? 0.7 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: '0.25rem' }}>
        <span aria-hidden style={{ fontSize: '1.25rem' }}>{emoji}</span>
        <h2 style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.05rem', color: '#fff', letterSpacing: '0.05em',
          margin: 0,
        }}>
          {title}
        </h2>
        {placeholder ? (
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
            padding: '0.15rem 0.4rem', borderRadius: 999,
            background: 'rgba(20,184,166,0.12)', color: '#14B8A6',
            border: '1px solid rgba(20,184,166,0.3)',
          }}>
            coming soon
          </span>
        ) : null}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', margin: '0 0 1rem', lineHeight: 1.4 }}>
        {description}
      </p>
      {children}
    </section>
  );
}
