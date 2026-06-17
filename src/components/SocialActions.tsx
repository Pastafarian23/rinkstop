'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import ShareButton from './ShareButton';
import SaveFollowNudge, { isNudgeDismissed, type NudgeAction, type NudgeEntityType } from './SaveFollowNudge';
import type { SharePayload } from '@/lib/share';

type FolloweeType = 'player' | 'team' | 'rink' | 'league' | 'user';

interface SocialActionsProps {
  // Optional share payload. When present, a Share button is rendered.
  // The button uses the Web Share API on mobile and a desktop popover
  // with X / Facebook / LinkedIn / WhatsApp / Reddit / Email / Copy link.
  share?: SharePayload | null;
  // Where to put a "Message" button. Omit if not applicable (e.g. rinks
  // don't have a person to DM). For entities like rinks, you'd message
  // the owner user — we leave the owner-based wiring for a follow-up.
  messageRecipientId?: string;
  messageRecipientName?: string;
  // Follow target (most pages).
  followeeType?: FolloweeType;
  followeeId?: string;
  followeeName?: string;
  // Save (favorites) target — rinks/teams/players/leagues only.
  favoriteType?: 'rink' | 'team' | 'player' | 'league';
  favoriteId?: string;
  favoriteName?: string;
  // Initial counts from server (so we don't flash 0). Updated client-side.
  initialFollowersCount?: number;
  // Layout
  layout?: 'row' | 'column';
  size?: 'sm' | 'md';
  // Visual style for the share button. Defaults to 'dark' for entity
  // detail pages; pass 'brand' for the public profile page so the
  // share button matches the navy/gold RinkStop branding.
  shareVariant?: 'light' | 'dark' | 'brand';
}

// SocialActions — combines Follow + Save + Message into a single toolbar
// used on entity detail pages. Each button is independent; if its target
// isn't passed, the button isn't rendered.
//
// - Follow: /api/follow (POST/DELETE), with optimistic toggle + count.
// - Save: /api/favorites (POST/DELETE), same pattern as the legacy SaveButton.
// - Message: links to /dashboard/messages?with=...&context=...&contextType=...
//   (the inbox page will start a connection + thread if needed).
//
// Not signed in → all buttons become "Sign in" links pointing to the same page
// after login. We don't pop a modal: site convention is to send people to /login.
export default function SocialActions(props: SocialActionsProps) {
  const {
    messageRecipientId, messageRecipientName,
    followeeType, followeeId, followeeName,
    favoriteType, favoriteId, favoriteName,
    initialFollowersCount = 0,
    layout = 'row', size = 'md',
    share, shareVariant,
  } = props;
  const { isSignedIn, isLoaded } = useUser();

  // Follow state
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [followChecked, setFollowChecked] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  // Save state
  const [saved, setSaved] = useState(false);
  const [saveChecked, setSaveChecked] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  // Initial follow + save state checks
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setFollowChecked(true); setSaveChecked(true); return; }
    let cancelled = false;
    // Follow check
    if (followeeType && followeeId) {
      fetch(`/api/follow?type=${followeeType}&id=${encodeURIComponent(followeeId)}`)
        .then(r => r.json())
        .then(d => {
          if (cancelled) return;
          if (typeof d.isFollowing === 'boolean') setFollowing(d.isFollowing);
          if (typeof d.followersCount === 'number') setFollowersCount(d.followersCount);
        })
        .catch(() => {/* silent */})
        .finally(() => { if (!cancelled) setFollowChecked(true); });
    } else {
      setFollowChecked(true);
    }
    // Save check
    if (favoriteType && favoriteId) {
      fetch(`/api/favorites?type=${favoriteType}&id=${encodeURIComponent(favoriteId)}`)
        .then(r => r.json())
        .then(d => {
          if (cancelled) return;
          const list = d.favorites || [];
          setSaved(list.some((f: { favorite_id: string }) => f.favorite_id === favoriteId));
        })
        .catch(() => {/* silent */})
        .finally(() => { if (!cancelled) setSaveChecked(true); });
    } else {
      setSaveChecked(true);
    }
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, followeeType, followeeId, favoriteType, favoriteId]);

  const sizeStyle: React.CSSProperties = size === 'sm'
    ? { padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }
    : { padding: '0.5rem 1rem', fontSize: '0.875rem', gap: '0.5rem' };
  const iconSize = size === 'sm' ? 13 : 15;

  const containerStyle: React.CSSProperties = layout === 'column'
    ? { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }
    : { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' };
  const btnFlex: React.CSSProperties = layout === 'column' ? { justifyContent: 'center' } : {};

  // Unauthenticated: render buttons that open the SaveFollowNudge modal
  // instead of redirecting straight to /login. The old behavior lost ~95%
  // of intent at the redirect. Now we acknowledge the click, explain the
  // value, and offer a one-click path to free signup.
  if (isLoaded && !isSignedIn) {
    return <UnauthSocialActions
      containerStyle={containerStyle}
      sizeStyle={sizeStyle}
      iconSize={iconSize}
      btnFlex={btnFlex}
      followersCount={followersCount}
      followeeType={followeeType as Exclude<typeof followeeType, 'user' | undefined>}
      followeeId={followeeId}
      followeeName={followeeName}
      favoriteType={favoriteType}
      favoriteId={favoriteId}
      favoriteName={favoriteName}
      messageRecipientId={messageRecipientId}
      messageRecipientName={messageRecipientName}
    />;
  }

  async function toggleFollow() {
    if (followBusy || !followeeType || !followeeId) return;
    setFollowBusy(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setFollowersCount((c) => c + (wasFollowing ? -1 : 1));
    try {
      const res = wasFollowing
        ? await fetch(`/api/follow?type=${followeeType}&id=${encodeURIComponent(followeeId)}`, { method: 'DELETE' })
        : await fetch('/api/follow', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ followee_type: followeeType, followee_id: followeeId }),
          });
      if (!res.ok) {
        setFollowing(wasFollowing);
        setFollowersCount((c) => c + (wasFollowing ? 1 : -1));
        const d = await res.json().catch(() => ({}));
        alert(d.message || d.error || 'Could not update. Please try again.');
        return;
      }
      // Use server count
      const d = await res.json().catch(() => ({}));
      if (typeof d.followersCount === 'number') setFollowersCount(d.followersCount);
    } catch {
      setFollowing(wasFollowing);
      setFollowersCount((c) => c + (wasFollowing ? 1 : -1));
      alert('Network error. Please try again.');
    } finally {
      setFollowBusy(false);
    }
  }

  async function toggleSave() {
    if (saveBusy || !favoriteType || !favoriteId) return;
    setSaveBusy(true);
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      const res = wasSaved
        ? await fetch(`/api/favorites?favorite_type=${favoriteType}&favorite_id=${encodeURIComponent(favoriteId)}`, { method: 'DELETE' })
        : await fetch('/api/favorites', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ favorite_type: favoriteType, favorite_id: favoriteId }),
          });
      if (!res.ok) {
        setSaved(wasSaved);
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Could not update. Please try again.');
      }
    } catch {
      setSaved(wasSaved);
      alert('Network error. Please try again.');
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div style={containerStyle}>
      {followeeType && followeeId && (
        <button
          type="button" onClick={toggleFollow}
          disabled={!followChecked || followBusy}
          aria-pressed={following}
          title={following ? `Unfollow ${followeeName || ''}` : `Follow ${followeeName || ''}`}
          style={stateBtnStyle(following, followChecked, sizeStyle, btnFlex, 'follow')}
        >
          {followChecked ? (
            <>
              <span style={{ fontSize: iconSize }}>{following ? '✓' : '+'}</span>
              <span>{following ? 'Following' : 'Follow'}</span>
              {followersCount > 0 && <span style={countStyle}>· {followersCount}</span>}
            </>
          ) : (
            <span style={{ opacity: 0.5 }}>…</span>
          )}
        </button>
      )}

      {favoriteType && favoriteId && (
        <button
          type="button" onClick={toggleSave}
          disabled={!saveChecked || saveBusy}
          aria-pressed={saved}
          title={saved ? `Remove ${favoriteName || ''} from saved items` : `Save ${favoriteName || ''}`}
          style={stateBtnStyle(saved, saveChecked, sizeStyle, btnFlex, 'save')}
        >
          {saveChecked ? (
            <>
              <span style={{ fontSize: iconSize }}>{saved ? '♥' : '♡'}</span>
              <span>{saved ? 'Saved' : 'Save'}</span>
            </>
          ) : (
            <span style={{ opacity: 0.5 }}>…</span>
          )}
        </button>
      )}

      {messageRecipientId && (
        <Link
          href={`/dashboard/messages?with=${encodeURIComponent(messageRecipientId)}${followeeType ? `&contextType=${followeeType}` : ''}${followeeId ? `&contextId=${encodeURIComponent(followeeId)}` : ''}`}
          style={baseBtnStyle('primary', sizeStyle, iconSize, btnFlex)}
        >
          <span style={{ fontSize: iconSize }}>✉</span>
          <span>Message{messageRecipientName ? ` ${messageRecipientName.split(' ')[0]}` : ''}</span>
        </Link>
      )}

      {share && (
        <div style={btnFlex}>
          <ShareButton payload={share} variant={shareVariant ?? 'dark'} />
        </div>
      )}
    </div>
  );
}

const countStyle: React.CSSProperties = {
  fontSize: '0.75em', opacity: 0.7, marginLeft: 2,
};

function baseBtnStyle(variant: 'primary' | 'outline', sizeStyle: React.CSSProperties, _iconSize: number, extra: React.CSSProperties): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center',
    ...sizeStyle, ...extra,
    borderRadius: 6, fontWeight: 600,
    textDecoration: 'none', cursor: 'pointer', transition: 'all 0.15s',
    border: '1px solid', lineHeight: 1.2,
  };
  if (variant === 'primary') {
    return { ...base, background: '#14B8A6', borderColor: '#14B8A6', color: '#0a0a0a' };
  }
  return { ...base, background: 'transparent', borderColor: 'rgba(255,255,255,0.15)', color: '#e2e8f0' };
}

function stateBtnStyle(active: boolean, checked: boolean, sizeStyle: React.CSSProperties, extra: React.CSSProperties, kind: 'follow' | 'save'): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center',
    ...sizeStyle, ...extra,
    borderRadius: 6, fontWeight: 600,
    border: '1px solid', lineHeight: 1.2,
    cursor: !checked ? 'wait' : 'pointer', transition: 'all 0.15s',
  };
  if (!checked) {
    return { ...base, background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' };
  }
  if (kind === 'save') {
    return active
      ? { ...base, background: 'rgba(200,16,46,0.18)', borderColor: '#C8102E', color: '#C8102E' }
      : { ...base, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: '#e2e8f0' };
  }
  // follow
  return active
    ? { ...base, background: 'rgba(20,184,166,0.18)', borderColor: '#14B8A6', color: '#14B8A6' }
    : { ...base, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: '#e2e8f0' };
}

/**
 * UnauthSocialActions — the not-signed-in branch of SocialActions.
 *
 * Renders the same Follow / Save / Message buttons, but instead of linking
 * to /login (which silently drops ~95% of intent), each button opens a
 * SaveFollowNudge modal that pitches the value of a free account and offers
 * a one-click path to /sign-up.
 *
 * Dismissal is tracked per (action, entityType) in localStorage for 7 days
 * so a user who clicks "Maybe later" doesn't see the modal again on every
 * page for the rest of their session.
 */
function UnauthSocialActions(props: {
  containerStyle: React.CSSProperties;
  sizeStyle: React.CSSProperties;
  iconSize: number;
  btnFlex: React.CSSProperties;
  followersCount: number;
  followeeType?: 'player' | 'team' | 'rink' | 'league';
  followeeId?: string;
  followeeName?: string;
  favoriteType?: 'rink' | 'team' | 'player' | 'league';
  favoriteId?: string;
  favoriteName?: string;
  messageRecipientId?: string;
  messageRecipientName?: string;
}) {
  const {
    containerStyle, sizeStyle, iconSize, btnFlex,
    followersCount,
    followeeType, followeeId, followeeName,
    favoriteType, favoriteId, favoriteName,
    messageRecipientId, messageRecipientName,
  } = props;

  const [nudge, setNudge] = useState<{ action: NudgeAction } | null>(null);

  // currentPath is captured at click-time so the modal CTA can redirect
  // back to this exact page after signup.
  const [currentPath, setCurrentPath] = useState('/');
  useEffect(() => { setCurrentPath(window.location.pathname); }, []);

  function openNudge(action: NudgeAction) {
    // Map the action to the right entity type for the dismiss key. For
    // 'message' the entity is the recipient (a person), so use the
    // followeeType if present, otherwise default to 'user'.
    const entityType: NudgeEntityType = (() => {
      if (action === 'message') return (followeeType as NudgeEntityType) || 'user';
      if (action === 'save') return (favoriteType as NudgeEntityType) || 'rink';
      return (followeeType as NudgeEntityType) || 'rink';
    })();

    if (isNudgeDismissed(action, entityType)) {
      // Already dismissed in the last 7 days — skip the modal and go
      // straight to /login. Better than nagging, still keeps the action
      // available.
      const path = encodeURIComponent(currentPath);
      window.location.href = `/login?redirect_url=${path}`;
      return;
    }
    setNudge({ action });
  }

  // Entity name + id passed to the modal depend on which action fired.
  const entityType: NudgeEntityType = (() => {
    if (nudge?.action === 'message') return (followeeType as NudgeEntityType) || 'user';
    if (nudge?.action === 'save') return (favoriteType as NudgeEntityType) || 'rink';
    return (followeeType as NudgeEntityType) || 'rink';
  })();
  const entityId = (() => {
    if (nudge?.action === 'message') return messageRecipientId || followeeId || '';
    if (nudge?.action === 'save') return favoriteId || '';
    return followeeId || '';
  })();
  // Fallback to a type-aware string ("this rink" / "this team") instead of
  // the generic "this listing" so the modal copy still reads naturally if
  // a name is missing. In practice these names are always set on detail
  // pages, but the fallback matters for error states.
  const entityTypeLabel = entityType === 'player' ? 'this player'
    : entityType === 'team' ? 'this team'
    : entityType === 'league' ? 'this league'
    : entityType === 'business' ? 'this business'
    : 'this rink';
  const entityName = (() => {
    if (nudge?.action === 'message') return followeeName || favoriteName || entityTypeLabel;
    if (nudge?.action === 'save') return favoriteName || followeeName || entityTypeLabel;
    return followeeName || favoriteName || entityTypeLabel;
  })();

  return (
    <>
      <div style={containerStyle}>
        {followeeType && followeeId && (
          <button
            type="button"
            onClick={() => openNudge('follow')}
            style={baseBtnStyle('outline', sizeStyle, iconSize, btnFlex)}
          >
            <span style={{ fontSize: iconSize }}>+</span><span>Follow</span>
            {followersCount > 0 && <span style={countStyle}>· {followersCount}</span>}
          </button>
        )}
        {favoriteType && favoriteId && (
          <button
            type="button"
            onClick={() => openNudge('save')}
            style={baseBtnStyle('outline', sizeStyle, iconSize, btnFlex)}
          >
            <span style={{ fontSize: iconSize }}>♡</span><span>Save</span>
          </button>
        )}
        {messageRecipientId && (
          <button
            type="button"
            onClick={() => openNudge('message')}
            style={baseBtnStyle('primary', sizeStyle, iconSize, btnFlex)}
          >
            <span style={{ fontSize: iconSize }}>✉</span><span>Message</span>
          </button>
        )}
      </div>

      {nudge && (
        <SaveFollowNudge
          action={nudge.action}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          messageRecipientName={messageRecipientName}
          currentPath={currentPath}
          open={true}
          onClose={() => setNudge(null)}
        />
      )}
    </>
  );
}
